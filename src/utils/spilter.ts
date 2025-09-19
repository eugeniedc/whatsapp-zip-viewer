import JSZip from "jszip";

export type SplitOptions = {
  start: Date;
  end: Date;
  includeChat?: boolean;
  includeMedia?: boolean;
  mediaExtensions?: string[];
  chatFilenameCandidates?: RegExp[];
};

type Entry = JSZip.JSZipObject;

const DEFAULT_MEDIA_EXTS = [
  "jpg", "jpeg", "png", "gif", "webp",
  "mp4", "mov", "avi", "mkv",
  "ogg", "opus", "mp3", "wav", "m4a",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "heic", "heif",
  "aac"
];

const DEFAULT_CHAT_CANDIDATES = [
  /_chat\.txt$/i,
  /^WhatsApp Chat with .*\.txt$/i
];

export async function splitZipByTimeRangeAndMedia(
  zipInput: Blob | ArrayBuffer,
  options: SplitOptions
): Promise<Blob> {
  const {
    start,
    end,
    includeChat = true,
    includeMedia = true,
    mediaExtensions = DEFAULT_MEDIA_EXTS,
    chatFilenameCandidates = DEFAULT_CHAT_CANDIDATES
  } = options;

  const zip = await JSZip.loadAsync(zipInput);
  const out = new JSZip();

  const chatEntry = includeChat ? findChatFile(zip, chatFilenameCandidates) : undefined;

  if (includeChat && chatEntry) {
    const chatText = await chatEntry.async("string");
    const filteredChat = filterChatByRange(chatText, start, end);
    out.file(chatEntry.name, filteredChat);
  }

  if (includeMedia) {
    const mediaSet = new Set(mediaExtensions.map(e => e.toLowerCase()));
    const entries = Object.values(zip.files);

    for (const e of entries) {
      if (e.dir) continue;
      if (chatEntry && e.name === chatEntry.name) continue;

      const ext = getExtension(e.name);
      const isMedia = ext ? mediaSet.has(ext.toLowerCase()) : false;
      if (!isMedia) continue;

      const ts = parseTimestampFromMediaFilename(e.name) ?? e.date ?? null;
      if (!ts) continue;

      if (inRange(ts, start, end)) {
        const data = await e.async("arraybuffer");
        out.file(e.name, data);
      }
    }
  }

  return out.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

function findChatFile(zip: JSZip, patterns: RegExp[]): Entry | undefined {
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    if (patterns.some(rx => rx.test(name))) {
      return entry;
    }
  }
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    if (/\.txt$/i.test(name) && !name.includes("/")) return entry;
  }
  return undefined;
}

function inRange(d: Date, start: Date, end: Date): boolean {
  const t = d.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function getExtension(name: string): string | null {
  const m = /\.([A-Za-z0-9]+)$/.exec(name);
  return m ? m[1] : null;
}

function filterChatByRange(chatText: string, start: Date, end: Date): string {
  const lines = chatText.split(/\r?\n/);
  const out: string[] = [];

  let keepCurrentBlock = false;

  for (const line of lines) {
    const ts = parseTimestampFromChatLine(line);

    if (ts) {
      keepCurrentBlock = inRange(ts, start, end);
      if (keepCurrentBlock) out.push(line);
    } else {
      if (keepCurrentBlock) out.push(line);
    }
  }

  return out.join("\n");
}

function parseTimestampFromMediaFilename(name: string): Date | null {
  const base = name.split("/").pop() ?? name;

  {
    const m = /(WhatsApp (Image|Video|Audio|Document))\s+(\d{4})-(\d{2})-(\d{2})\s+at\s+(\d{2})\.(\d{2})\.(\d{2})/i.exec(base);
    if (m) {
      const [ , , , yyyy, mm, dd, HH, MM, SS ] = m;
      const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(HH), Number(MM), Number(SS));
      return isValidDate(d) ? d : null;
    }
  }

  {
    const m = /(\d{4})-(\d{2})-(\d{2})[ _]at[ _]?(\d{2})\.(\d{2})\.(\d{2})/i.exec(base)
          ||  /(\d{4})-(\d{2})-(\d{2})[ _](\d{2})\.(\d{2})\.(\d{2})/i.exec(base);
    if (m) {
      const [ , yyyy, mm, dd, HH, MM, SS ] = m;
      const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(HH), Number(MM), Number(SS));
      return isValidDate(d) ? d : null;
    }
  }

  {
    const m = /^(IMG|VID|PTT|AUD|DOC)-(\d{4})(\d{2})(\d{2})-WA\d+/i.exec(base);
    if (m) {
      const [, , yyyy, mm, dd] = m;
      const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), 0, 0, 0);
      return isValidDate(d) ? d : null;
    }
  }

  {
    const m = /(\d{4})-(\d{2})-(\d{2})/.exec(base);
    if (m) {
      const [ , yyyy, mm, dd ] = m;
      const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), 0, 0, 0);
      return isValidDate(d) ? d : null;
    }
  }

  {
    const m = /(\d{4})(\d{2})(\d{2})/.exec(base);
    if (m) {
      const [ , yyyy, mm, dd ] = m;
      const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), 0, 0, 0);
      return isValidDate(d) ? d : null;
    }
  }

  return null;
}

