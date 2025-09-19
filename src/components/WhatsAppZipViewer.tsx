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
import DateTimePicker from "./DateTimePicker";


function parseWhatsAppText(text: string): WhatsAppMessage[] {
  // 更健壯的逐行解析：
  // - 允許行首存在零寬字符（例如 \u200E）或 BOM
  // - 支援 [dd/mm/yyyy hh:mm(:ss)] sender: message
  // - 支援 dd/mm/yyyy, hh:mm( AM/PM) - sender: message
  // - 支援多行訊息（非時間戳開頭的行會附加到上一則）

  const stripLTR = (s: string) => s.replace(/^[\u200E\u200F\uFEFF]+/, "");

  // [d/m/yyyy hh:mm(:ss)] sender: message
  const bracketRe = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{1,2}:\d{2}(?::\d{2})?)\]\s+([^:]+):\s*(.*)$/;
  // d/m/yyyy, hh:mm( AM/PM)? - sender: message  (允許 - 或 –)
  const dashRe = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s+(\d{1,2}:\d{2})(?:\s*(AM|PM))?\s*[-–]\s*([^:]+):\s*(.*)$/i;

  const toFourDigitYear = (y: string) => (y.length === 2 ? (Number(y) < 50 ? 2000 + Number(y) : 1900 + Number(y)) : Number(y));

  const parseDT = (dateStr: string, timeStr: string, ampm?: string) => {
    const [d, m, yRaw] = dateStr.split('/');
    const yyyy = toFourDigitYear(yRaw);
    const parts = timeStr.split(':');
    let hh = Number(parts[0]);
    const mm = Number(parts[1]);
    const ss = parts[2] ? Number(parts[2]) : 0;
    if (ampm) {
      hh = hh % 12;
      if (/PM/i.test(ampm)) hh += 12;
    }
    return new Date(yyyy, Number(m) - 1, Number(d), hh, mm, ss);
  };

  const result: WhatsAppMessage[] = [];
  let current: WhatsAppMessage | null = null;

  const lines = text.split(/\r?\n/);
  for (let raw of lines) {
    if (!raw) {
      // 空行當作內容延伸
      if (current) current.message += "\n";
      continue;
    }
    const line = stripLTR(raw);

    let m = bracketRe.exec(line);
    if (m) {
      if (current) result.push(current);
      const [, dateStr, timeStr, sender, msg] = m;
      current = {
        datetime: parseDT(dateStr, timeStr),
        sender: sender.trim(),
        message: stripLTR(msg),
      };
      continue;
    }

    m = dashRe.exec(line);
    if (m) {
      if (current) result.push(current);
      const [, dateStr, timeStr, ampm, sender, msg] = m as unknown as [string, string, string, string | undefined, string, string];
      current = {
        datetime: parseDT(dateStr, timeStr, ampm),
        sender: sender.trim(),
        message: stripLTR(msg),
      };
      continue;
    }

    // 延伸上一則訊息
    if (current) {
      current.message += (current.message ? "\n" : "") + line;
    }
  }

  if (current) result.push(current);
  return result;
}

// Function to determine media type from filename
function getMediaType(filename: string): 'image' | 'sticker' | 'document' | 'audio' | 'video' {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'heif'].includes(extension || '')) {
    return 'image';
  }
  if (['webp', 'tgs'].includes(extension || '') && filename.includes('sticker')) {
    return 'sticker';
  }
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'opus'].includes(extension || '')) {
    return 'audio';
  }
  if (['mp4', 'mov', 'avi', 'webm', '3gp'].includes(extension || '')) {
    return 'video';
  }
  return 'document';
}

