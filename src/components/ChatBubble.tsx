import React from "react";
import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  sender: string;
  message: string;
  datetime: Date;
  isOutgoing?: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ sender, message, datetime, isOutgoing = false }) => {
  return (
    <div className={cn("flex mb-2", isOutgoing ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[75%] rounded-lg px-4 py-2 shadow-sm relative",
        isOutgoing
          ? "bg-[#dcf8c6] dark:bg-[#056162] text-foreground rounded-br-sm"
          : "bg-white dark:bg-[#202c33] text-foreground border border-border/20 rounded-bl-sm"
      )}>
        <div className="flex flex-col">
          {!isOutgoing && (
            <div className="font-semibold text-sm text-[#25d366] dark:text-[#53bdeb] mb-1">
              {sender}
            </div>
          )}
          <div className="text-sm leading-relaxed mb-1 whitespace-pre-wrap">
            {message}
          </div>
          <div className="flex justify-end items-center gap-1">
            <span className="text-xs text-muted-foreground/80">
              {datetime.toLocaleString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit'
              })}
            </span>
            {isOutgoing && (
              <svg width="16" height="10" viewBox="0 0 16 10" className="text-muted-foreground/60">
                <path d="M1.533 5.5L4.5 8.467L10 2.967L8.933 1.9L4.5 6.333L2.6 4.433L1.533 5.5Z" fill="currentColor"/>
                <path d="M6.533 5.5L9.5 8.467L15 2.967L13.933 1.9L9.5 6.333L7.6 4.433L6.533 5.5Z" fill="currentColor"/>
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;