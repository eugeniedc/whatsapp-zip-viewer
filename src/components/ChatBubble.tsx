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
    <div className={cn("flex mb-3", isOutgoing ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[80%] rounded-2xl px-3 py-2 shadow-sm relative",
        isOutgoing
          ? "bg-[var(--whatsapp-bubble-outgoing)] text-foreground"
          : "bg-[var(--whatsapp-bubble-incoming)] text-foreground border border-border"
      )}>
        <div className="flex flex-col">
          <div className="font-medium text-sm text-[var(--whatsapp-green)] mb-1">
            {sender}
          </div>
          <div className="text-sm leading-relaxed mb-1">
            {message}
          </div>
          <div className="flex justify-end">
            <span className="text-xs text-muted-foreground">
              {datetime.toLocaleString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit'
              })}
            </span>
          </div>
        </div>
        {/* Chat bubble tail */}
        <div className={cn(
          "absolute top-0 w-4 h-4",
          isOutgoing
            ? "-right-2 bg-[var(--whatsapp-bubble-outgoing)]"
            : "-left-2 bg-[var(--whatsapp-bubble-incoming)] border-l border-t border-border",
          isOutgoing
            ? "rounded-br-2xl"
            : "rounded-bl-2xl"
        )} />
      </div>
    </div>
  );
};

export default ChatBubble;