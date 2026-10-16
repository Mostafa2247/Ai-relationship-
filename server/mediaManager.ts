import fs from 'fs';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';
import { getAiClient } from './geminiService.ts';

// Centralized Media Config
export const MEDIA_CONFIG = {
  MAX_IMAGES_PER_MSG: 10,
  MAX_VIDEOS_PER_MSG: 10,
  MAX_IMAGE_SIZE_BYTES: 25 * 1024 * 1024, // 25MB per image
  MAX_VIDEO_SIZE_BYTES: 100 * 1024 * 1024, // 100MB per video
  MAX_TOTAL_PAYLOAD_BYTES: 300 * 1024 * 1024, // 300MB total
  ALLOWED_IMAGE_MIMES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'image/bmp',
    'image/svg+xml',
    'image/tiff',
  ],
  ALLOWED_VIDEO_MIMES: [
    'video/mp4',
    'video/webm',
    'video/quicktime', // .mov
    'video/x-matroska',
    'video/3gpp',
    'video/3gpp2',
    'video/avi',
    'video/x-msvideo',
    'video/mpeg',
    'video/ogg',
    'video/mp2t',
  ],
};

export const MEDIA_STORAGE_DIR = path.resolve(process.cwd(), 'data', 'media');
if (!fs.existsSync(MEDIA_STORAGE_DIR)) {
  fs.mkdirSync(MEDIA_STORAGE_DIR, { recursive: true });
}

// Media metadata registry saved on disk
interface StoredMediaRecord {
  id: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  mediaType: 'image' | 'video';
  filePath: string;
  userId?: string;
  relationshipId?: string;
  label?: string;
  createdAt: string;
}

const METADATA_FILE = path.join(MEDIA_STORAGE_DIR, 'media-registry.json');
let mediaRegistry: Record<string, StoredMediaRecord> = {};

function loadRegistry() {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      const data = fs.readFileSync(METADATA_FILE, 'utf-8');
      mediaRegistry = JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load media registry:', err);
    mediaRegistry = {};
  }
}

function saveRegistry() {
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(mediaRegistry, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save media registry:', err);
  }
}

loadRegistry();

// Normalize and clean MIME type string (strips charset, codecs, parameters)
export function normalizeMimeType(declaredMime: string, fileName?: string): string {
  let mime = (declaredMime || '').split(';')[0].trim().toLowerCase();
  
  if (!mime || mime === 'application/octet-stream' || mime === 'binary/octet-stream') {
    const ext = path.extname(fileName || '').toLowerCase();
    const extMap: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.webm': 'video/webm',
      '.mkv': 'video/x-matroska',
      '.3gp': 'video/3gpp',
      '.3gpp': 'video/3gpp',
      '.avi': 'video/avi',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.heic': 'image/heic',
      '.heif': 'image/heif',
    };
    if (extMap[ext]) {
      mime = extMap[ext];
    }
  }
  
  return mime || 'application/octet-stream';
}

// Inspect file magic numbers & signatures with flexible mobile fallback
export function validateFileMagic(
  buffer: Buffer,
  declaredMime: string,
  fileName?: string
): { valid: boolean; detectedMime: string } {
  if (buffer.length < 4) {
    return { valid: false, detectedMime: 'unknown' };
  }

  const cleanDeclared = normalizeMimeType(declaredMime, fileName);

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedMime: 'image/jpeg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, detectedMime: 'image/png' };
  }

  // WebP: RIFF .... WEBP
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { valid: true, detectedMime: 'image/webp' };
  }

  // GIF: GIF87a or GIF89a
  if (buffer.length >= 6 && buffer.toString('ascii', 0, 3) === 'GIF') {
    return { valid: true, detectedMime: 'image/gif' };
  }

  // MP4 / MOV / 3GP / M4V container: search first 64 bytes for 'ftyp', 'moov', or 'mdat'
  const headerSlice = buffer.slice(0, Math.min(buffer.length, 64)).toString('ascii');
  if (headerSlice.includes('ftyp') || headerSlice.includes('moov') || headerSlice.includes('mdat')) {
    if (headerSlice.includes('qt  ')) {
      return { valid: true, detectedMime: 'video/quicktime' };
    }
    if (headerSlice.includes('3gp')) {
      return { valid: true, detectedMime: 'video/3gpp' };
    }
    return { valid: true, detectedMime: 'video/mp4' };
  }

  // WebM / MKV: EBML header 1A 45 DF A3
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return { valid: true, detectedMime: 'video/webm' };
  }

  // AVI: RIFF .... AVI
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'AVI '
  ) {
    return { valid: true, detectedMime: 'video/avi' };
  }

  // Fallback for valid declared mimes or standard video/image extensions
  if (
    MEDIA_CONFIG.ALLOWED_IMAGE_MIMES.includes(cleanDeclared) ||
    MEDIA_CONFIG.ALLOWED_VIDEO_MIMES.includes(cleanDeclared) ||
    cleanDeclared.startsWith('video/') ||
    cleanDeclared.startsWith('image/')
  ) {
    return { valid: true, detectedMime: cleanDeclared };
  }

  return { valid: false, detectedMime: 'unsupported' };
}

