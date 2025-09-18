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
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [isUploadMinimized, setIsUploadMinimized] = useState<boolean>(false);
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
    // Minimize upload section after successful upload
    if (allMessages.length > 0) {
      setIsUploadMinimized(true);
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
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full">
              <MessageCircle className="h-10 w-10 text-white drop-shadow-lg" />
            </div>
            <h1 className="text-4xl font-bold text-white drop-shadow-lg">
              WhatsApp Export Viewer
            </h1>
          </div>
          <p className="text-white/90 text-lg font-medium drop-shadow">
            Upload your WhatsApp chat export to browse messages with style! ✨
          </p>
        </div>

        {/* Upload Section */}
        {!isUploadMinimized ? (
          <Card className="mb-8 border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-t-xl">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Upload className="h-6 w-6" />
                </div>
                Upload Chat Export
              </CardTitle>
              <CardDescription className="text-emerald-100 font-medium">
                Select your WhatsApp chat export ZIP file and let the magic begin! 🚀
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div
                className={cn(
                  "border-3 border-dashed rounded-xl p-10 text-center transition-all duration-300 cursor-pointer transform hover:scale-[1.02]",
                  messages.length > 0 
                    ? "border-emerald-400 bg-emerald-50 shadow-lg" 
                    : "border-gray-300 hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-lg"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="mb-6">
                  <div className="inline-flex p-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full shadow-lg">
                    <FileUp className="h-12 w-12 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">
                  {messages.length > 0 ? "🎉 Chat loaded successfully!" : "Choose your WhatsApp export file"}
                </h3>
                <p className="text-gray-600 text-lg mb-6">
                  {messages.length > 0 
                    ? `${messages.length} messages loaded and ready to explore!` 
                    : "Click here to select a .zip file containing your WhatsApp chat export"
                  }
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleZipUpload}
                  className="hidden"
                />
                <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold px-8 py-3 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105">
                  {messages.length > 0 ? "Load Different File" : "Select File"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Minimized Upload Section */
          <Card className="mb-6 border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg">
                    <FileUp className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">
                      {messages.length} messages loaded
                    </h4>
                    <p className="text-sm text-gray-600">Chat export ready!</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUploadMinimized(false)}
                  className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                >
                  Change File
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search Toggle Button */}
        {messages.length > 0 && !showSearch && (
          <div className="mb-6 text-center">
            <Button
              onClick={() => setShowSearch(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold px-8 py-3 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105"
            >
              <Search className="h-5 w-5 mr-2" />
              Search & Filter Messages ✨
            </Button>
          </div>
        )}

        {/* Search and Filter Section */}
        {messages.length > 0 && showSearch && (
          <Card className="mb-8 border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-xl">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Search className="h-6 w-6" />
                  </div>
                  Search & Filter Messages
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSearch(false)}
                  className="text-white hover:bg-white/20"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-8">
                {/* Search Box */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 p-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                    <Search className="h-4 w-4 text-white" />
                  </div>
                  <Input
                    id="search"
                    type="text"
                    placeholder="Search messages or sender names... ✨"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-14 h-14 text-lg border-2 border-purple-200 focus:border-purple-500 rounded-xl"
                  />
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="start-date" className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                      <div className="p-1 bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg">
                        <Calendar className="h-4 w-4 text-white" />
                      </div>
                      Start Date
                    </Label>
                    <DatePicker
                      id="start-date"
                      value={startDate}
                      onChange={setStartDate}
                      placeholder="Select start date"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="end-date" className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                      <div className="p-1 bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg">
                        <Calendar className="h-4 w-4 text-white" />
                      </div>
                      End Date
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
                <div className="flex items-center justify-between pt-6 border-t-2 border-gray-100">
                  <div className="flex items-center gap-3 text-gray-700">
                    <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg">
                      <MessageCircle className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-semibold text-lg">
                      {filtered.length} of {messages.length} messages
                    </span>
                    {search && (
                      <span className="text-purple-600 font-medium">
                        matching "{search}" ✨
                      </span>
                    )}
                  </div>
                  {(search || startDate || endDate) && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSearch("");
                        setStartDate(undefined);
                        setEndDate(undefined);
                      }}
                      className="border-2 border-purple-300 text-purple-600 hover:bg-purple-50 font-semibold"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Messages Section */}
        {messages.length > 0 && (
          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-6">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-white/20 rounded-lg">
                  <MessageCircle className="h-6 w-6" />
                </div>
                💬 Chat Messages
                <div className="ml-auto bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                  {filtered.length} messages
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[700px] overflow-y-auto bg-gradient-to-b from-blue-50/50 to-purple-50/50">
                {filtered.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="inline-flex p-6 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full shadow-lg mb-6">
                      <MessageCircle className="h-16 w-16 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-700 mb-3">No messages found</h3>
                    <p className="text-gray-500 text-lg">Try adjusting your search criteria ✨</p>
                  </div>
                ) : (
                  <div className="p-6 space-y-4">
                    {filtered.map((message, i) => {
                      // Create a simple hash to determine message alignment and colors
                      const senderHash = message.sender.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
                      const isOwnMessage = senderHash % 3 === 0;
                      
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
                      const senderColorIndex = senderHash % senderColors.length;
                      const bubbleColor = isOwnMessage ? 'from-emerald-500 to-emerald-600' : senderColors[senderColorIndex];
                      
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex items-end gap-3 group",
                            isOwnMessage ? "justify-end flex-row-reverse" : "justify-start"
                          )}
                        >
                          {/* Avatar */}
                          {!isOwnMessage && (
                            <div className="flex-shrink-0 mb-2">
                              <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-r",
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
                            isOwnMessage ? "items-end" : "items-start"
                          )}>
                            {/* Sender name for incoming messages */}
                            {!isOwnMessage && (
                              <div className="mb-1 ml-4">
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
                              "relative px-5 py-3 rounded-2xl shadow-lg bg-gradient-to-r text-white",
                              bubbleColor,
                              isOwnMessage 
                                ? "rounded-br-md" 
                                : "rounded-bl-md"
                            )}>
                              <p className="text-white leading-relaxed font-medium">
                                {message.message}
                              </p>
                              
                              {/* Timestamp */}
                              <div className={cn(
                                "flex items-center gap-1 mt-2 text-xs font-medium",
                                "text-white/80"
                              )}>
                                <span>
                                  {message.datetime.toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                {isOwnMessage && (
                                  <span className="ml-1">✓✓</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Own message avatar */}
                          {isOwnMessage && (
                            <div className="flex-shrink-0 mb-2">
                              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                                <span className="text-white font-bold text-sm">Me</span>
                              </div>
                            </div>
                          )}
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
