import React, { useState, useRef } from 'react';
import { splitZipByTimeRangeAndMedia, type SplitOptions } from './utils/spilter';
import DateTimePicker from './components/DateTimePicker';
import { Upload, Calendar, FileText, Split, Download } from "lucide-react";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const SplitZipPage: React.FC = () => {
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [start, setStart] = useState<Date | undefined>(undefined);
  const [end, setEnd] = useState<Date | undefined>(undefined);
  const [includeChat, setIncludeChat] = useState<boolean>(true);
  const [includeMedia, setIncludeMedia] = useState<boolean>(true);
  const [mediaExts, setMediaExts] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setZipFile(e.target.files[0]);
      setStatus('');
    }
  };

  const handleSplit = async () => {
    if (!zipFile) {
      setStatus('Please select a ZIP file first');
      return;
    }
    if (!start || !end) {
      setStatus('Please choose start and end date/time');
      return;
    }
    const startDate = start;
    const endDate = end;
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setStatus('Invalid date/time format');
      return;
    }
    if (startDate > endDate) {
      setStatus('Start time cannot be later than end time');
      return;
    }
    try {
      setBusy(true);
      setStatus('Processing, please wait…');

      const customExts = mediaExts
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);

      const options: SplitOptions = {
        start: startDate,
        end: endDate,
        includeChat,
        includeMedia,
        mediaExtensions: customExts.length ? customExts : undefined,
      };

      const outBlob = await splitZipByTimeRangeAndMedia(zipFile, options);

      const dlUrl = URL.createObjectURL(outBlob);
      const a = document.createElement('a');
      const baseName = zipFile.name.replace(/\.zip$/i, '');
      const fmt = (d: Date) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const HH = String(d.getHours()).padStart(2, '0');
        const MM = String(d.getMinutes()).padStart(2, '0');
        return `${yyyy}${mm}${dd}-${HH}${MM}`;
      };
      const safeStart = fmt(startDate);
      const safeEnd = fmt(endDate);
      a.href = dlUrl;
      a.download = `${baseName}-split-${safeStart}-${safeEnd}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(dlUrl);

      const sizeMB = (outBlob.size / (1024 * 1024)).toFixed(2);
      setStatus(`Done! Output size about ${sizeMB} MB`);
    } catch (err: any) {
      console.error(err);
      setStatus(`Error: ${err?.message || 'Unknown error'}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full">
              <Split className="h-10 w-10 text-white drop-shadow-lg" />
            </div>
            <h1 className="text-4xl font-bold text-white drop-shadow-lg">
              WhatsApp Chat Splitter
            </h1>
          </div>
          <p className="text-white/90 text-lg font-medium drop-shadow">
            Split your WhatsApp export by time range and customize the content! ⚡
          </p>
        </div>

        {/* File Upload Section */}
        <Card className="p-0 mb-8 border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-t-xl p-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-white/20 rounded-lg">
                <Upload className="h-6 w-6" />
              </div>
              Select ZIP File to Split
            </CardTitle>
            <CardDescription className="text-emerald-100 font-medium">
              Choose your WhatsApp chat export ZIP file for splitting 📁
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div
              className={cn(
                "border-3 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer transform hover:scale-[1.02]",
                zipFile 
                  ? "border-emerald-400 bg-emerald-50 shadow-lg" 
                  : "border-gray-300 hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-lg"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="mb-4">
                <div className="inline-flex p-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full shadow-lg">
                  <FileText className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {zipFile ? "✅ File selected!" : "Choose your WhatsApp ZIP file"}
              </h3>
              <p className="text-gray-600 mb-4">
                {zipFile 
                  ? `Selected: ${zipFile.name}` 
                  : "Click here to select a .zip file containing your WhatsApp chat export"
                }
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold px-6 py-2 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105"
              >
                {zipFile ? "Change File" : "Select ZIP file"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Time Range Section */}
        <Card className="p-0 mb-8 border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-xl p-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-white/20 rounded-lg">
                <Calendar className="h-6 w-6" />
              </div>
              Set Time Range
            </CardTitle>
            <CardDescription className="text-purple-100 font-medium">
              Choose the start and end dates/times for your split ⏰
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                  <div className="p-1 bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  Start Time
                </Label>
                <DateTimePicker
                  date={start}
                  setDate={setStart}
                />
              </div>
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                  <div className="p-1 bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  End Time
                </Label>
                <DateTimePicker
                  date={end}
                  setDate={setEnd}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Options Section */}
        <Card className="p-0 mb-8 border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-t-xl p-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-white/20 rounded-lg">
                <FileText className="h-6 w-6" />
              </div>
              Content Options
            </CardTitle>
            <CardDescription className="text-indigo-100 font-medium">
              Customize what to include in your split file 🎯
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200">
                  <input 
                    type="checkbox" 
                    checked={includeChat} 
                    onChange={(e) => setIncludeChat(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-medium text-gray-700">Include chat text</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200">
                  <input 
                    type="checkbox" 
                    checked={includeMedia} 
                    onChange={(e) => setIncludeMedia(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded">
                      <Upload className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-medium text-gray-700">Include media files</span>
                  </div>
                </label>
              </div>
              <div className="space-y-3">
                <Label className="text-lg font-semibold text-gray-700">
                  Custom media extensions (comma-separated)
                </Label>
                <Input
                  type="text"
                  placeholder="e.g., jpg,png,mp4,mp3"
                  value={mediaExts}
                  onChange={(e) => setMediaExts(e.target.value)}
                  className="h-12 text-lg border-2 border-gray-200 focus:border-indigo-500 rounded-xl"
                />
                <p className="text-sm text-gray-500">
                  Leave empty to include all supported media types
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Split Action Section */}
        <Card className="p-0 mb-8 border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <Button 
              onClick={handleSplit} 
              disabled={!zipFile || busy || !start || !end}
              className={cn(
                "bg-gradient-to-r text-white font-bold px-10 py-4 rounded-xl shadow-lg transform transition-all duration-200",
                (!zipFile || busy || !start || !end)
                  ? "from-gray-400 to-gray-500 cursor-not-allowed"
                  : "from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 hover:scale-105"
              )}
            >
              {busy ? (
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Processing...
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Download className="h-5 w-5" />
                  Split and Download
                </div>
              )}
            </Button>
            {status && (
              <div className={cn(
                "mt-6 p-4 rounded-lg text-center font-medium",
                busy 
                  ? "bg-blue-50 text-blue-800 border border-blue-200" 
                  : status.includes('Error') 
                    ? "bg-red-50 text-red-800 border border-red-200"
                    : "bg-green-50 text-green-800 border border-green-200"
              )}>
                {status}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SplitZipPage;
