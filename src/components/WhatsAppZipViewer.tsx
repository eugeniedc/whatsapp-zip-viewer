import React, { useState, useRef } from "react";
import JSZip from "jszip";
import { Upload, Search, MessageCircle, User, Calendar, FileUp } from "lucide-react";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

// Simple DatePicker component
const DatePicker: React.FC<{
  id?: string;
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
}> = ({ id, value, onChange, placeholder }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      onChange?.(new Date(dateValue));
    } else {
      onChange?.(undefined);
    }
  };

  return (
    <Input
      id={id}
      type="date"
      value={value ? value.toISOString().split('T')[0] : ''}
      onChange={handleChange}
      placeholder={placeholder}
    />
  );
};

const WhatsAppZipViewer: React.FC = () => {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [search, setSearch] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [filtered, setFiltered] = useState<WhatsAppMessage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle ZIP upload
  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
      filteredMsgs = filteredMsgs.filter(
        (m) => m.datetime >= startDate
      );
    if (endDate)
      filteredMsgs = filteredMsgs.filter(
        (m) => m.datetime <= endDate
      );
    setFiltered(filteredMsgs);
  }, [search, startDate, endDate, messages]);

  return (
    <div className="min-h-screen chat-gradient-bg">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="p-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-300 shadow-lg">
              <MessageCircle className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              WhatsApp Chat Viewer
            </h1>
          </div>
          <p className="text-lg text-purple-600/80 font-medium">Transform your chat exports into beautiful conversations</p>
        </div>

        {/* Upload Section */}
        <Card className="mb-8 card-gradient border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-400 text-white">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Upload className="h-6 w-6" />
              Upload Your Chat Export
            </CardTitle>
            <CardDescription className="text-purple-100 text-base">
              Select your WhatsApp chat export ZIP file to begin
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div
              className={cn(
                "border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 cursor-pointer transform hover:scale-[1.02]",
                messages.length > 0 
                  ? "border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50 shadow-inner" 
                  : "border-purple-200 hover:border-purple-400 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="p-4 mx-auto mb-4 w-fit rounded-full bg-gradient-to-r from-purple-200 to-pink-200">
                <FileUp className="h-12 w-12 text-purple-600" />
              </div>
              <p className="text-xl font-semibold text-purple-700 mb-3">
                {messages.length > 0 ? "🎉 Chat loaded successfully!" : "📱 Choose your WhatsApp export file"}
              </p>
              <p className="text-purple-600/80 text-base">
                {messages.length > 0 
                  ? `✨ ${messages.length} messages ready to explore` 
                  : "Drag & drop your .zip file here or click to browse"
                }
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleZipUpload}
                className="hidden"
              />
              <Button className="mt-6 bg-gradient-to-r from-purple-500 to-pink-400 hover:from-purple-600 hover:to-pink-500 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200">
                {messages.length > 0 ? "Load Different File" : "Select File"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filter Section */}
        {messages.length > 0 && (
          <Card className="mb-8 card-gradient border-0 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-400 to-purple-400 text-white">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Search className="h-6 w-6" />
                🔍 Search & Filter Messages
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-8">
                {/* Search Box */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-200 to-pink-200 rounded-xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-400" />
                    <Input
                      id="search"
                      type="text"
                      placeholder="✨ Search messages, sender names, or keywords..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-12 h-14 text-lg bg-white/80 border-purple-200 focus:border-purple-400 rounded-xl shadow-sm"
                    />
                  </div>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="start-date" className="flex items-center gap-2 text-purple-700 font-medium text-lg">
                      <Calendar className="h-5 w-5" />
                      📅 Start Date
                    </Label>
                    <DatePicker
                      id="start-date"
                      value={startDate}
                      onChange={setStartDate}
                      placeholder="Select start date"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="end-date" className="flex items-center gap-2 text-purple-700 font-medium text-lg">
                      <Calendar className="h-5 w-5" />
                      📅 End Date
                    </Label>
                    <DatePicker
                      id="end-date"
                      value={endDate}
                      onChange={setEndDate}
                      placeholder="Select end date"
                    />
                  </div>
                </div>

                {/* Filter Results */}
                <div className="flex items-center justify-between pt-6 border-t border-purple-200">
                  <div className="flex items-center gap-3 text-purple-700">
                    <MessageCircle className="h-5 w-5" />
                    <span className="font-semibold text-lg">
                      📊 {filtered.length} of {messages.length} messages
                    </span>
                    {search && (
                      <span className="text-purple-500 bg-purple-100 px-3 py-1 rounded-full text-sm">
                        matching "{search}"
                      </span>
                    )}
                  </div>
                  {(search || startDate || endDate) && (
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={() => {
                        setSearch("");
                        setStartDate(undefined);
                        setEndDate(undefined);
                      }}
                      className="border-purple-300 text-purple-600 hover:bg-purple-50 hover:border-purple-400"
                    >
                      ✨ Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Messages Section */}
        {messages.length > 0 && (
          <Card className="card-gradient border-0 overflow-hidden shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-indigo-400 to-purple-400 text-white">
              <CardTitle className="flex items-center gap-3 text-xl">
                <MessageCircle className="h-6 w-6" />
                💬 Chat Messages
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[700px] overflow-y-auto chat-container">
                {filtered.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="p-6 mx-auto mb-6 w-fit rounded-full bg-gradient-to-r from-purple-200 to-pink-200">
                      <MessageCircle className="h-16 w-16 text-purple-400" />
                    </div>
                    <p className="text-2xl font-semibold mb-3 text-purple-600">No messages found</p>
                    <p className="text-purple-500 text-lg">Try adjusting your search criteria to find messages</p>
                  </div>
                ) : (
                  <div className="p-6 space-y-4">
                    {filtered.map((message, i) => {
                      // Create a simple hash to determine message alignment
                      const senderHash = message.sender.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
                      const isOwnMessage = senderHash % 3 === 0; // Randomly assign some messages as "own"
                      const avatarClass = `avatar-pastel-${(senderHash % 5) + 1}`;
                      
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex gap-3 group animate-in fade-in duration-200",
                            isOwnMessage ? "justify-end flex-row-reverse" : "justify-start"
                          )}
                          style={{
                            animationDelay: `${i * 50}ms`
                          }}
                        >
                          {/* Avatar */}
                          {!isOwnMessage && (
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg",
                              avatarClass
                            )}>
                              <User className="h-5 w-5 text-white" />
                            </div>
                          )}
                          
                          {/* Message Container */}
                          <div className="flex flex-col max-w-[75%] group-hover:scale-[1.02] transition-transform duration-200">
                            {/* Sender Name */}
                            {!isOwnMessage && (
                              <div className="flex items-center gap-2 mb-1 ml-2">
                                <span className="text-sm font-bold text-purple-600">
                                  {message.sender}
                                </span>
                              </div>
                            )}
                            
                            {/* Message Bubble */}
                            <div
                              className={cn(
                                "px-5 py-3 relative transition-all duration-200 hover:shadow-lg",
                                isOwnMessage ? "message-bubble-own" : "message-bubble-other"
                              )}
                            >
                              <p className="text-base leading-relaxed mb-2 break-words">
                                {message.message}
                              </p>
                              
                              {/* Timestamp and Status */}
                              <div className={cn(
                                "text-xs flex items-center gap-2 opacity-70",
                                isOwnMessage ? "text-white justify-end" : "text-purple-500 justify-end"
                              )}>
                                <span className="font-medium">
                                  {message.datetime.toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </span>
                                {isOwnMessage && (
                                  <div className="flex gap-0.5">
                                    <div className="w-1 h-1 bg-white/70 rounded-full"></div>
                                    <div className="w-1 h-1 bg-white/70 rounded-full"></div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default WhatsAppZipViewer;
