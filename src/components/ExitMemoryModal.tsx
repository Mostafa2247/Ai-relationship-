import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, Check, X, CheckSquare, Square, ArrowLeft, ArrowRight, Loader2, BookmarkCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import type { Relationship, MemoryCategory, MemoryClassification, ConfidenceLevel } from '../types';

interface SuggestedMemoryItem {
  content: string;
  category: MemoryCategory;
  classification: MemoryClassification;
  confidence?: ConfidenceLevel;
  sourceReference?: string;
  selected?: boolean;
}

interface ExitMemoryModalProps {
  isOpen: boolean;
  relationship: Relationship;
  recentChatText: string;
  hasMessages: boolean;
  onSaveAndExit: (memories: Omit<SuggestedMemoryItem, 'selected'>[], newSummary?: string) => Promise<void>;
  onSkipAndExit: () => void;
  onCancel: () => void;
}

export const ExitMemoryModal: React.FC<ExitMemoryModalProps> = ({
  isOpen,
  relationship,
  recentChatText,
  hasMessages,
  onSaveAndExit,
  onSkipAndExit,
  onCancel,
}) => {
  const { uiLang } = useTheme();
  const isAr = uiLang === 'ar';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggestedItems, setSuggestedItems] = useState<SuggestedMemoryItem[]>([]);
  const [suggestedSummary, setSuggestedSummary] = useState<string>('');
  const [saveSummaryChecked, setSaveSummaryChecked] = useState(true);
  const [extractedRan, setExtractedRan] = useState(false);

  useEffect(() => {
    if (isOpen && hasMessages && !extractedRan) {
      runExtraction();
    } else if (isOpen && !hasMessages) {
      // No messages in this session, exit directly
      onSkipAndExit();
    }
  }, [isOpen, hasMessages]);

  const runExtraction = async () => {
    setLoading(true);
    setExtractedRan(true);
    try {
      const res = await fetch('/api/extract-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recentText: recentChatText,
          relationship,
        }),
      });

      if (!res.ok) throw new Error('Extraction failed');
      const data = await res.json();
      const items: SuggestedMemoryItem[] = (data.suggestedMemories || []).map((m: any) => ({
        ...m,
        selected: true, // Selected by default for user approval
      }));

      setSuggestedItems(items);
      if (data.suggestedSummary) {
        setSuggestedSummary(data.suggestedSummary);
      }
    } catch (err) {
      console.error('Error extracting memory on exit:', err);
      // On error, let user exit without blocking them
      setSuggestedItems([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const toggleItem = (index: number) => {
    setSuggestedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item))
    );
  };

  const selectedCount = suggestedItems.filter((i) => i.selected).length;

  const handleConfirmSave = async () => {
    setSaving(true);
    try {
      const toSave = suggestedItems
        .filter((i) => i.selected)
        .map(({ selected, ...rest }) => rest);

      const summaryToSave = saveSummaryChecked && suggestedSummary ? suggestedSummary : undefined;
      await onSaveAndExit(toSave, summaryToSave);
    } finally {
      setSaving(false);
    }
  };

  const categoryLabels: Record<string, { label: string; color: string }> = {
    fact: { label: isAr ? 'حقيقة مؤكدة' : 'Fact', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200' },
    pattern: { label: isAr ? 'نمط سلوكي' : 'Pattern', color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200' },
    interpretation: { label: isAr ? 'استنتاج' : 'Inference', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200' },
    preference: { label: isAr ? 'تفضيل أو حد' : 'Preference', color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200' },
    unresolved: { label: isAr ? 'غير محسوم' : 'Unresolved', color: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border-stone-200' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
                {isAr ? 'تحديث ذاكرة العلاقة قبل الخروج' : 'Update Relationship Memory Before Exit'}
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                {isAr
                  ? `مراجعة معلومات (${relationship.displayName}) لمساعدة الذكاء الاصطناعي في المرات القادمة`
                  : `Review facts & patterns to enrich AI context for next time`}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            title={isAr ? 'البقاء في المحادثة' : 'Stay in chat'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200">
                {isAr ? 'جارٍ استخراج المعلومات والأنماط ذكياً...' : 'Extracting memories from conversation...'}
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-xs leading-relaxed">
                {isAr
                  ? 'يقوم الرفيق بتحليل ما دار في المحادثة لاستخراج الحقائق والحدود الجديدة لموافقتك عليها قبل الحفظ.'
                  : 'Analyzing the conversation to identify new facts, patterns, and preferences.'}
              </p>
            </div>
          ) : suggestedItems.length === 0 && !suggestedSummary ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-10 h-10 mx-auto rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-500 flex items-center justify-center">
                <BookmarkCheck className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200">
                {isAr ? 'لا توجد معلومات جديدة تستدعي الحفظ' : 'No new memories detected'}
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto leading-relaxed">
                {isAr
                  ? 'لم ترصد المحادثة الحالية أي حقائق أو أنماط جديدة لم تكن مسجلة مسبقاً. يمكنك الخروج الآن.'
                  : 'This conversation did not introduce new long-term facts or patterns.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <span>
                  {isAr
                    ? `حدد المعلومات التي ترغب في حفظها (${selectedCount} من ${suggestedItems.length}):`
                    : `Select items to retain (${selectedCount} of ${suggestedItems.length}):`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const allSelected = suggestedItems.every((i) => i.selected);
                    setSuggestedItems((prev) => prev.map((item) => ({ ...item, selected: !allSelected })));
                  }}
                  className="text-purple-600 dark:text-purple-400 hover:underline font-medium text-[11px]"
                >
                  {suggestedItems.every((i) => i.selected)
                    ? isAr
                      ? 'إلغاء تحديد الكل'
                      : 'Uncheck all'
                    : isAr
                    ? 'تحديد الكل'
                    : 'Check all'}
                </button>
              </div>

              {/* Suggested memory items list */}
              <div className="space-y-2.5">
                {suggestedItems.map((item, idx) => {
                  const tagInfo = categoryLabels[item.category] || { label: item.category, color: 'bg-stone-100 text-stone-700' };
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleItem(idx)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                        item.selected
                          ? 'border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20'
                          : 'border-stone-200 dark:border-stone-800 bg-stone-50/40 dark:bg-stone-800/30 opacity-60'
                      }`}
                    >
                      <button
                        type="button"
                        className="mt-0.5 text-purple-600 dark:text-purple-400 shrink-0"
                      >
                        {item.selected ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4 text-stone-400" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${tagInfo.color}`}>
                            {tagInfo.label}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-medium">
                            {item.classification === 'fact' ? (isAr ? 'حقيقة' : 'Fact') : (isAr ? 'استنتاج' : 'Inference')}
                          </span>
                        </div>
                        <p className="text-xs text-stone-800 dark:text-stone-200 leading-relaxed font-sans">
                          {item.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Suggested summary update if available */}
              {suggestedSummary && (
                <div
                  onClick={() => setSaveSummaryChecked(!saveSummaryChecked)}
                  className={`mt-4 p-3.5 rounded-2xl border transition cursor-pointer flex items-start gap-3 ${
                    saveSummaryChecked
                      ? 'border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20'
                      : 'border-stone-200 dark:border-stone-800 bg-stone-50/30 opacity-60'
                  }`}
                >
                  <button type="button" className="mt-0.5 text-rose-600 dark:text-rose-400 shrink-0">
                    {saveSummaryChecked ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4 text-stone-400" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 block mb-0.5">
                      {isAr ? 'تحديث الملخص العام للعلاقة:' : 'Update General Summary:'}
                    </span>
                    <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                      {suggestedSummary}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2 shrink-0 bg-stone-50/50 dark:bg-stone-900/50">
          <button
            type="button"
            onClick={onSkipAndExit}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            {isAr ? 'تخطي والخروج الآن' : 'Skip & Exit'}
          </button>

          <button
            type="button"
            onClick={handleConfirmSave}
            disabled={saving || loading || (selectedCount === 0 && !saveSummaryChecked)}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md shadow-purple-600/20 transition active:scale-95 disabled:opacity-40 flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{isAr ? 'جارٍ الحفظ والخروج...' : 'Saving...'}</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>
                  {selectedCount > 0
                    ? isAr
                      ? `حفظ (${selectedCount}) والخروج`
                      : `Save (${selectedCount}) & Exit`
                    : isAr
                    ? 'الخروج'
                    : 'Exit'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
