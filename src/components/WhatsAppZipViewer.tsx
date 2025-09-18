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
} from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Search, Upload, Calendar, MessageSquare, Filter } from "lucide-react";
import ChatBubble from "@/components/ChatBubble";

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
    <div className="max-w-4xl mx-auto">
      {/* Header Section */}
      <Card className="mb-4 bg-card/95 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--whatsapp-green)] rounded-full flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">WhatsApp Chat Viewer</CardTitle>
              <CardDescription>
                Upload your WhatsApp export ZIP to view and search your messages
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div className="flex items-center gap-2 p-4 bg-muted/30 rounded-lg border border-dashed">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleZipUpload}
                className="border-0 bg-transparent p-0 h-auto file:bg-[var(--whatsapp-green)] file:text-white file:border-0 file:rounded-md file:px-3 file:py-1"
              />
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <Label htmlFor="search" className="flex items-center gap-2 mb-2">
                <Search className="h-4 w-4" />
                Search Messages
              </Label>
              <Input
                id="search"
                type="text"
                placeholder="Search messages or contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-background/50"
              />
            </div>
            
            <div>
              <Label htmlFor="start-date" className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4" />
                From Date
              </Label>
              <DatePicker
                id="start-date"
                value={startDate}
                onChange={setStartDate}
                placeholder="Start date"
                className="bg-background/50"
              />
            </div>
            
            <div>
              <Label htmlFor="end-date" className="flex items-center gap-2 mb-2">
                <Filter className="h-4 w-4" />
                To Date
              </Label>
              <DatePicker
                id="end-date"
                value={endDate}
                onChange={setEndDate}
                placeholder="End date"
                className="bg-background/50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages Section */}
      <Card className="bg-card/95 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-[var(--whatsapp-green)]" />
              <h4 className="font-semibold">
                {filtered.length} message{filtered.length !== 1 ? 's' : ''}
                {search && ` matching "${search}"`}
              </h4>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="h-[500px] overflow-y-auto p-4 bg-[var(--whatsapp-background)] rounded-lg border">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
                <p className="text-lg font-medium mb-2">No messages found</p>
                <p className="text-sm">
                  {messages.length === 0 
                    ? "Upload a WhatsApp export ZIP file to get started" 
                    : "Try adjusting your search or date filters"
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filtered.map((m, i) => (
                  <ChatBubble
                    key={i}
                    sender={m.sender}
                    message={m.message}
                    datetime={m.datetime}
                    isOutgoing={i % 3 === 0} // Simple alternating pattern for demo
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppZipViewer;
