import React, { useState } from 'react';
import { splitZipByTimeRangeAndMedia, type SplitOptions } from './utils/spilter';
import DateTimePicker from './components/DateTimePicker';
import { Button, Input } from './components/ui';

const SplitZipPage: React.FC = () => {
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [start, setStart] = useState<Date | undefined>(undefined);
  const [end, setEnd] = useState<Date | undefined>(undefined);
  const [includeChat, setIncludeChat] = useState<boolean>(true);
  const [includeMedia, setIncludeMedia] = useState<boolean>(true);
  const [mediaExts, setMediaExts] = useState<string>('');

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
    <div style={{ padding: 32 }}>
      <h2>Split ZIP File</h2>
      <div style={{ marginTop: 12 }}>
        <Input type="file" accept=".zip" onChange={handleFileChange} />
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <label>
          Start Time:
           <DateTimePicker
            date={start}
            setDate={setStart}
           />
       
        </label>
        <label>
          End Time:
          <DateTimePicker
            date={end}
            setDate={setEnd}
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={includeChat} onChange={(e) => setIncludeChat(e.target.checked)} />
          Include chat text
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={includeMedia} onChange={(e) => setIncludeMedia(e.target.checked)} />
          Include media files
        </label>
        <label>
          Custom media extensions (comma-separated):
          <input
            type="text"
            placeholder="e.g., jpg,png,mp4,mp3"
            value={mediaExts}
            onChange={(e) => setMediaExts(e.target.value)}
            style={{ minWidth: 260, marginLeft: 6 }}
          />
        </label>
      </div>

      <Button onClick={handleSplit} disabled={!zipFile || busy} style={{ marginTop: 16 }}>
        {busy ? 'Processing…' : 'Split and Download'}
      </Button>
      <div style={{ marginTop: 16, color: busy ? '#333' : '#C00' }}>{status}</div>
    </div>
  );
};

export default SplitZipPage;
