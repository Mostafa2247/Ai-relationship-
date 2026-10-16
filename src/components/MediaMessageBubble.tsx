import React, { useState } from 'react';
import { Play, Eye, FileWarning, Tag, Film, Image as ImageIcon } from 'lucide-react';
import type { MediaAttachment } from '../types';
import { MediaLightboxModal } from './MediaLightboxModal';

interface MediaMessageBubbleProps {
  attachments: MediaAttachment[];
  isUser: boolean;
}

export const MediaMessageBubble: React.FC<MediaMessageBubbleProps> = ({ attachments, isUser }) => {
  const [selectedAttachment, setSelectedAttachment] = useState<MediaAttachment | null>(null);
  const [loadErrorMap, setLoadErrorMap] = useState<Record<string, boolean>>({});

  if (!attachments || attachments.length === 0) return null;

  const handleMediaError = (id: string) => {
    setLoadErrorMap((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <>
      <div className="space-y-2 mb-2 w-full">
        <div
          className={`grid gap-2 ${
            attachments.length === 1
              ? 'grid-cols-1'
              : attachments.length === 2
              ? 'grid-cols-2'
              : attachments.length <= 4
              ? 'grid-cols-2'
              : attachments.length <= 6
              ? 'grid-cols-2 sm:grid-cols-3'
              : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
          }`}
        >
          {attachments.map((att, idx) => {
            const isVideo = att.mediaType === 'video' || att.mimeType.startsWith('video/');
            const hasError = loadErrorMap[att.id];

            if (hasError) {
              return (
                <div
                  key={att.id}
                  className={`p-3 rounded-2xl border text-xs flex flex-col items-center justify-center gap-1.5 text-center ${
                    isUser
                      ? 'bg-rose-700/50 border-rose-400/30 text-rose-100'
                      : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-500'
                  }`}
                >
                  <FileWarning className="w-5 h-5 text-amber-400" />
                  <span className="font-medium text-[11px] truncate max-w-full">
                    {att.originalFileName}
                  </span>
                  <span className="text-[10px] opacity-75">المرفق غير متوفر حالياً</span>
                </div>
              );
            }

            const itemNumberBadge = attachments.length > 1 ? `#${idx + 1}` : '';

            return (
              <div
                key={att.id}
                className="group relative overflow-hidden rounded-2xl bg-black/5 dark:bg-black/30 border border-black/10 dark:border-white/10 shadow-xs"
              >
                {isVideo ? (
                  <div className="relative aspect-video bg-black flex items-center justify-center">
                    <video
                      src={att.storagePath}
                      controls
                      playsInline
                      preload="metadata"
                      onError={() => handleMediaError(att.id)}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-2 start-2 pointer-events-none px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[10px] text-white flex items-center gap-1 font-mono">
                      <Film className="w-3 h-3 text-rose-400" />
                      <span>فيديو {itemNumberBadge}</span>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setSelectedAttachment(att)}
                    className="relative aspect-4/3 bg-stone-100 dark:bg-stone-800 cursor-pointer overflow-hidden"
                  >
                    <img
                      src={att.storagePath}
                      alt={att.label || att.originalFileName}
                      loading="lazy"
                      onError={() => handleMediaError(att.id)}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <div className="text-white text-[11px] flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        <span>تكبير الصورة</span>
                      </div>
                    </div>
                    <div className="absolute top-2 start-2 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-xs text-[10px] text-white flex items-center gap-1 font-mono">
                      <ImageIcon className="w-3 h-3 text-amber-300" />
                      <span>صورة {itemNumberBadge}</span>
                    </div>
                  </div>
                )}

                {/* Optional User Label / Caption */}
                {att.label && (
                  <div
                    className={`p-1.5 px-2.5 text-[11px] flex items-center gap-1.5 truncate border-t ${
                      isUser
                        ? 'bg-rose-700/60 border-rose-500/30 text-rose-100'
                        : 'bg-white/80 dark:bg-stone-800/80 border-stone-200/50 dark:border-stone-700/50 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <Tag className="w-3 h-3 shrink-0 opacity-70" />
                    <span className="truncate font-medium">{att.label}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedAttachment && (
        <MediaLightboxModal
          attachment={selectedAttachment}
          onClose={() => setSelectedAttachment(null)}
        />
      )}
    </>
  );
};
