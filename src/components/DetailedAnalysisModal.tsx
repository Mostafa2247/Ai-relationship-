import React, { useState } from 'react';
import { X, Sparkles, Copy, Check, FileText, Send, AlertCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { FormattedMessage } from './FormattedMessage';
import type { Relationship, MemoryItem } from '../types';

interface DetailedAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  relationship: Relationship;
  memories: MemoryItem[];
  initialText?: string;
}

export const DetailedAnalysisModal: React.FC<DetailedAnalysisModalProps> = ({
  isOpen,
  onClose,
  relationship,
  memories,
  initialText = '',
}) => {
  const { uiLang, aiLang } = useTheme();
  const isAr = uiLang === 'ar';

  const [inputSituation, setInputSituation] = useState(initialText);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleRunAnalysis = async () => {
    if (!inputSituation.trim()) {
      setError(isAr ? 'يرجى كتابة الموقف أو لصق المحادثة أولاً.' : 'Please enter the situation or paste conversation.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/detailed-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputSituation.trim(),
          relationship,
          memories,
          preferredLanguage: aiLang,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Server error during analysis');
      }

      const data = await res.json();
      setAnalysisResult(data.analysis || '');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || (isAr ? 'فشل إتمام التحليل المفصل' : 'Analysis failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!analysisResult) return;
    navigator.clipboard.writeText(analysisResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] transition-all">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {isAr ? 'التحليل التفصيلي القائم على الأدلة' : 'Evidence-Based Detailed Analysis'}
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                {isAr
                  ? `تحليل موضوعي لموقف في العلاقة مع (${relationship.displayName}) بمحايدة تامة وبدون تكهن`
                  : `Objective, non-speculative analysis for relationship with (${relationship.displayName})`}
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Input Area */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              {isAr ? 'الموقف أو نص المحادثة المراد تحليلها:' : 'Situation or Pasted Conversation:'}
            </label>
            <textarea
              rows={4}
              value={inputSituation}
              onChange={(e) => setInputSituation(e.target.value)}
              placeholder={
                isAr
                  ? 'اكتب تفاصيل الموقف بدقة، أو الصق المحادثة التي دارت بينكما كما هي...'
                  : 'Describe the situation or paste the exact conversation messages...'
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition leading-relaxed resize-none"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-stone-400 dark:text-stone-500">
                {isAr
                  ? `التحليل يستند أيضاً إلى (${memories.length}) معلومة محفوظة في الذاكرة.`
                  : `Analysis is also grounded on (${memories.length}) saved memories.`}
              </span>
              <button
                type="button"
                onClick={handleRunAnalysis}
                disabled={loading || !inputSituation.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{isAr ? 'جارٍ التحليل...' : 'Analyzing...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isAr ? 'بدء التحليل المفصل' : 'Generate Analysis'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Area */}
          {analysisResult && (
            <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  {isAr ? 'تقرير التحليل المبني على الأدلة:' : 'Evidence-Based Analysis Report:'}
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">{isAr ? 'تم النسخ' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{isAr ? 'نسخ التقرير' : 'Copy'}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed font-sans">
                <FormattedMessage content={analysisResult} isAssistant={true} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-100 dark:border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