export function saveMediaFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  userId?: string,
  relationshipId?: string,
  label?: string
): StoredMediaRecord {
  const cleanMime = normalizeMimeType(mimeType, fileName);
  const isVideo = MEDIA_CONFIG.ALLOWED_VIDEO_MIMES.includes(cleanMime) || cleanMime.startsWith('video/');
  const maxLimit = isVideo ? MEDIA_CONFIG.MAX_VIDEO_SIZE_BYTES : MEDIA_CONFIG.MAX_IMAGE_SIZE_BYTES;

  if (fileBuffer.length > maxLimit) {
    const limitMb = Math.round(maxLimit / (1024 * 1024));
    throw new Error(`حجم الملف يتجاوز الحد الأقصى المسموح (${limitMb} ميجابايت)`);
  }

  const { valid, detectedMime } = validateFileMagic(fileBuffer, cleanMime, fileName);
  if (!valid) {
    throw new Error(`صيغة الملف غير مدعومة أو تالفة (${mimeType})`);
  }

  const fileId = 'media_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  const ext = path.extname(fileName) || (isVideo ? '.mp4' : '.jpg');
  const diskFileName = `${fileId}${ext}`;
  const diskFilePath = path.join(MEDIA_STORAGE_DIR, diskFileName);

  fs.writeFileSync(diskFilePath, fileBuffer);

  const record: StoredMediaRecord = {
    id: fileId,
    originalFileName: fileName || (isVideo ? 'video.mp4' : 'image.jpg'),
    mimeType: detectedMime || mimeType,
    sizeBytes: fileBuffer.length,
    mediaType: isVideo ? 'video' : 'image',
    filePath: diskFilePath,
    userId,
    relationshipId,
    label: label?.trim() || '',
    createdAt: new Date().toISOString(),
  };

  mediaRegistry[fileId] = record;
  saveRegistry();

  return record;
}

export function getMediaRecord(fileId: string): StoredMediaRecord | null {
  const record = mediaRegistry[fileId];
  if (!record) return null;
  // If filePath on disk doesn't exist at the stored absolute path, check relative to current MEDIA_STORAGE_DIR
  if (!fs.existsSync(record.filePath)) {
    const fallbackPath = path.join(MEDIA_STORAGE_DIR, path.basename(record.filePath));
    if (fs.existsSync(fallbackPath)) {
      record.filePath = fallbackPath;
    }
  }
  return record;
}

export function deleteMediaFiles(fileIds: string[]): number {
  let count = 0;
  for (const id of fileIds) {
    const record = mediaRegistry[id];
    if (record) {
      try {
        if (fs.existsSync(record.filePath)) {
          fs.unlinkSync(record.filePath);
        }
      } catch (err) {
        console.warn('Failed to delete file on disk:', record.filePath, err);
      }
      delete mediaRegistry[id];
      count++;
    }
  }
  if (count > 0) {
    saveRegistry();
  }
  return count;
}

// Stream media file with support for HTTP Range (crucial for smooth mobile video playback)
export function serveMediaFile(req: IncomingMessage, res: ServerResponse, fileId: string): boolean {
  const record = getMediaRecord(fileId);
  if (!record || !fs.existsSync(record.filePath)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Media file not found or has been deleted' }));
    return true;
  }

  const stat = fs.statSync(record.filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize) {
      res.statusCode = 416;
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      res.end();
      return true;
    }

    const chunksize = end - start + 1;
    const file = fs.createReadStream(record.filePath, { start, end });
    res.statusCode = 206;
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Length', chunksize);
    res.setHeader('Content-Type', record.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    file.pipe(res);
  } else {
    res.statusCode = 200;
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Content-Type', record.mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    if (req.method === 'HEAD') {
      res.end();
      return true;
    }
    fs.createReadStream(record.filePath).pipe(res);
  }

  return true;
}

