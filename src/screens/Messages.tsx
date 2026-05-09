import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { Conversation } from '../types';
import { formatRelativeTime } from '../utils/dateUtils';
import { RefreshCw, User as UserIcon } from 'lucide-react';

export default function Messages() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket, onlineUsers } = useSocket();

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/messages/conversations');
      setConversations(res.data.conversations || []);
    } catch (err) {
      console.error('Error fetching conversations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    
    if (socket) {
      const handleMessageNotification = () => {
        fetchConversations();
      };
      const handleConversationDeleted = () => {
        fetchConversations();
      };
      socket.on('message_notification', handleMessageNotification);
      socket.on('conversation_deleted', handleConversationDeleted);
      return () => {
        socket.off('message_notification', handleMessageNotification);
        socket.off('conversation_deleted', handleConversationDeleted);
      };
    }
  }, [socket]);

  return (
    <div className="flex flex-col h-full bg-gray-50 text-right" dir="rtl">
      <div className="flex justify-between items-center p-4 bg-white shadow-sm mb-2 shrink-0">
        <h1 className="text-xl font-bold text-gray-800">الرسائل</h1>
        <button onClick={fetchConversations} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors active:bg-gray-200">
          <RefreshCw size={20} className={loading ? 'animate-spin text-primary' : ''} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto w-full pb-6">
        {loading && conversations.length === 0 ? (
          <div className="flex justify-center p-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent flex rounded-full animate-spin"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-400 mt-10">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
               <UserIcon size={40} className="text-gray-300" />
            </div>
            <p className="font-semibold text-gray-500 text-lg">لا توجد محادثات بعد</p>
            <p className="text-sm mt-1 text-center">بمجرد قبول طلبات المواعيد، ستظهر المحادثات هنا للتمكن من التواصل المباشر.</p>
          </div>
        ) : (
          conversations.map(conv => (
            <Link key={conv.id} to={`/chat/${conv.id}`} className="block bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors active:bg-gray-100">
              <div className="flex items-center p-4">
                {/* Avatar */}
                <div className="relative ml-4 shrink-0">
                  {conv.other_user_pic ? (
                    <img src={conv.other_user_pic} alt="" className="w-14 h-14 rounded-full object-cover border border-gray-200" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-green-50 text-primary flex items-center justify-center font-bold text-xl border border-green-100 shadow-inner">
                      {conv.other_user_name?.charAt(0) || <UserIcon />}
                    </div>
                  )}
                  {onlineUsers.includes(conv.other_user_id || 0) && (
                    <div className="absolute bottom-0 left-0 w-3.5 h-3.5 bg-[#25D366] border-2 border-white rounded-full"></div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-bold text-[16px] text-gray-800 truncate">{conv.other_user_name}</h3>
                    <span className="text-[11px] text-gray-400 mr-2 shrink-0 font-medium">
                      {conv.last_message ? formatRelativeTime(conv.last_message.created_at) : formatRelativeTime(conv.created_at)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center w-full">
                    <p className={`text-[14px] truncate w-[85%] ${conv.unread_count ? 'font-bold text-gray-800' : 'text-gray-500'}`}>
                      {conv.last_message ? conv.last_message.content : 'بدء محادثة جديدة'}
                    </p>
                    {!!conv.unread_count && (
                      <span className="bg-primary text-white text-[10px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center shadow-sm">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
