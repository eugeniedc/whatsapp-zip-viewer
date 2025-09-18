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
import { Search, Upload, Calendar, MessageSquare, Filter, Eye } from "lucide-react";
import ChatBubble from "@/components/ChatBubble";
import { Button } from "@/components/ui/button";

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
  const [currentUser, setCurrentUser] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Demo function to show sample messages
  const loadSampleData = () => {
    const sampleMessages: WhatsAppMessage[] = [
      {
        datetime: new Date('2024-01-15 10:30:00'),
        sender: 'John Doe',
        message: 'Hey! How are you doing?'
      },
      {
        datetime: new Date('2024-01-15 10:32:00'),
        sender: 'Me',
        message: 'Hi John! I\'m doing great, thanks for asking. How about you?'
      },
      {
        datetime: new Date('2024-01-15 10:33:00'),
        sender: 'John Doe',
        message: 'I\'m good too! Just working on some projects. Are you free for lunch today?'
      },
      {
        datetime: new Date('2024-01-15 10:35:00'),
        sender: 'Me',
        message: 'Sure! What time works for you?'
      },
      {
        datetime: new Date('2024-01-15 10:36:00'),
        sender: 'John Doe',
        message: 'How about 12:30 PM at that new Italian place downtown?'
      },
      {
        datetime: new Date('2024-01-15 10:37:00'),
        sender: 'Me',
        message: 'Perfect! See you there 😊'
      }
    ];
    
    setMessages(sampleMessages);
    setFiltered(sampleMessages);
    setCurrentUser('Me');
  };

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
    
    // Try to determine the current user (most frequent sender might be the user)
    if (allMessages.length > 0) {
      const senderCounts = allMessages.reduce((acc, msg) => {
        acc[msg.sender] = (acc[msg.sender] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const mostFrequentSender = Object.entries(senderCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0];
      
      setCurrentUser(mostFrequentSender || "");
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
            <Button
              onClick={loadSampleData}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Preview Demo
            </Button>
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
          <div className="h-[500px] overflow-y-auto p-4 bg-[#efeae2] dark:bg-[#0b141a] rounded-lg border relative" style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3e%3cdefs%3e%3cpattern id='a' width='40' height='40' patternUnits='userSpaceOnUse'%3e%3cpath d='M0 40L40 0H20L0 20M40 40V20L20 40' fill='%23f0f0f0' fill-opacity='0.05'/%3e%3c/pattern%3e%3c/defs%3e%3crect width='100%25' height='100%25' fill='url(%23a)'/%3e%3c/svg%3e")`,
            backgroundSize: '40px 40px'
          }}>
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
                    isOutgoing={m.sender === currentUser}
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
