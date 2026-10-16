import React from 'react';
import { X, Download, FileText } from 'lucide-react';
import type { MediaAttachment } from '../types';

interface MediaLightboxModalProps {
  attachment: MediaAttachment | null;
  onClose: () => void;
}

export const MediaLightboxModal: React.FC<MediaLightboxModalProps> = ({ attachment, onClose }) => {
  if (!attachment) return null;

  const isVideo = attachment.mediaType === 'video' || attachment.mimeType.startsWith('video/');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="w-full flex items-center justify-between pb-3 text-white">
          <div className="flex items-center gap-2 truncate">
            <span className="text-xs sm:text-sm font-semibold truncate">
              {attachment.originalFileName}
            </span>
            {attachment.label && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 text-rose-200 truncate">
                {attachment.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={attachment.storagePath}
              download={attachment.originalFileName}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition text-xs flex items-center gap-1"
              title="تنزيل الملف"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media Container */}
        <div className="w-full flex items-center justify-center overflow-hidden rounded-2xl bg-black/40 border border-white/10 max-h-[75vh]">
          {isVideo ? (
            <video
              src={attachment.storagePath}
              controls
              autoPlay
              playsInline
              className="max-h-[75vh] max-w-full rounded-2xl object-contain"
            />
          ) : (
            <img
              src={attachment.storagePath}
              alt={attachment.label || attachment.originalFileName}
              className="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl"
              onError={(e) => {
                // If direct link fails, fallback
                const target = e.currentTarget;
                target.style.display = 'none';
              }}
            />
          )}
        </div>

        {/* Footer info */}
        <div className="w-full flex items-center justify-between pt-2 text-[11px] text-stone-400">
          <span>{isVideo ? 'مقطع فيديو' : 'صورة مرفقة'}</span>
          <span>{Math.round(attachment.sizeBytes / 1024)} كيلوبايت</span>
        </div>
      </div>
    </div>
  );
};
