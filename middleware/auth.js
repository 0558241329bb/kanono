import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ error: 'Access denied. No user info found in token.' });
    }
    if (!roles.includes(req.user.role)) {
      console.warn(`Role mismatch: User ${req.user.email} has role ${req.user.role}, but required one of: ${roles.join(', ')}`);
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.', 
        details: `Your role is '${req.user.role}', but this action requires one of: ${roles.join(', ')}`
      });
    }
    next();
  };
};
