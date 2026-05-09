import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import { getFirebaseAdmin } from '../config/firebaseAdmin.js';

const router = express.Router();

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

/** بريد مُرفوع تلقائياً لدور admin عند التسجيل/الدخول. يمكن إضافة المزيد عبر ADMIN_EMAILS في البيئة (مفصولة بفواصل). */
const BUILTIN_PROMOTED_ADMIN_EMAILS = [
  'admin123@admin.dz',
  'admin123@admin.com',
  'attiabelkheiri84@gmail.com',
];

function isPromotedAdminEmail(email) {
  const n = String(email).toLowerCase().trim();
  if (BUILTIN_PROMOTED_ADMIN_EMAILS.includes(n)) return true;
  const extra = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return extra.includes(n);
}

/** Full user object for client (matches login + profile fields). */
async function getUserPayloadForClient(userId) {
  const [users] = await pool.query(
    'SELECT id, username, email, phone, role, approved, profile_picture, bio, city, created_at FROM users WHERE id = ?',
    [userId]
  );
  if (users.length === 0) return null;
  const row = users[0];
  const payload = {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    approved: row.approved,
    profile_picture: row.profile_picture,
    city: row.city,
    phone: row.phone,
    bio: row.bio,
    created_at: row.created_at,
  };
  if (row.role === 'lawyer') {
    const [profiles] = await pool.query(
      'SELECT specialty, bar_number, years_experience, certificate_path, rating FROM lawyer_profiles WHERE user_id = ?',
      [userId]
    );
    if (profiles.length > 0) {
      payload.lawyer_profile = profiles[0];
    }
  }
  return payload;
}

router.post('/register', async (req, res) => {
  const { username, email, password, phone, role, city, specialty, bar_number, years_experience } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: 'Username, email, and password are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const assignedRole = isPromotedAdminEmail(normalizedEmail)
      ? 'admin'
      : (['client', 'lawyer', 'admin'].includes(role) ? role : 'client');
    const approved = assignedRole === 'admin' ? 1 : (assignedRole === 'lawyer' ? 0 : 1);

    // Start a transaction just in case
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [result] = await connection.query(
        'INSERT INTO users (username, email, password, phone, role, approved, city) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [username, normalizedEmail, hashedPassword, phone || null, assignedRole, approved, city || null]
      );
      const userId = result.insertId;

      if (assignedRole === 'lawyer') {
        await connection.query(
          'INSERT INTO lawyer_profiles (user_id, specialty, bar_number, years_experience) VALUES (?, ?, ?, ?)',
          [userId, specialty || null, bar_number || null, years_experience || null]
        );
      }

      await connection.commit();
      connection.release();

      res.status(201).json({ success: true, message: 'User registered successfully', userId });
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' || error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }
    console.error('register error:', error?.code, error?.message, error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV !== 'production' ? error.message : 'Internal server error',
      ...(process.env.RENDER === 'true' && error?.code
        ? { code: String(error.code) }
        : {}),
    });
  }
});

