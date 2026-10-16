import React, { useState } from 'react';
import { X, Heart, Users, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import type { RelationshipType } from '../types';

interface CreateRelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    displayName: string;
    relationshipType: RelationshipType;
    status: string;
    contextDescription: string;
  }) => Promise<void>;
}

export const CreateRelationshipModal: React.FC<CreateRelationshipModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const { uiLang } = useTheme();
  const isAr = uiLang === 'ar';

  const [displayName, setDisplayName] = useState('');
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('romantic');
  const [status, setStatus] = useState('نشطة ومستمرة');
  const [contextDescription, setContextDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError(isAr ? 'يرجى كتابة اسم الطرف الآخر أو مسمى العلاقة.' : 'Please enter a name.');
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        displayName: displayName.trim(),
        relationshipType,
        status,
        contextDescription: contextDescription.trim(),
      });
      // reset
      setDisplayName('');
      setContextDescription('');
      onClose();
    } catch (err: any) {
      setError(err?.message || (isAr ? 'فشل حفظ العلاقة' : 'Failed to save relationship'));
    } finally {
      setLoading(false);
    }
  };

  const statusPresets = isAr
    ? ['نشطة ومستمرة', 'بداية تعارف', 'خلاف حديث', 'تباعد وتغير في التواصل', 'صداقة مقربة', 'علاقة معقدة']
    : ['Active & Ongoing', 'Early Dating', 'Recent Conflict', 'Cooling / Distance', 'Close Friendship', 'Complicated'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-2xl transition-all">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {isAr ? 'إضافة علاقة جديدة' : 'Add New Relationship'}
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                {isAr ? 'مساحة مستقلة بمحادثاتها وسجل ذاكرتها الخاص' : 'An isolated workspace with private memory'}
              </p>
            </div>
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
              {isAr ? 'اسم الطرف الآخر أو مسمى العلاقة *' : 'Person Name or Relationship Label *'}
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setError('');
              }}
              placeholder={isAr ? 'مثال: سارة، أحمد، صديق الطفولة...' : 'e.g. Sarah, Alex, Childhood friend'}
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
                    ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-semibold ring-1 ring-rose-500/30'
                    : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-750'
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
                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-semibold ring-1 ring-amber-500/30'
                    : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-750'
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
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-semibold ring-1 ring-indigo-500/30'
                    : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-750'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>{isAr ? 'أخرى / مخصصة' : 'Other'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              {isAr ? 'الحالة الحالية للعلاقة' : 'Current Status'}
            </label>
            <input
              type="text"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder={isAr ? 'مثال: نشطة، تباعد، سوء تفاهم...' : 'e.g. Active, Cooling, Conflict'}
              className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition mb-2"
            />
            {/* Quick status chips */}
            <div className="flex flex-wrap gap-1.5">
              {statusPresets.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setStatus(preset)}
                  className={`text-[10px] px-2 py-0.5 rounded-md border transition ${
                    status === preset
                      ? 'bg-rose-500 text-white border-rose-500'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              {isAr ? 'نبذة تمهيدية أو سياق (اختياري)' : 'Context or Brief Notes (Optional)'}
            </label>
            <textarea
              rows={3}
              value={contextDescription}
              onChange={(e) => setContextDescription(e.target.value)}
              placeholder={
                isAr
                  ? 'أي معلومات أولية تساعد الذكاء الاصطناعي على فهم خلفية العلاقة (مثلاً: طريقة التعارف، المدة، أمور مشتركة...)'
                  : 'Any introductory background to help the AI understand the history (e.g. how you met, duration, etc.)'
              }
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
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-medium text-xs shadow-md shadow-rose-500/25 transition disabled:opacity-50"
            >
              {loading ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : isAr ? 'إنشاء مساحة العلاقة' : 'Create Relationship'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