// Enhanced function to map media files to messages
function mapMediaToMessages(messages: WhatsAppMessage[]): WhatsAppMessage[] {
  const exts = ['jpg','jpeg','png','gif','webp','bmp','heic','heif','mp4','mov','avi','webm','3gp','mp3','wav','ogg','m4a','aac','opus','pdf','doc','docx','xls','xlsx','ppt','pptx'];
  const extPattern = exts.join('|');
  const looksLikeFilename = (s: string) => {
    const lowered = s.trim();
    return new RegExp(`\\.(${extPattern})$`, 'i').test(lowered) ||
           /^(IMG|VID|PTT|AUD|DOC|STK)-\d{4}\d{2}\d{2}-WA\d+/i.test(lowered) ||
           /WhatsApp\s+(Image|Video|Audio|Document)/i.test(lowered) ||
           /PHOTO-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}/i.test(lowered);
  };
  return messages.map(message => {
    // 支援 <添付ファイル: filename> 格式
    const mediaMatches = [];
    // 1. 泛化：抓 <任何語言描述: 檔名>，再用 looksLikeFilename 過濾
    const attachTagRegex = /<[^>]*?:\s*([^>]+)>/gi;
    let tagMatch;
    while ((tagMatch = attachTagRegex.exec(message.message)) !== null) {
      const candidate = tagMatch[1].trim();
      if (looksLikeFilename(candidate)) mediaMatches.push(candidate);
    }
    // 1b. 沒有使用尖括號時，支援常見語系標籤
    //  - 繁中：附件、附檔、檔案
    //  - 英文：attached file, file attached, attachment:
    const langPhrases = [
      /附件[:：]?\s*([^\n]+)/i,
      /附檔[:：]?\s*([^\n]+)/i,
      /檔案[:：]?\s*([^\n]+)/i,
      /attachment\s*[:：-]?\s*([^\n]+)/i,
      /attached\s*file\s*[:：-]?\s*([^\n]+)/i,
      /file\s*attached\s*[:：-]?\s*([^\n]+)/i
    ];
    for (const rx of langPhrases) {
      const m = rx.exec(message.message);
      if (m && looksLikeFilename(m[1])) mediaMatches.push(m[1].trim());
    }
    // 2. 再抓原本的檔名格式，包括長檔名
    const fileNameRegex = new RegExp(`(\\d{8}-PHOTO-\\d{4}-\\d{2}-\\d{2}-\\d{2}-\\d{2}-\\d{2}\\.(?:jpg|jpeg)|`+
      `(?:IMG|VID|PTT|AUD|DOC|STK)-\\d+-WA\\d+\\.(?:${extPattern})|`+
      `[\\\w-]+\\.(?:${extPattern}))`, 'gi');
    let fileMatch;
    while ((fileMatch = fileNameRegex.exec(message.message)) !== null) {
      mediaMatches.push(fileMatch[0]);
    }
    
    if (mediaMatches.length > 0) {
      console.log(`Found media matches for message "${message.message}":`, mediaMatches);
      
      const attachedMedia: WhatsAppMessage['mediaFiles'] = [];
      const seen = new Set<string>();
      
      mediaMatches.forEach(mediaRef => {
        // Clean the filename - remove "(file attached)" or localized variants if present
        const cleanRef = mediaRef
          .replace(/\s*\((file attached|arquivo anexado|pi[eè]ce jointe|allegato|anlage|archivo adjunto|附件|ไฟล์แนบ|t[eê]p đính k[eè]m|berkas terlampir|dosya eklendi)\).*/i, '')
          .trim();
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



const WhatsAppZipViewer: React.FC = () => {
  const [visibleCount, setVisibleCount] = useState<number>(100);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [ownerName, setOwnerName] = useState<string>("");
  const [ownerNameInput, setOwnerNameInput] = useState<string>("");
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
  let owner = ownerNameInput.trim();
    
    // 嘗試從 ZIP 檔名取得 owner
      if (!owner && file && file.name) {
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
      // 嘗試尋找聊天文字檔（先找 _chat.txt，其次任何 .txt）
      const allNames = Object.keys(zip.files);
      const chatCandidate =
        allNames.find(n => n.split('/').pop() === "_chat.txt") ||
        allNames.find(n => /\.txt$/i.test(n));

      for (const filename of allNames) {
        if (chatCandidate && filename === chatCandidate) {
          const text = await zip.files[filename].async("string");
          const parsedMessages = parseWhatsAppText(text);
          allMessages = allMessages.concat(parsedMessages);
          if (!owner && parsedMessages.length > 0) {
            owner = parsedMessages[0].sender;
          }
          allMessages = allMessages.map(msg => ({
            ...msg,
            chatFileName: filename
          }));
        }
        processed++;
        setUploadProgress(Math.round((processed / total) * 90));
      }
      
      // Third pass: Map media files to messages (no eager loading)
      console.log(`Processing ${allMessages.length} messages with media index`);
      console.log('Available media files:', mediaLoader.getAvailableMedia().length);
      // Resolve final owner name
      const senders = new Set(allMessages.map(m => m.sender));
      let finalOwner = owner;
      // 若有使用者輸入，且存在於聊天 senders 中，優先採用
      if (finalOwner && !senders.has(finalOwner)) {
        // 若使用者輸入不存在，先清掉，交由規則決定
        finalOwner = "";
      }
      // 若仍無，嘗試 zip 檔名推斷（上面已賦值過）
      if (!finalOwner && owner && senders.has(owner)) {
        finalOwner = owner;
      }
      // 若仍無，選擇第一個 sender，且不等於 zip 推斷的名稱（如果有）
      if (!finalOwner) {
        const zipCandidate = (file && file.name && /WhatsApp Chat - (.+)\.zip$/i.exec(file.name)?.[1]?.trim()) || "";
        const firstOther = allMessages.find(m => m.sender && m.sender !== zipCandidate)?.sender;
        finalOwner = firstOther || Array.from(senders)[0] || "";
      }

      console.log('Detected owner:', finalOwner);
      const messagesWithMedia = mapMediaToMessages(allMessages);
      
      setMessages(messagesWithMedia);
      setFiltered(messagesWithMedia);
      setOwnerName(finalOwner);
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
                            {/* Owner name input */}
                <div className="max-w-xl mx-auto text-left mb-6">
                  <Label htmlFor="owner-name" className="text-gray-700 font-semibold mb-2 block">Owner name (optional)</Label>
                  <Input
                    id="owner-name"
                    type="text"
                    value={ownerNameInput}
                    onChange={(e) => setOwnerNameInput(e.target.value)}
                    placeholder="Enter owner name (used if it matches a chat sender)"
                    className="h-11"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    If blank or no match: prefer ZIP-inferred name; otherwise pick the first sender different from the ZIP-inferred name.
                  </p>
                </div>
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
                    : "Click here to select a .zip file containing your WhatsApp chat export"}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleZipUpload}
                  className="hidden"
                />

                {isUploading ? (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800">
                      {messages.length > 0 ? `${messages.length} messages loaded` : 'Uploading...'}
                    </h4>
                    <p className="text-sm text-gray-600">Owner: {ownerName || 'Unknown'}</p>
                    <div className="w-full bg-gray-200 rounded-full h-6">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 h-6 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <div className="text-center text-emerald-700 font-semibold mt-2">
                      {uploadProgress < 100 ? `uploading... ${uploadProgress}%` : 'Done!'}
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold px-8 py-3 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105"
                  >
                    Select ZIP file
                  </Button>
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
                    <DateTimePicker
                      isHideDateLabel={true}
                      isHideTimeLabel={true}
                      date={startDate}
                      setDate={setStartDate}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="end-date" className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                      <div className="p-1 bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg">
                        <Calendar className="h-4 w-4 text-white" />
                      </div>
                      End Date
                    </Label>
                     <DateTimePicker
                      isHideDateLabel={true}
                      isHideTimeLabel={true}
                      date={endDate}
                      setDate={setEndDate}
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
                          Load more messages ({Math.min(100, filtered.length - visibleCount)} more)
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
