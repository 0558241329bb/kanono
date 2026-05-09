import React from 'react';
import { Message } from '../types';
import { formatMessageTime } from '../utils/dateUtils';
import { Check, CheckCheck } from 'lucide-react';

interface Props {
  key?: string | number;
  message: Message;
  isOwn: boolean;
}

export default function MessageBubble({ message, isOwn }: Props) {
  return (
    <div className={`flex w-full ${isOwn ? 'justify-start' : 'justify-end'} mb-3`}>
      <div 
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm relative animate-[fadeIn_0.2s_ease-out]
          ${isOwn 
            ? 'bg-primary text-white rounded-tl-sm' 
            : 'bg-white text-gray-800 rounded-tr-sm border border-gray-100'
          }`}
      >
        <p className="text-[15px] leading-relaxed break-words">{message.content}</p>
        
        <div className={`flex items-center gap-1 mt-1 justify-end ${isOwn ? 'text-green-200' : 'text-gray-400'}`}>
          <span className="text-[10px] tabular-nums" dir="ltr">
            {formatMessageTime(message.created_at)}
          </span>
          {isOwn && (
            <span>
              {message.is_read ? (
                <CheckCheck size={14} className="text-[#87CEEB]" />
              ) : (
                <Check size={14} />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
