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
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <MessageCircle className="h-8 w-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-800">WhatsApp Export Viewer</h1>
          </div>
          <p className="text-gray-600">Upload your WhatsApp chat export to browse messages</p>
        </div>

        {/* Upload Section */}
        <Card className="mb-6 border-green-200 shadow-lg">
          <CardHeader className="bg-green-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Chat Export
            </CardTitle>
            <CardDescription className="text-green-100">
              Select your WhatsApp chat export ZIP file
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer hover:border-green-400 hover:bg-green-50",
                messages.length > 0 ? "border-green-300 bg-green-50" : "border-gray-300"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                {messages.length > 0 ? "Chat loaded successfully!" : "Choose your WhatsApp export file"}
              </p>
              <p className="text-sm text-gray-500">
                {messages.length > 0 
                  ? `${messages.length} messages loaded` 
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
              <Button className="mt-4 bg-green-600 hover:bg-green-700">
                {messages.length > 0 ? "Load Different File" : "Select File"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filter Section */}
        {messages.length > 0 && (
          <Card className="mb-6 border-green-200 shadow-lg">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <Search className="h-5 w-5" />
                Search & Filter Messages
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Search Box */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    type="text"
                    placeholder="Search messages or sender names..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Start Date
                    </Label>
                    <DatePicker
                      id="start-date"
                      value={startDate}
                      onChange={setStartDate}
                      placeholder="Select start date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
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
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MessageCircle className="h-4 w-4" />
                    <span className="font-medium">
                      {filtered.length} of {messages.length} messages
                    </span>
                    {search && (
                      <span className="text-green-600">
                        matching "{search}"
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
          <Card className="border-green-200 shadow-lg">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <MessageCircle className="h-5 w-5" />
                Chat Messages
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto bg-gray-50">
                {filtered.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">No messages found</p>
                    <p className="text-sm">Try adjusting your search criteria</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-2">
                    {filtered.map((message, i) => {
                      // Create a simple hash to determine message alignment
                      const senderHash = message.sender.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
                      const isOwnMessage = senderHash % 3 === 0; // Randomly assign some messages as "own"
                      
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex",
                            isOwnMessage ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[70%] rounded-2xl px-4 py-2 shadow-sm",
                              isOwnMessage
                                ? "bg-green-500 text-white rounded-br-sm"
                                : "bg-white text-gray-800 rounded-bl-sm border border-gray-200"
                            )}
                          >
                            {!isOwnMessage && (
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                                  <User className="h-3 w-3 text-gray-600" />
                                </div>
                                <span className="text-xs font-semibold text-green-600">
                                  {message.sender}
                                </span>
                              </div>
                            )}
                            <p className="text-sm leading-relaxed mb-1">
                              {message.message}
                            </p>
                            <div className={cn(
                              "text-xs flex items-center gap-1",
                              isOwnMessage ? "text-green-100 justify-end" : "text-gray-500 justify-end"
                            )}>
                              <span>
                                {message.datetime.toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
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
