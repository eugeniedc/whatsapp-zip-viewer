import React, { useState, useRef } from "react";
import JSZip from "jszip";
import {
  Card,
  Input,
  DatePicker,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  Label,
  Button,
} from "@/components/ui";
import { cn } from "@/lib/utils";

interface WhatsAppMessage {
  datetime: Date;
  sender: string;
  message: string;
}

function parseWhatsAppText(text: string): WhatsAppMessage[] {
  const regex =
    /^(\d{1,2}\/\d{1,2}\/\d{2,4}), (\d{1,2}:\d{2}) - ([^:]+): (.+)$/m;
  return text
    .split("\n")
    .map((line) => {
      const match = line.match(regex);
      if (match) {
        const [_, date, time, sender, message] = match;
        // WhatsApp export dates are often in MM/DD/YY or DD/MM/YY, so this may need adjustment for your locale
        return {
          datetime: new Date(`${date} ${time}`),
          sender,
          message,
        };
      }
      return null;
    })
    .filter(Boolean) as WhatsAppMessage[];
}

// Helper component for chat avatars
const Avatar: React.FC<{ name: string; className?: string }> = ({ name, className }) => {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-whatsapp-green text-white font-semibold text-sm",
        "w-10 h-10",
        className
      )}
    >
      {initial}
    </div>
  );
};

// Message bubble component
const MessageBubble: React.FC<{
  message: WhatsAppMessage;
  isCurrentUser?: boolean;
}> = ({ message, isCurrentUser = false }) => {
  return (
    <div className={cn("flex gap-3 mb-4", isCurrentUser && "flex-row-reverse")}>
      <Avatar name={message.sender} className="flex-shrink-0" />
      <div
        className={cn(
          "message-bubble rounded-2xl px-4 py-3 max-w-xs shadow-sm",
          isCurrentUser
            ? "bg-whatsapp-green-light sent ml-auto"
            : "bg-white received border"
        )}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-semibold text-sm text-whatsapp-green-dark">
            {message.sender}
          </span>
          <span className="text-xs text-gray-500">
            {message.datetime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className="text-gray-800 text-sm leading-relaxed">
          {message.message}
        </div>
      </div>
    </div>
  );
};

const WhatsAppZipViewer: React.FC = () => {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [search, setSearch] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [filtered, setFiltered] = useState<WhatsAppMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle ZIP upload
  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    try {
      const zip = await JSZip.loadAsync(file);
      let allMessages: WhatsAppMessage[] = [];
      for (const filename of Object.keys(zip.files)) {
        if (filename.endsWith(".txt")) {
          const text = await zip.files[filename].async("string");
          allMessages = allMessages.concat(parseWhatsAppText(text));
        }
      }
      setMessages(allMessages);
      setFiltered(allMessages);
    } catch (error) {
      console.error("Error processing ZIP file:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter/search logic
  React.useEffect(() => {
    let filteredMsgs = messages;
    if (search)
      filteredMsgs = filteredMsgs.filter(
        (m) =>
          m.message.toLowerCase().includes(search.toLowerCase()) ||
          m.sender.toLowerCase().includes(search.toLowerCase())
      );
    if (startDate)
      filteredMsgs = filteredMsgs.filter((m) => m.datetime >= startDate);
    if (endDate)
      filteredMsgs = filteredMsgs.filter((m) => m.datetime <= endDate);
    setFiltered(filteredMsgs);
  }, [search, startDate, endDate, messages]);

  // Get unique senders for variety in chat display
  const uniqueSenders = [...new Set(messages.map(m => m.sender))];
  const currentUser = uniqueSenders[0]; // Assume first sender is current user for demo

  return (
    <div className="min-h-screen bg-gradient-to-b from-whatsapp-green-dark to-whatsapp-green">
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto bg-white/95 backdrop-blur">
          <CardHeader className="whatsapp-bg text-white rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.515z" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-white">WhatsApp Export Viewer</CardTitle>
                <CardDescription className="text-white/80">
                  View and search your WhatsApp chat exports locally and securely
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Upload Section */}
            <div className="space-y-4">
              <div className="p-6 border-2 border-dashed border-gray-300 rounded-xl text-center hover:border-whatsapp-green transition-colors">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleZipUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="mb-2"
                >
                  {isLoading ? "Processing..." : "Choose WhatsApp Export ZIP"}
                </Button>
                <p className="text-sm text-gray-500">
                  Select your WhatsApp export ZIP file to view messages
                </p>
              </div>
            </div>

            {/* Search and Filter Section */}
            {messages.length > 0 && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
                <div className="space-y-2">
                  <Label htmlFor="search">Search Messages</Label>
                  <Input
                    id="search"
                    type="text"
                    placeholder="Search sender or message content..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <DatePicker
                      id="start-date"
                      value={startDate}
                      onChange={setStartDate}
                      placeholder="Select start date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date">End Date</Label>
                    <DatePicker
                      id="end-date"
                      value={endDate}
                      onChange={setEndDate}
                      placeholder="Select end date"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Messages Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-800">
                  {filtered.length === 0 && messages.length > 0
                    ? "No messages match your search"
                    : `${filtered.length} message${filtered.length !== 1 ? 's' : ''}`}
                  {search && ` matching "${search}"`}
                </h4>
                {messages.length > 0 && (
                  <div className="text-sm text-gray-500">
                    Total: {messages.length} messages
                  </div>
                )}
              </div>

              {/* Message List */}
              <div className="bg-gray-50 rounded-xl p-4 min-h-[400px]">
                {filtered.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-center">
                    {messages.length === 0 ? (
                      <div className="space-y-2">
                        <div className="text-4xl">💬</div>
                        <p className="text-gray-500">
                          Upload a WhatsApp export ZIP file to start viewing your messages
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-4xl">🔍</div>
                        <p className="text-gray-500">
                          No messages found matching your criteria
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto space-y-1">
                    {filtered.map((message, i) => (
                      <MessageBubble
                        key={i}
                        message={message}
                        isCurrentUser={message.sender === currentUser}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WhatsAppZipViewer;
