import React, { useState, useRef } from "react";
import JSZip from "jszip";
import {
  Button,
  Card,
  Input,
  DatePicker,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  Label,
} from "@/components/ui/index";

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
    <Card className="max-w-xl mx-auto mt-10">
      <CardHeader>
        <CardTitle>WhatsApp Export ZIP Viewer</CardTitle>
        <CardDescription>
          Upload WhatsApp export ZIP, search and filter messages locally.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleZipUpload}
            className="mb-2"
          />

          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            type="text"
            placeholder="Search sender or message…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2"
          />

          <div className="flex gap-4 mt-2 mb-2">
            <div>
              <Label htmlFor="start-date">Start date</Label>
              <DatePicker
                id="start-date"
                value={startDate}
                onChange={setStartDate}
                placeholder="Start"
              />
            </div>
            <div>
              <Label htmlFor="end-date">End date</Label>
              <DatePicker
                id="end-date"
                value={endDate}
                onChange={setEndDate}
                placeholder="End"
              />
            </div>
          </div>
        </div>
        <div className="mt-6">
          <h4 className="font-semibold mb-2">
            Showing {filtered.length} messages
            {search && `, filtered by "${search}"`}
          </h4>
          <div className="max-h-96 overflow-y-auto">
            {filtered.length === 0 ? (
              <p>No messages found.</p>
            ) : (
              <ul className="space-y-3">
                {filtered.map((m, i) => (
                  <li key={i} className="border rounded p-2 bg-muted">
                    <div className="flex justify-between items-center">
                      <b>{m.sender}</b>
                      <span className="text-xs text-muted-foreground">
                        {m.datetime.toLocaleString()}
                      </span>
                    </div>
                    <div>{m.message}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WhatsAppZipViewer;
