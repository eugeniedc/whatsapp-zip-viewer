import React, { useState, useRef, useMemo } from "react";
import JSZip from "jszip";
import { Upload, Search, MessageCircle, Calendar, FileUp } from "lucide-react";
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
import ChatMessage, { WhatsAppMessage } from "./ChatMessage";
import { mediaLoader } from "@/utils/MediaLoader";

function parseWhatsAppText(text: string): WhatsAppMessage[] {
  // 支援兩種格式：
  // 1. [dd/mm/yyyy hh:mm:ss] sender: message
  // 2. dd/mm/yyyy, hh:mm - sender: message
  const regexBracket = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}) (\d{1,2}:\d{2}:\d{2})\] ([^:]+): (.+)$/gm;
  const regexDash = /^(\d{1,2}\/\d{1,2}\/\d{2,4}), (\d{1,2}:\d{2}) - ([^:]+): (.+)$/gm;
  const messages: WhatsAppMessage[] = [];
  // 先解析中括號格式
  let matchBracket;
  while ((matchBracket = regexBracket.exec(text)) !== null) {
    const [_, date, time, sender, message] = matchBracket;
    // date: dd/mm/yyyy, time: hh:mm:ss
    const [d, m, yRaw] = date.split('/');
    let y = yRaw;
    if (y.length === 2) {
      y = Number(y) < 50 ? '20' + y : '19' + y;
    }
    // 解析時間
    const [hh, mm, ss] = time.split(':');
    const dt = new Date(Date.UTC(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      Number(ss)
    ));
    messages.push({
      datetime: dt,
      sender,
      message,
    });
  }
  // 再解析 dash 格式
  let matchDash;
  while ((matchDash = regexDash.exec(text)) !== null) {
    const [_, date, time, sender, message] = matchDash;
    // date: dd/mm/yyyy, time: hh:mm
    const [d, m, yRaw] = date.split('/');
    let y = yRaw;
    if (y.length === 2) {
      y = Number(y) < 50 ? '20' + y : '19' + y;
    }
    const [hh, mm] = time.split(':');
    const dt = new Date(Date.UTC(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      0
    ));
    messages.push({
      datetime: dt,
      sender,
      message,
    });
  }
  return messages;
}

// Function to determine media type from filename
function getMediaType(filename: string): 'image' | 'sticker' | 'document' | 'audio' | 'video' {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension || '')) {
    return 'image';
  }
  if (['webp', 'tgs'].includes(extension || '') && filename.includes('sticker')) {
    return 'sticker';
  }
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(extension || '')) {
    return 'audio';
  }
  if (['mp4', 'mov', 'avi', 'webm', '3gp'].includes(extension || '')) {
    return 'video';
  }
  return 'document';
}