router.post('/firebase-login', async (req, res) => {
    const { idToken, role } = req.body;
    if (!idToken) return res.status(400).json({ success: false, message: 'idToken is required' });
  
    try {
      const admin = await getFirebaseAdmin();
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { uid, email, name, picture } = decodedToken;
      const normalizedEmail = email.toLowerCase().trim();
  
      let [rows] = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [normalizedEmail]);
      let user;
  
      if (rows.length === 0) {
        // Create user if not exists
        const assignedRole = isPromotedAdminEmail(normalizedEmail)
      ? 'admin'
      : (['client', 'lawyer', 'admin'].includes(role) ? role : 'client');
        const approved = assignedRole === 'admin' ? 1 : (assignedRole === 'lawyer' ? 0 : 1);
        
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        try {
          const [result] = await connection.query(
            'INSERT INTO users (username, email, password, role, approved, profile_picture) VALUES (?, ?, ?, ?, ?, ?)',
            [name || 'مستخدم', normalizedEmail, uid, assignedRole, approved, picture || null]
          );
          const userId = result.insertId;
  
          if (assignedRole === 'lawyer') {
            await connection.query('INSERT INTO lawyer_profiles (user_id) VALUES (?)', [userId]);
          }
          await connection.commit();
          connection.release();
  
          [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
          user = rows[0];
        } catch (err) {
          await connection.rollback();
          connection.release();
          throw err;
        }
      } else {
        user = rows[0];
        if (isPromotedAdminEmail(normalizedEmail)) {
          if (user.role !== 'admin' || user.approved !== 1) {
            console.log(`Upgrading ${normalizedEmail} to admin`);
            await pool.query("UPDATE users SET role = 'admin', approved = 1 WHERE LOWER(email) = LOWER(?)", [
              normalizedEmail,
            ]);
            user.role = 'admin';
            user.approved = 1;
          }
        }
      }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User could not be created or found' });
    }

    if (user.role === 'lawyer' && user.approved === 0) {
      return res.status(403).json({ success: false, message: 'Account pending admin approval' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, approved: user.approved, username: user.username },
      process.env.JWT_SECRET || 'your_super_secret_key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile_picture: user.profile_picture,
        city: user.city
      }
    });

  } catch (error) {
    console.error('Firebase Auth Error:', error);
    res.status(401).json({ success: false, message: 'Invalid or expired Firebase token' });
  }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
  
    const normalizedEmail = email.toLowerCase().trim();

    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [normalizedEmail]);
      if (rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }
  
      let user = rows[0];
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }
  
      // Force admin role for the specific email
      if (isPromotedAdminEmail(normalizedEmail)) {
        if (user.role !== 'admin' || user.approved !== 1) {
          console.log(`Upgrading ${normalizedEmail} to admin`);
          await pool.query("UPDATE users SET role = 'admin', approved = 1 WHERE LOWER(email) = LOWER(?)", [
            normalizedEmail,
          ]);
          user.role = 'admin';
          user.approved = 1;
        }
      }

    if (user.role === 'lawyer' && user.approved === 0) {
      return res.status(403).json({ success: false, message: 'Account pending admin approval' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, approved: user.approved, username: user.username },
      process.env.JWT_SECRET || 'your_super_secret_key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile_picture: user.profile_picture,
        city: user.city
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  try {
    const [users] = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Insert or update OTP
    await pool.query(
      'INSERT INTO password_resets (email, otp_code, expires_at) VALUES (?, ?, ?)',
      [email, otp, expiresAt]
    );

    res.json({ success: true, message: 'OTP sent successfully', otp }); // returning OTP for testing as requested
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/profile', verifyToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, email, phone, role, approved, profile_picture, bio, city, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userData = users[0];

    if (userData.role === 'lawyer') {
      const [profiles] = await pool.query(
        'SELECT specialty, bar_number, years_experience, certificate_path, rating FROM lawyer_profiles WHERE user_id = ?',
        [req.user.id]
      );
      if (profiles.length > 0) {
        userData.lawyer_profile = profiles[0];
      }
    }

    res.json(userData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, email, role, approved FROM users WHERE id = ?',
      [req.user.id]
    );
    if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: users[0], tokenPayload: req.user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/profile', verifyToken, upload.single('profile_picture'), async (req, res) => {
  const { username, phone, city, bio, specialty, years_experience } = req.body;
  const userId = req.user.id;
  
  // If a file was uploaded, construct the path to save in DB, else use existing value
  let profilePicturePath = req.body.profile_picture;
  if (req.file) {
    profilePicturePath = `/uploads/${req.file.filename}`;
  }

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      await connection.query(
        'UPDATE users SET username = COALESCE(?, username), phone = COALESCE(?, phone), city = COALESCE(?, city), bio = COALESCE(?, bio), profile_picture = COALESCE(?, profile_picture) WHERE id = ?',
        [username, phone, city, bio, profilePicturePath, userId]
      );

      if (req.user.role === 'lawyer') {
        const yearsVal =
          years_experience === undefined || years_experience === '' || years_experience === null
            ? null
            : parseInt(String(years_experience), 10);
        await connection.query(
          'UPDATE lawyer_profiles SET specialty = COALESCE(?, specialty), years_experience = COALESCE(?, years_experience) WHERE user_id = ?',
          [specialty || null, Number.isNaN(yearsVal) ? null : yearsVal, userId]
        );
      }

      await connection.commit();
      connection.release();

      const userPayload = await getUserPayloadForClient(userId);
      res.json({
        success: true,
        message: 'Profile updated successfully',
        profile_picture: profilePicturePath,
        user: userPayload,
      });
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/users', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, email, role, approved, city, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ success: true, users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