// Prepare media parts for Gemini API (Images via inlineData, Videos via Files API or inline)
export async function prepareGeminiMediaParts(
  attachments: Array<{ id: string; originalFileName?: string; label?: string; mimeType?: string }>
): Promise<{
  parts: any[];
  tempGeminiFileNames: string[];
}> {
  const parts: any[] = [];
  const tempGeminiFileNames: string[] = [];
  const ai = getAiClient();

  if (!attachments || attachments.length === 0) {
    return { parts, tempGeminiFileNames };
  }

  // Pre-calculate counts for precise contextual labeling
  const validRecords = attachments
    .map((att, originalIndex) => ({
      att,
      originalIndex,
      record: getMediaRecord(att.id),
    }))
    .filter((item) => item.record && fs.existsSync(item.record.filePath));

  const totalImages = validRecords.filter((r) => r.record!.mediaType === 'image').length;
  const totalVideos = validRecords.filter((r) => r.record!.mediaType === 'video').length;

  let currentImageNum = 0;
  let currentVideoNum = 0;

  const itemMetaList = validRecords.map(({ att, record, originalIndex }) => {
    const isVideo = record!.mediaType === 'video';
    let indexLabel = '';
    if (isVideo) {
      currentVideoNum++;
      indexLabel = totalVideos > 1 ? `مقطع فيديو #${currentVideoNum} من ${totalVideos}` : 'مقطع فيديو';
    } else {
      currentImageNum++;
      indexLabel = totalImages > 1 ? `صورة #${currentImageNum} من ${totalImages}` : 'صورة';
    }

    return {
      att,
      record: record!,
      originalIndex,
      isVideo,
      indexLabel,
    };
  });

  // Process attachments concurrently for fast throughput (especially video uploads & polling)
  const processedResults = await Promise.all(
    itemMetaList.map(async ({ att, record, isVideo, indexLabel }) => {
      const labelText = att.label || record.label || '';
      const localParts: any[] = [];
      const localTempFiles: string[] = [];

      const fileHeader = labelText
        ? `[مرفق ${indexLabel}: "${record.originalFileName}". سياق أو توصيف المستخدم: "${labelText}"]`
        : `[مرفق ${indexLabel}: "${record.originalFileName}"]`;

      localParts.push({ text: fileHeader });

      if (!isVideo) {
        // Image: inline base64 data
        try {
          const fileBuffer = fs.readFileSync(record.filePath);
          localParts.push({
            inlineData: {
              mimeType: record.mimeType,
              data: fileBuffer.toString('base64'),
            },
          });
        } catch (err: any) {
          console.error(`Failed to read image file ${record.originalFileName}:`, err);
        }
      } else {
        // Video: upload to Gemini Files API and poll until ready
        let videoAttached = false;

        try {
          const uploadResult = await ai.files.upload({
            file: record.filePath,
            config: {
              mimeType: record.mimeType,
              displayName: record.originalFileName,
            },
          });

          if (uploadResult?.name) {
            localTempFiles.push(uploadResult.name);

            let currentFile = uploadResult;
            let attempts = 0;
            // Poll for up to 52 seconds (35 x 1.5s)
            while (currentFile.state === 'PROCESSING' && attempts < 35) {
              await new Promise((r) => setTimeout(r, 1500));
              try {
                currentFile = await ai.files.get({ name: uploadResult.name });
              } catch (pollErr) {
                console.warn('Poll status error:', pollErr);
              }
              attempts++;
            }

            const activeUri = currentFile?.uri || uploadResult?.uri;

            if (currentFile.state === 'ACTIVE' && activeUri && typeof activeUri === 'string') {
              localParts.push({
                fileData: {
                  fileUri: activeUri,
                  mimeType: record.mimeType,
                },
              });
              videoAttached = true;
            } else if (currentFile.state === 'FAILED') {
              console.warn(`Files API state FAILED for ${record.originalFileName}`);
              localParts.push({
                text: `[ملاحظة: تعذر فك تشفير الفيديو "${record.originalFileName}" برمجياً من خوادم المعالجة، وسيتم الاعتماد على توصيفك للموقف وسياق المحادثة]`,
              });
            } else {
              console.warn(`Files API returned state ${currentFile.state} for ${record.originalFileName}.`);
              localParts.push({
                text: `[ملاحظة: استغرقت معالجة الفيديو "${record.originalFileName}" وقتاً أطول من المعتاد. سيتم تحليل باقي المعطيات والمحادثة بدقة]`,
              });
            }
          }
        } catch (err: any) {
          console.warn(`Files API upload fallback for video ${record.originalFileName}:`, err?.message);
          localParts.push({
            text: `[مرفق فيديو: "${record.originalFileName}". سياق أو توصيف المستخدم: "${labelText || 'فيديو الموقف'}"]`,
          });
        }
      }

      return { localParts, localTempFiles };
    })
  );

  for (const res of processedResults) {
    parts.push(...res.localParts);
    tempGeminiFileNames.push(...res.localTempFiles);
  }

  return { parts, tempGeminiFileNames };
}

// Clean up temporary files on Gemini Files API
export async function cleanupGeminiFiles(fileNames: string[]): Promise<void> {
  if (!fileNames || fileNames.length === 0) return;
  const ai = getAiClient();
  for (const name of fileNames) {
    try {
      await ai.files.delete({ name });
    } catch (err) {
      console.warn('Failed to delete temporary Gemini file:', name, err);
    }
  }
}