function parseTimestampFromChatLine(line: string): Date | null {
  const l = line.trim();
  if (!/^[\[\d]/.test(l)) return null;

  {
    const m = /^\[(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:,)?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\]/.exec(l);
    if (m) {
      let [ , d, mo, y, h, mi, s ] = m;
      const yyyy = y.length === 2 ? twoDigitYearToFull(y) : Number(y);
      const date = new Date(yyyy, Number(mo) - 1, Number(d), Number(h), Number(mi), s ? Number(s) : 0);
      return isValidDate(date) ? date : null;
    }
  }

  {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(l);
    if (m) {
      let [ , d, mo, y, h, mi, s ] = m;
      const yyyy = y.length === 2 ? twoDigitYearToFull(y) : Number(y);
      const date = new Date(yyyy, Number(mo) - 1, Number(d), Number(h), Number(mi), s ? Number(s) : 0);
      return isValidDate(date) ? date : null;
    }
  }

  {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(l);
    if (m) {
      let [ , mo, d, y, h, mi, ap ] = m;
      const yyyy = y.length === 2 ? twoDigitYearToFull(y) : Number(y);
      let hour = Number(h) % 12;
      if (/PM/i.test(ap)) hour += 12;
      const date = new Date(yyyy, Number(mo) - 1, Number(d), hour, Number(mi), 0);
      return isValidDate(date) ? date : null;
    }
  }

  {
    const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4}),\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(l);
    if (m) {
      const [ , d, mo, yyyy, h, mi, s ] = m;
      const date = new Date(Number(yyyy), Number(mo) - 1, Number(d), Number(h), Number(mi), s ? Number(s) : 0);
      return isValidDate(date) ? date : null;
    }
  }

  {
    const m = /^(\d{4})-(\d{2})-(\d{2}),\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(l);
    if (m) {
      const [ , yyyy, mo, d, h, mi, s ] = m;
      const date = new Date(Number(yyyy), Number(mo) - 1, Number(d), Number(h), Number(mi), s ? Number(s) : 0);
      return isValidDate(date) ? date : null;
    }
  }

  {
    const m = /^(\d{4})\/(\d{2})\/(\d{2}),\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(l);
    if (m) {
      const [ , yyyy, mo, d, h, mi, s ] = m;
      const date = new Date(Number(yyyy), Number(mo) - 1, Number(d), Number(h), Number(mi), s ? Number(s) : 0);
      return isValidDate(date) ? date : null;
    }
  }

  return null;
}

function isValidDate(d: Date): boolean {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

function twoDigitYearToFull(y: string): number {
  const num = Number(y);
  return num >= 70 ? 1900 + num : 2000 + num;
}