import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  GitCompare,
  Sparkles,
  Clock,
  FileCheck,
  AlertCircle,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ConfirmModal } from './ConfirmModal';
import { FormattedMessage } from './FormattedMessage';
import type { Relationship, TimelineEvent } from '../types';

interface TimelineManagerProps {
  relationship: Relationship;
  timelineEvents: TimelineEvent[];
  currentSituationContext?: string;
  onAddEvent: (event: Omit<TimelineEvent, 'id' | 'relationshipId' | 'createdAt'>) => Promise<void>;
  onDeleteEvent: (eventId: string) => Promise<void>;
}

export const TimelineManager: React.FC<TimelineManagerProps> = ({
  relationship,
  timelineEvents,
  currentSituationContext,
  onAddEvent,
  onDeleteEvent,
}) => {
  const { uiLang } = useTheme();
  const isAr = uiLang === 'ar';

  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);

  // New Event Form State
  const [summary, setSummary] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [saving, setSaving] = useState(false);

  // Comparison State
  const [comparing, setComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<string>('');
  const [copiedComparison, setCopiedComparison] = useState(false);
  const [error, setError] = useState('');

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim() || !date) return;
    setSaving(true);
    try {
      await onAddEvent({
        eventSummary: summary.trim(),
        date,
        evidenceNotes: evidenceNotes.trim(),
        sourceReference: sourceReference.trim(),
      });
      setSummary('');
      setEvidenceNotes('');
      setSourceReference('');
      setShowAddModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleRunComparison = async () => {
    if (timelineEvents.length === 0) {
      setError(
        isAr
          ? 'يرجى توثيق حدث واحد على الأقل في الخط الزمني لإجراء مقارنة حقيقية قائمة على الأدلة.'
          : 'Please add at least one timeline milestone to run comparison.'
      );
      return;
    }

    setError('');
    setComparing(true);
    setComparisonResult('');

    try {
      const res = await fetch('/api/timeline-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: timelineEvents,
          currentContext: currentSituationContext || relationship.summary || 'الوضع الحالي الموصوف في المحادثات',
          relationship,
        }),
      });

      if (!res.ok) throw new Error('Comparison failed');
      const data = await res.json();
      setComparisonResult(data.comparison || '');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || (isAr ? 'فشل إجراء المقارنة' : 'Comparison failed'));
    } finally {
      setComparing(false);
    }
  };

  const handleCopyComparison = () => {
    navigator.clipboard.writeText(comparisonResult);
    setCopiedComparison(true);
    setTimeout(() => setCopiedComparison(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {isAr ? 'الخط الزمني ومقارنة الأنماط' : 'Timeline & Behavioral Comparisons'}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {isAr
                  ? `متابعة المحطات الفارقة في العلاقة مع (${relationship.displayName}) ومقارنة الأنماط السلوكية عبر الزمن وفق الأدلة فقط.`
                  : `Document milestones with (${relationship.displayName}) and objectively compare patterns over time.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunComparison}
              disabled={comparing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition disabled:opacity-50"
            >
              <GitCompare className={`w-3.5 h-3.5 ${comparing ? 'animate-spin' : ''}`} />
              <span>{comparing ? (isAr ? 'جارٍ المقارنة...' : 'Comparing...') : isAr ? 'مقارنة الأنماط عبر الزمن' : 'Compare Patterns Over Time'}</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'إضافة محطة' : 'Add Milestone'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Comparison Report Box if generated */}
      {comparisonResult && (
        <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              {isAr ? 'تقرير مقارنة الأنماط السلوكية عبر الزمن (بدون درجات وهمية):' : 'Objective Pattern Comparison Report:'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyComparison}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-stone-800 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50"
              >
                {copiedComparison ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span>{isAr ? 'تم النسخ' : 'Copied'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>{isAr ? 'نسخ' : 'Copy'}</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setComparisonResult('')}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-indigo-100 dark:border-indigo-900/40 text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed font-sans">
            <FormattedMessage content={comparisonResult} isAssistant={true} />
          </div>
        </div>
      )}

      {/* Timeline List */}
      {timelineEvents.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 border border-dashed border-stone-300 dark:border-stone-700 rounded-2xl p-8 text-center">
          <Clock className="w-10 h-10 mx-auto text-stone-300 dark:text-stone-600 mb-3" />
          <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300">
            {isAr ? 'الخط الزمني فارغ حالياً' : 'Timeline is currently empty'}
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-md mx-auto">
            {isAr
              ? 'وثق المواقف أو التغيرات المهمة (مثل: بداية التواصل، أول سوء تفاهم، انقطاع مفاجئ، عودة تواصل) لتتمكن من مقارنة الأنماط بدقة مع الوقت.'
              : 'Record key milestones or shifts to enable grounded timeline comparison.'}
          </p>
        </div>
      ) : (
        <div className="relative pl-6 rtl:pl-0 rtl:pr-6 border-l-2 rtl:border-l-0 rtl:border-r-2 border-stone-200 dark:border-stone-800 space-y-6">
          {timelineEvents.map((evt) => (
            <div key={evt.id} className="relative group">
              {/* Dot on the line */}
              <div className="absolute -left-[31px] rtl:-left-auto rtl:-right-[31px] top-1.5 w-4 h-4 rounded-full bg-white dark:bg-stone-900 border-2 border-indigo-500 group-hover:scale-110 transition-transform" />

              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-xs hover:border-stone-300 dark:hover:border-stone-700 transition">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400">
                      {evt.date}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                      {evt.eventSummary}
                    </h4>
                  </div>

                  <button
                    onClick={() => setDeleteEventId(evt.id)}
                    className="p-1 rounded-md text-stone-400 hover:text-rose-600 transition"
                    title="حذف هذا الحدث"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {evt.evidenceNotes && (
                  <p className="text-xs text-stone-600 dark:text-stone-300 mt-2 leading-relaxed font-sans bg-stone-50 dark:bg-stone-800/50 p-2.5 rounded-xl border border-stone-100 dark:border-stone-800">
                    <strong className="text-stone-700 dark:text-stone-200">
                      {isAr ? 'الأدلة والملابسات: ' : 'Evidence notes: '}
                    </strong>
                    {evt.evidenceNotes}
                  </p>
                )}

                {evt.sourceReference && (
                  <p className="mt-2 text-[10px] text-stone-400">
                    {isAr ? 'المرجع: ' : 'Reference: '} {evt.sourceReference}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Milestone Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {isAr ? 'إضافة محطة أو موقف في الخط الزمني' : 'Add Milestone to Timeline'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  {isAr ? 'عنوان المحطة أو ملخص الموقف *' : 'Event Summary *'}
                </label>
                <input
                  type="text"
                  required
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder={isAr ? 'مثال: خلاف حاد حول موعد الرد، اعتذار صريح، فتور مفاجئ...' : 'e.g. Major disagreement, sudden withdrawal...'}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  {isAr ? 'التاريخ التقريبي أو الفعلي *' : 'Date or Period *'}
                </label>
                <input
                  type="text"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="YYYY-MM-DD أو مثلاً: منتصف شهر يناير"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  {isAr ? 'الملاحظات والأدلة الملموسة' : 'Observable Evidence Notes'}
                </label>
                <textarea
                  rows={3}
                  value={evidenceNotes}
                  onChange={(e) => setEvidenceNotes(e.target.value)}
                  placeholder={
                    isAr
                      ? 'ما الذي حدث بالضبط؟ ما قيل وما فُعل؟ اذكر الوقائع بدون تخمين نوايا باطنة...'
                      : 'What actually happened? Document observable facts...'
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  {isAr ? 'مرجع أو سياق (اختياري)' : 'Reference (Optional)'}
                </label>
                <input
                  type="text"
                  value={sourceReference}
                  onChange={(e) => setSourceReference(e.target.value)}
                  placeholder={isAr ? 'مثال: محادثة واتساب بتاريخ...' : 'e.g. Chat logs...'}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-stone-500 hover:bg-stone-100"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                >
                  {saving ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : isAr ? 'إضافة إلى الخط الزمني' : 'Add Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Event Confirm */}
      <ConfirmModal
        isOpen={Boolean(deleteEventId)}
        title={isAr ? 'حذف هذه المحطة' : 'Delete Milestone'}
        message={
          isAr
            ? 'هل أنت متأكد من حذف هذا الحدث من الخط الزمني؟'
            : 'Are you sure you want to delete this milestone?'
        }
        confirmLabel={isAr ? 'حذف' : 'Delete'}
        onConfirm={async () => {
          if (deleteEventId) {
            await onDeleteEvent(deleteEventId);
            setDeleteEventId(null);
          }
        }}
        onCancel={() => setDeleteEventId(null)}
      />
    </div>
  );
};
