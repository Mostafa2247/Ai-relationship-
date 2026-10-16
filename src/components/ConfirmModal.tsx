import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  isDestructive = true,
  onConfirm,
  onCancel,
}) => {
  const { uiLang } = useTheme();
  const isAr = uiLang === 'ar';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-2xl transition-all">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isDestructive
                ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                : 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">{title}</h3>
            <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            {cancelLabel || (isAr ? 'إلغاء' : 'Cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-xs transition ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-stone-900 dark:bg-stone-100 text-stone-900 hover:opacity-90'
            }`}
          >
            {confirmLabel || (isAr ? 'تأكيد الحذف' : 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};
