import React, { useState } from 'react';
import { X, Tag, Film, Image as ImageIcon, AlertCircle } from 'lucide-react';

export interface PendingMediaItem {
  id: string;
  file: File;
  previewUrl: string;
  mediaType: 'image' | 'video';
  label: string;
  sizeFormatted: string;
}

interface MediaComposerStripProps {
  pendingItems: PendingMediaItem[];
  onRemoveItem: (id: string) => void;
  onUpdateLabel: (id: string, label: string) => void;
  disabled?: boolean;
}

const QUICK_LABEL_SUGGESTIONS = [
  'السناب اللي أنا بعته',
  'الصورة اللي هي بعتتها لي',
  'سكرين شوت المحادثة',
  'فيديو من الموقف',
  'صورة قديمة من قبل',
];

export const MediaComposerStrip: React.FC<MediaComposerStripProps> = ({
  pendingItems,
  onRemoveItem,
  onUpdateLabel,
  disabled,
}) => {
  const [activeLabelId, setActiveLabelId] = useState<string | null>(null);

  if (pendingItems.length === 0) return null;

  return (
    <div className="p-2.5 bg-stone-100/90 dark:bg-stone-850 border-t border-stone-200 dark:border-stone-800 rounded-t-2xl space-y-2">
      <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 font-medium px-1">
        <span>المرفقات المحددة ({pendingItems.length}):</span>
        <span className="text-[10px] text-stone-400">
          انقر لتحديد سياق المرفق (مين اللي بعته أو إيه نوعه)
        </span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
        {pendingItems.map((item) => (
          <div
            key={item.id}
            className="relative shrink-0 w-36 sm:w-40 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 shadow-xs overflow-hidden flex flex-col"
          >
            {/* Remove Button */}
            {!disabled && (
              <button
                type="button"
                onClick={() => onRemoveItem(item.id)}
                className="absolute top-1.5 end-1.5 z-10 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition"
                title="إزالة المرفق"
              >
                <X className="w-3 h-3" />
              </button>
            )}

            {/* Thumbnail */}
            <div className="relative h-20 bg-stone-200 dark:bg-stone-900 flex items-center justify-center overflow-hidden">
              {item.mediaType === 'image' ? (
                <img
                  src={item.previewUrl}
                  alt={item.file.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-stone-900 text-white">
                  <Film className="w-6 h-6 text-rose-400 mb-1" />
                  <span className="text-[10px] text-stone-300 font-mono">فيديو</span>
                </div>
              )}

              <span className="absolute bottom-1 start-1 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[9px] font-mono">
                {item.sizeFormatted}
              </span>
            </div>

            {/* Label input / chips */}
            <div className="p-1.5 flex-1 flex flex-col justify-between">
              <div className="truncate text-[11px] font-medium text-stone-800 dark:text-stone-200 mb-1">
                {item.file.name}
              </div>

              {activeLabelId === item.id ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => onUpdateLabel(item.id, e.target.value)}
                    placeholder="سياق المرفق..."
                    autoFocus
                    className="w-full text-[10px] px-2 py-1 rounded-lg border border-rose-300 dark:border-rose-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-200 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1">
                    {QUICK_LABEL_SUGGESTIONS.slice(0, 3).map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          onUpdateLabel(item.id, sug);
                          setActiveLabelId(null);
                        }}
                        className="text-[9px] px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-700 hover:bg-rose-50 text-stone-600 dark:text-stone-300 hover:text-rose-600 transition"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveLabelId(null)}
                    className="w-full py-0.5 text-[9px] text-rose-600 dark:text-rose-400 font-semibold text-center"
                  >
                    تم
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveLabelId(item.id)}
                  className={`w-full py-1 px-1.5 rounded-lg text-[10px] truncate text-start flex items-center gap-1 border transition ${
                    item.label
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-medium'
                      : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-400 hover:text-stone-600'
                  }`}
                  title="إضافة سياق للمرفق"
                >
                  <Tag className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">{item.label || '+ إضافة سياق للمرفق'}</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
