export interface User {
  id: number;
  username: string;
  email: string;
  phone?: string;
  role: 'client' | 'lawyer' | 'admin';
  approved: number;
  profile_picture?: string;
  bio?: string;
  city?: string;
  created_at: string;
  lawyer_profile?: LawyerProfile;
}

export interface LawyerProfile {
  specialty?: string;
  bar_number?: string;
  years_experience?: number;
  certificate_path?: string;
  rating: number;
}

export interface Appointment {
  id: number;
  client_id: number;
  lawyer_id: number;
  type: 'consultation' | 'appointment';
  requested_date: string;
  confirmed_date?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';
  notes?: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  is_read: number;
  created_at: string;
  username?: string;
  profile_picture?: string;
}

export interface Conversation {
  id: number;
  client_id: number;
  lawyer_id: number;
  appointment_id?: number;
  created_at: string;
  other_user_name?: string;
  other_user_pic?: string;
  other_user_role?: string;
  other_user_id?: number;
  last_message?: { content: string; created_at: string };
  unread_count?: number;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  body: string;
  is_read: number;
  ref_id?: number;
  created_at: string;
}

export interface Complaint {
  id: number;
  user_id: number;
  subject: string;
  description: string;
  status: 'open' | 'in_review' | 'resolved';
  created_at: string;
  username?: string;
  email?: string;
  role?: string;
}
