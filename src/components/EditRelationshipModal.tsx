import React, { useState } from 'react';
import { X, Heart, Users, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import type { Relationship, RelationshipType } from '../types';

interface EditRelationshipModalProps {
  isOpen: boolean;
  relationship: Relationship;
  onClose: () => void;
  onSubmit: (updates: Partial<Relationship>) => Promise<void>;
}

export const EditRelationshipModal: React.FC<EditRelationshipModalProps> = ({
  isOpen,
  relationship,
  onClose,
  onSubmit,
}) => {
  const { uiLang } = useTheme();
  const isAr = uiLang === 'ar';

  const [displayName, setDisplayName] = useState(relationship.displayName);
  const [relationshipType, setRelationshipType] = useState<RelationshipType>(relationship.relationshipType);
  const [status, setStatus] = useState(relationship.status || '');
  const [contextDescription, setContextDescription] = useState(relationship.contextDescription || '');
  const [summary, setSummary] = useState(relationship.summary || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError(isAr ? 'يرجى كتابة الاسم.' : 'Please enter a name.');
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        displayName: displayName.trim(),
        relationshipType,
        status: status.trim(),
        contextDescription: contextDescription.trim(),
        summary: summary.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || (isAr ? 'فشل التحديث' : 'Failed to update'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-2xl transition-all max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {isAr ? 'تعديل بيانات العلاقة' : 'Edit Relationship Details'}
            </h2>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              {isAr ? 'تعديل الاسم والنوع والملخص العام' : 'Update name, type, and general summary'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              {isAr ? 'اسم الطرف الآخر أو مسمى العلاقة *' : 'Name *'}
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              {isAr ? 'نوع العلاقة' : 'Relationship Type'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRelationshipType('romantic')}
                className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                  relationshipType === 'romantic'
                    ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-semibold'
                    : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                }`}
              >
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                <span>{isAr ? 'عاطفية' : 'Romantic'}</span>
              </button>

              <button
                type="button"
                onClick={() => setRelationshipType('friendship')}
                className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                  relationshipType === 'friendship'
                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-semibold'
                    : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-amber-500" />
                <span>{isAr ? 'صداقة' : 'Friendship'}</span>
              </button>

              <button
                type="button"
                onClick={() => setRelationshipType('other')}
                className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                  relationshipType === 'other'
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>{isAr ? 'أخرى' : 'Other'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              {isAr ? 'الحالة الحالية' : 'Status'}
            </label>
            <input
              type="text"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              {isAr ? 'نبذة وسياق العلاقة' : 'Context Description'}
            </label>
            <textarea
              rows={2}
              value={contextDescription}
              onChange={(e) => setContextDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              {isAr ? 'الملخص العام المحفوظ للعلاقة' : 'Relationship Summary'}
            </label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={isAr ? 'ملخص ديناميكية وتطور العلاقة، يتم تمريره للذكاء الاصطناعي مع المحادثات' : 'Summary passed to AI during analysis'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 font-medium text-xs shadow-xs transition disabled:opacity-50"
            >
              {loading ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : isAr ? 'حفظ التعديلات' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
