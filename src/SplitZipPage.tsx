import React, { useState } from 'react';
import { splitZipByTimeRangeAndMedia, type SplitOptions } from './utils/spilter';

const SplitZipPage: React.FC = () => {
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [start, setStart] = useState<string>(''); // datetime-local value
  const [end, setEnd] = useState<string>('');
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
      setStatus('請先選擇 ZIP 檔案');
      return;
    }
    if (!start || !end) {
      setStatus('請選擇起訖日期時間');
      return;
    }
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setStatus('日期時間格式不正確');
      return;
    }
    if (startDate > endDate) {
      setStatus('開始時間不可晚於結束時間');
      return;
    }
    try {
      setBusy(true);
      setStatus('處理中，請稍候…');

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
      const safeStart = start.replace(/[:T]/g, '').slice(0, 12);
      const safeEnd = end.replace(/[:T]/g, '').slice(0, 12);
      a.href = dlUrl;
      a.download = `${baseName}-split-${safeStart}-${safeEnd}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(dlUrl);

      const sizeMB = (outBlob.size / (1024 * 1024)).toFixed(2);
      setStatus(`完成！輸出大小約 ${sizeMB} MB`);
    } catch (err: any) {
      console.error(err);
      setStatus(`發生錯誤：${err?.message || '未知錯誤'}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 32 }}>
      <h2>分割 ZIP 檔案</h2>
      <div style={{ marginTop: 12 }}>
        <input type="file" accept=".zip" onChange={handleFileChange} />
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <label>
          起始時間：
          <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          結束時間：
          <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={includeChat} onChange={(e) => setIncludeChat(e.target.checked)} />
          包含聊天文字
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={includeMedia} onChange={(e) => setIncludeMedia(e.target.checked)} />
          包含媒體檔
        </label>
        <label>
          自訂媒體副檔名（逗號分隔）：
          <input
            type="text"
            placeholder="例：jpg,png,mp4,mp3"
            value={mediaExts}
            onChange={(e) => setMediaExts(e.target.value)}
            style={{ minWidth: 260, marginLeft: 6 }}
          />
        </label>
      </div>

      <button onClick={handleSplit} disabled={!zipFile || busy} style={{ marginTop: 16 }}>
        {busy ? '處理中…' : '分割並下載'}
      </button>
      <div style={{ marginTop: 16, color: busy ? '#333' : '#C00' }}>{status}</div>
    </div>
  );
};

export default SplitZipPage;