// Enhanced function to map media files to messages
function mapMediaToMessages(messages: WhatsAppMessage[]): WhatsAppMessage[] {
  return messages.map(message => {
    // 支援 <添付ファイル: filename> 格式
    const mediaMatches = [];
    // 1. 先抓 <添付ファイル: ...> 格式（注意空格）
    const attachTagRegex = /<添付ファイル:\s*([^>]+)>/gi;
    let tagMatch;
    while ((tagMatch = attachTagRegex.exec(message.message)) !== null) {
      mediaMatches.push(tagMatch[1].trim());
    }
    // 2. 再抓原本的檔名格式，包括長檔名
    const fileNameRegex = /(\d{8}-PHOTO-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.jpg|IMG-\d+-WA\d+\.\w+|VID-\d+-WA\d+\.\w+|AUD-\d+-WA\d+\.\w+|STK-\d+-WA\d+\.\w+|[\w-]+\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|mp3|wav|ogg|pdf|doc))/gi;
    let fileMatch;
    while ((fileMatch = fileNameRegex.exec(message.message)) !== null) {
      mediaMatches.push(fileMatch[0]);
    }
    
    if (mediaMatches.length > 0) {
      console.log(`Found media matches for message "${message.message}":`, mediaMatches);
      
      const attachedMedia: WhatsAppMessage['mediaFiles'] = [];
      const seen = new Set<string>();
      
      mediaMatches.forEach(mediaRef => {
        // Clean the filename - remove "(file attached)" part if present
        const cleanRef = mediaRef.replace(/\s*\(file attached\).*/i, '').trim();
        // 直接用檔名
        const justFilename = cleanRef.split('/').pop() || cleanRef;
        
        if (seen.has(justFilename)) return;
        seen.add(justFilename);
        
        // Check if media exists in MediaLoader index
        if (mediaLoader.hasMedia(justFilename)) {
          console.log(`Successfully found media ${justFilename} in index`);
          attachedMedia.push({
            filename: justFilename,
            type: getMediaType(justFilename),
          });
        } else {
          // Try fuzzy matching
          const nameWithoutExt = justFilename.split('.')[0];
          if (mediaLoader.hasMedia(nameWithoutExt)) {
            console.log(`Successfully found media ${nameWithoutExt} in index via fuzzy match`);
            attachedMedia.push({
              filename: nameWithoutExt,
              type: getMediaType(justFilename),
            });
          } else {
            console.log(`Could not find media file for: ${justFilename}`);
          }
        }
      });
      
      if (attachedMedia.length > 0) {
        // 保留原始訊息內容，不清理媒體檔名
        return {
          ...message,
          message: message.message, // 保持原始訊息，包含媒體檔名
          mediaFiles: attachedMedia,
        };
      }
    }
    return message;
  });
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
  const [visibleCount, setVisibleCount] = useState<number>(100);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [ownerName, setOwnerName] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [filtered, setFiltered] = useState<WhatsAppMessage[]>([]);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [isUploadMinimized, setIsUploadMinimized] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isProcessingMessages, setIsProcessingMessages] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup MediaLoader on component unmount
  React.useEffect(() => {
    return () => {
      mediaLoader.cleanup();
    };
  }, []);

  // Optimize rendering for large message lists
  const displayMessages = useMemo(() => {
    if (filtered.length > 1000) {
      // For very large lists, only render visible messages plus buffer
      return filtered.slice(0, Math.min(visibleCount, 500));
    }
    return filtered.slice(0, visibleCount);
  }, [filtered, visibleCount]);

  // Handle ZIP upload
  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Cleanup previous media before processing new ZIP
    mediaLoader.cleanup();
    
    setIsUploading(true);
    setUploadProgress(0);
    setIsProcessingMessages(false);
    let allMessages: WhatsAppMessage[] = [];
    
    // 動態取得 owner name：優先從檔名，否則用第一則訊息 sender
    let owner = "";
    
    // 嘗試從 ZIP 檔名取得 owner
    if (file && file.name) {
      // 例如 WhatsApp Chat - Kelly Chan.zip 取 Kelly Chan
      const match = file.name.match(/WhatsApp Chat - (.+)\.zip$/i);
      if (match && match[1]) {
        owner = match[1].trim();
      }
    }
    
    try {
      const zip = await JSZip.loadAsync(file, {});
      const fileEntries = Object.entries(zip.files);
      let processed = 0;
      const total = fileEntries.length;
      
      // First pass: Build media index (NO size/count limits!)
      console.log('Building media index...');
      mediaLoader.buildMediaIndex(fileEntries);
      setUploadProgress(Math.round((processed / total) * 40)); // 40% for media indexing
      
      // Second pass: Extract _chat.txt messages
      setIsProcessingMessages(true);
      for (const filename of Object.keys(zip.files)) {
        if (filename === "_chat.txt") {
          const text = await zip.files[filename].async("string");
          const parsedMessages = parseWhatsAppText(text);
          allMessages = allMessages.concat(parsedMessages);
          // 如果 owner 尚未取得，則用第一則訊息 sender
          if (!owner && parsedMessages.length > 0) {
            owner = parsedMessages[0].sender;
          }
          // 將檔名資訊加入每則訊息
          allMessages = allMessages.map(msg => ({
            ...msg,
            chatFileName: filename
          }));
        }
        processed++;
        setUploadProgress(Math.round((processed / total) * 90)); // 90% for text
      }
      
      // Third pass: Map media files to messages (no eager loading)
      console.log(`Processing ${allMessages.length} messages with media index`);
      console.log('Available media files:', mediaLoader.getAvailableMedia().length);
      console.log('Detected owner:', owner);
      const messagesWithMedia = mapMediaToMessages(allMessages);
      
      setMessages(messagesWithMedia);
      setFiltered(messagesWithMedia);
      setOwnerName(owner);
      setUploadProgress(100);
      
      setTimeout(() => {
        setIsUploading(false);
        setIsProcessingMessages(false);
        setIsUploadMinimized(true);
      }, 500);
    } catch (err) {
      setIsUploading(false);
      setIsProcessingMessages(false);
      setUploadProgress(0);
      console.error('ZIP processing error:', err);
      alert("Upload failed: " + (err instanceof Error ? err.message : 'Unknown error'));
      // Cleanup on error
      mediaLoader.cleanup();
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
  setVisibleCount(100); // 每次搜尋或篩選都重設顯示數量
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
          <Card className="p-0 mb-8 border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-t-xl p-4">
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
                {isUploading && (
                  <div className="mt-8">
                    <div className="w-full bg-gray-200 rounded-full h-6">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 h-6 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <div className="text-center text-emerald-700 font-semibold mt-2">
                      {uploadProgress < 100 ? `uploading... ${uploadProgress}%` : "Done!"}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Minimized Upload Section */
          <Card className="p-0 mb-6 border-0 shadow-lg bg-white/90 backdrop-blur-sm">
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
                    <p className="text-sm text-gray-600">Chat import ready!</p>
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
          <Card className="p-0 mb-8 border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-xl p-2">
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
        {isProcessingMessages && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="inline-flex p-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full shadow-lg mb-6 animate-pulse">
              <MessageCircle className="h-16 w-16 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-700 mb-3">Processing messages...</h3>
            <p className="text-gray-500 text-lg">Please wait while your chat is being processed.</p>
          </div>
        )}
        {!isProcessingMessages && messages.length > 0 && (
          <Card className="p-0 border-0 shadow-2xl bg-white/95 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-6">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-white/20 rounded-lg">
                  <MessageCircle className="h-6 w-6" />
                </div>
                💬 Chat Messages
                <div className="ml-auto bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                  {filtered.length} messages {filtered.length > 1000 && '(performance optimized)'}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[700px] overflow-y-auto bg-gradient-to-b from-blue-50/30 to-purple-50/30 backdrop-blur-sm">
                {filtered.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="inline-flex p-6 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full shadow-lg mb-6">
                      <MessageCircle className="h-16 w-16 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-700 mb-3">No messages found</h3>
                    <p className="text-gray-500 text-lg">Try adjusting your search criteria ✨</p>
                  </div>
                ) : (
                  <div className="p-6">
                    {displayMessages.map((message, i) => {
                      // 用 ownerName 判斷 isOwnMessage
                      const isOwnMessage = message.sender === ownerName;
                      const senderColorIndex = message.sender ? (message.sender.charCodeAt(0) % 8) : 0;
                      return (
                        <ChatMessage
                          key={i}
                          message={message}
                          isOwnMessage={isOwnMessage}
                          senderColorIndex={senderColorIndex}
                        />
                      );
                    })}
                    {visibleCount < filtered.length && (
                      <div className="flex justify-center mt-6">
                        <Button
                          variant="outline"
                          onClick={() => setVisibleCount(v => v + 100)}
                          className="border-2 border-indigo-300 text-indigo-600 hover:bg-indigo-50 font-semibold px-8 py-3 rounded-xl shadow-lg"
                        >
                          載入更多訊息 ({Math.min(100, filtered.length - visibleCount)} more)
                        </Button>
                      </div>
                    )}
                    {filtered.length > 1000 && (
                      <div className="text-center text-gray-600 text-sm mt-4">
                        💡 Large chat detected - performance optimizations are active
                      </div>
                    )}
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
