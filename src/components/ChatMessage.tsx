import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./ui/skeleton";

export interface WhatsAppMessage {
  datetime: Date;
  sender: string;
  message: string;
  chatFileName?: string; // 新增：聊天檔案名稱
  mediaFiles?: {
    filename: string;
    type: 'image' | 'sticker' | 'document' | 'audio' | 'video';
    data: string; // base64 encoded data URL
  }[];
}

interface ChatMessageProps {
  message: WhatsAppMessage;
  isOwnMessage: boolean;
  senderColorIndex: number;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  isOwnMessage, 
  senderColorIndex 
}) => {
  // Generate vibrant colors for different senders
  const senderColors = [
    'from-blue-500 to-blue-600',
    'from-green-500 to-green-600', 
    'from-purple-500 to-purple-600',
    'from-pink-500 to-pink-600',
    'from-indigo-500 to-indigo-600',
    'from-red-500 to-red-600',
    'from-yellow-500 to-yellow-600',
    'from-teal-500 to-teal-600'
  ];
  
  const bubbleColor = isOwnMessage ? 'from-emerald-500 to-emerald-600' : senderColors[senderColorIndex];
  
  return (
    <div
      className={cn(
        "flex items-end gap-3 group mb-4",
        isOwnMessage ? "justify-end" : "justify-start"
      )}
    >
      {/* Avatar */}
      {!isOwnMessage && (
        <div className="flex-shrink-0 mb-2">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-r border-2 border-white",
            senderColors[senderColorIndex]
          )}>
            <span className="text-white font-bold text-sm">
              {message.sender.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}
      {/* Message Bubble */}
      <div className={cn(
        "max-w-[75%] transition-all duration-200 group-hover:scale-[1.02]",
        isOwnMessage ? "ml-auto items-end" : "items-start"
      )}>
        {/* Sender name for incoming messages */}
        {!isOwnMessage && (
          <div className="mb-2 ml-4">
            <span className={cn(
              "text-sm font-bold bg-gradient-to-r bg-clip-text text-transparent",
              senderColors[senderColorIndex]
            )}>
              {message.sender}
            </span>
          </div>
        )}
        {/* Message content */}
        <div className={cn(
          "relative px-6 py-4 rounded-2xl shadow-xl bg-gradient-to-r text-white backdrop-blur-sm border border-white/20",
          bubbleColor,
          isOwnMessage 
            ? "rounded-br-md" 
            : "rounded-bl-md"
        )}>
          {/* Media content */}
          {message.mediaFiles && message.mediaFiles.length > 0 && (
            <div className="mb-3 space-y-2">
              {message.mediaFiles.slice(0, 3).map((media, index) => {
                const [loading, setLoading] = useState(true);
                return (
                  <div key={index} className="rounded-lg overflow-hidden bg-white/10 backdrop-blur-sm">
                    {media.type === 'image' && (
                      <>
                        {loading && <Skeleton className="w-full h-[180px] rounded-lg mb-2" />}
                        <img 
                          src={media.data} 
                          alt={media.filename}
                          className="max-w-full h-auto rounded-lg shadow-lg hover:shadow-xl transition-shadow"
                          style={{ maxHeight: '300px', objectFit: 'contain', display: loading ? 'none' : 'block' }}
                          onLoad={() => setLoading(false)}
                        />
                      </>
                    )}
                    {media.type === 'sticker' && (
                      <div className="bg-transparent p-2">
                        {loading && <Skeleton className="max-w-[120px] max-h-[120px] rounded-lg mb-2" />}
                        <img 
                          src={media.data} 
                          alt={media.filename}
                          className="max-w-[120px] max-h-[120px] object-contain"
                          style={{ display: loading ? 'none' : 'block' }}
                          onLoad={() => setLoading(false)}
                        />
                      </div>
                    )}
                    {media.type === 'document' && (
                      <div className="p-3 bg-white/20 rounded-lg flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/30 rounded-lg flex items-center justify-center">
                          📄
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{media.filename}</p>
                          <p className="text-xs text-white/70">Document</p>
                        </div>
                      </div>
                    )}
                    {(media.type === 'audio' || media.type === 'video') && (
                      <div className="p-3 bg-white/20 rounded-lg flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/30 rounded-lg flex items-center justify-center">
                          {media.type === 'audio' ? '🎵' : '🎬'}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{media.filename}</p>
                          <p className="text-xs text-white/70">
                            {media.type === 'audio' ? 'Audio' : 'Video'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {message.mediaFiles.length > 3 && (
                <div className="text-xs text-white/70 mt-2">（僅顯示前 3 個媒體，剩餘 {message.mediaFiles.length - 3} 個未顯示）</div>
              )}
            </div>
          )}
          
          {/* Text message */}
          {message.message && (
            <p className="text-white leading-relaxed font-medium break-words">
              {message.message}
            </p>
          )}
          
          {/* Timestamp and filename */}
          <div className={cn(
            "flex items-center gap-1 mt-3 text-xs font-medium",
            "text-white/80"
          )}>
            <span>
              {message.datetime instanceof Date && !isNaN(message.datetime.getTime())
                ? `${message.datetime.getFullYear()}/${(message.datetime.getMonth()+1).toString().padStart(2,'0')}/${message.datetime.getDate().toString().padStart(2,'0')} ${message.datetime.getHours().toString().padStart(2,'0')}:${message.datetime.getMinutes().toString().padStart(2,'0')}`
                : 'Invalid Date'}
            </span>
            {message.chatFileName && (
              <>
                <span>•</span>
                <span className="text-white/60">{message.chatFileName}</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Own message avatar */}
      {isOwnMessage && (
        <div className="flex-shrink-0 mb-2">
          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
            <span className="text-white font-bold text-sm">  {message.sender.charAt(0).toUpperCase()}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;