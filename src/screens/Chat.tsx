import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Message } from '../types';
import { ArrowRight, Send, User as UserIcon, Trash2 } from 'lucide-react';
import MessageBubble from '../components/MessageBubble';

export default function Chat() {
  const { id } = useParams();
  const conversationId = Number(id);
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { socket, onlineUsers } = useSocket();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  const [deleting, setDeleting] = useState(false);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchChat = async () => {
      try {
        const res = await api.get(`/messages/conversations/${conversationId}?limit=50`);
        if (res.data.success) {
          setOtherUser(res.data.conversation);
          setMessages(res.data.messages);
        }
      } catch (err) {
        console.error('Failed to load chat', err);
        navigate('/messages');
      } finally {
        setLoading(false);
      }
    };
    
    fetchChat();

    if (socket) {
      socket.emit('join_conversation', conversationId);
      socket.emit('mark_read', { conversation_id: conversationId });

      socket.on('new_message', (msg: Message) => {
        if (msg.conversation_id === conversationId) {
          setMessages(prev => [msg, ...prev]);
          if (msg.sender_id !== currentUser?.id) {
            socket.emit('mark_read', { conversation_id: conversationId });
          }
        }
      });

      socket.on('user_typing', ({ conversation_id }) => {
        if (conversation_id === conversationId) setIsTyping(true);
      });

      socket.on('user_stopped_typing', ({ conversation_id }) => {
        if (conversation_id === conversationId) setIsTyping(false);
      });

      socket.on('messages_read', ({ conversation_id }) => {
        if (conversation_id === conversationId) {
          setMessages(prev => prev.map(m => (!m.is_read && m.sender_id === currentUser?.id) ? { ...m, is_read: 1 } : m));
        }
      });

      socket.on('conversation_deleted', ({ conversation_id }: { conversation_id: number }) => {
        if (conversation_id === conversationId) {
          navigate('/messages');
        }
      });
    }

    return () => {
      if (socket) {
        socket.emit('leave_conversation', conversationId);
        socket.off('new_message');
        socket.off('user_typing');
        socket.off('user_stopped_typing');
        socket.off('messages_read');
        socket.off('conversation_deleted');
      }
    };
  }, [conversationId, socket, currentUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    
    if (socket && e.target.value.trim().length > 0) {
      socket.emit('typing_start', { conversation_id: conversationId });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_stop', { conversation_id: conversationId });
      }, 2000);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !socket || !currentUser) return;
    
    setSending(true);
    const content = inputText.trim();
    setInputText('');
    socket.emit('typing_stop', { conversation_id: conversationId });

    // Assuming optimistic dispatch isn't necessary because socket responds quickly
    socket.emit('send_message', { conversation_id: conversationId, content });
    
    setTimeout(() => setSending(false), 300);
  };

  const handleDeleteConversation = async () => {
    if (!window.confirm('حذف هذه المحادثة نهائياً؟ لا يمكن التراجع.')) return;
    setDeleting(true);
    try {
      await api.delete(`/messages/conversations/${conversationId}`);
      navigate('/messages');
    } catch (err) {
      console.error(err);
      alert('تعذر حذف المحادثة');
    } finally {
      setDeleting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isOnline = otherUser?.other_user_id ? onlineUsers.includes(otherUser.other_user_id) : false;

  return (
    <div className="flex flex-col h-full bg-[#E5DDD5] relative" dir="rtl">
      {/* Header */}
      <div className="h-[60px] bg-primary text-white flex items-center px-4 shadow-md z-10 shrink-0">
        <button onClick={() => navigate('/messages')} className="p-2 -mr-2 ml-2 hover:bg-white/10 rounded-full transition-colors active:bg-white/20">
          <ArrowRight size={24} />
        </button>
        
        <div className="relative shrink-0">
          {otherUser?.other_user_pic ? (
            <img src={otherUser.other_user_pic} alt="" className="w-10 h-10 rounded-full object-cover border border-primary-light" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/20 flex flex-col items-center justify-center font-bold text-white shadow-inner">
              {otherUser?.other_user_name?.charAt(0) || <UserIcon size={20} />}
            </div>
          )}
        </div>
        
        <div className="mr-3 flex flex-col justify-center flex-1 min-w-0">
          <h2 className="font-bold text-[16px] truncate leading-tight">
            {otherUser?.other_user_name || '...'}
          </h2>
          <span className="text-xs text-white/80 truncate">
             {isTyping ? 'جاري الكتابة...' : (isOnline ? 'متصل الآن' : '')}
          </span>
        </div>
        <button
          type="button"
          onClick={handleDeleteConversation}
          disabled={deleting || loading}
          className="p-2 mr-1 hover:bg-white/10 rounded-full transition-colors disabled:opacity-40"
          title="حذف المحادثة"
          aria-label="حذف المحادثة"
        >
          <Trash2 size={22} />
        </button>
      </div>

      {/* Chat Area (flex-col-reverse so mapping newest first places it at bottom) */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col-reverse">
        {loading ? (
          <div className="flex justify-center my-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isOwn = msg.sender_id === currentUser?.id;

              return (
                <MessageBubble key={msg.id} message={msg} isOwn={isOwn} />
              );
            })}
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 bg-gray-50 flex items-end gap-2 border-t border-gray-200 shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="flex-1 bg-white rounded-2xl min-h-[44px] max-h-[120px] shadow-sm flex items-center px-4 border border-gray-100 transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
          <textarea 
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent focus:outline-none resize-none py-3 text-gray-800 leading-tight max-h-[100px]"
            placeholder="اكتب رسالة..."
            rows={1}
            dir="auto"
          />
        </div>
        <button 
          onClick={handleSend}
          disabled={!inputText.trim() || sending}
          className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shrink-0 shadow-md transition-transform active:scale-95 disabled:bg-gray-400 disabled:shadow-none"
        >
          <Send size={20} className="mr-1 transform rotate-180" />
        </button>
      </div>
    </div>
  );
}
