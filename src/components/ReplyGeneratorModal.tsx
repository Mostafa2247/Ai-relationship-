import React, { useState } from 'react';
import { X, Send, Copy, Check, MessageSquare, AlertCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import type { Relationship, ReplyOption, ReplyResponse } from '../types';

interface ReplyGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  relationship: Relationship;
  initialMessage?: string;
}

export const ReplyGeneratorModal: React.FC<ReplyGeneratorModalProps> = ({
  isOpen,
  onClose,
  relationship,
  initialMessage = '',
}) => {
  const { uiLang } = useTheme();
  const isAr = uiLang === 'ar';

  const [receivedMessage, setReceivedMessage] = useState(initialMessage);
  const [goal, setGoal] = useState('');
  const [selectedTone, setSelectedTone] = useState<string>('طبيعي وودي');
  const [loading, setLoading] = useState(false);
  const [responseResult, setResponseResult] = useState<ReplyResponse | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const tones = [
    { id: 'طبيعي وودي', labelAr: 'طبيعي وودي', labelEn: 'Casual & Natural', descAr: 'عفوي وبدون تكلف، مناسب للمواقف العادية' },
    { id: 'دافئ ومهتم', labelAr: 'دافئ ومهتم', labelEn: 'Warm & Caring', descAr: 'يُظهر الاهتمام والتقدير والمودة' },
    { id: 'صريح ومباشر', labelAr: 'صريح ومباشر', labelEn: 'Direct & Clear', descAr: 'يوصل الفكرة بوضوح تام بدون لف أو دوران' },
    { id: 'هادئ وواضع حدود', labelAr: 'هادئ وواضع حدود', labelEn: 'Calm & Boundary-Setting', descAr: 'يحفظ كرامتك ويضع خطاً واضحاً باحترام' },
    { id: 'تصالحي ومُصلح', labelAr: 'تصالحي ومُصلح', labelEn: 'Reconciliatory', descAr: 'يبادر بحل الخلاف وتقريب وجهات النظر' },
    { id: 'قصير ومحايد', labelAr: 'قصير ومحايد', labelEn: 'Short & Neutral', descAr: 'مقتضب ومتزن ولا يفتح نقاشاً مطولاً' },
  ];

  const handleGenerate = async () => {
    if (!receivedMessage.trim() && !goal.trim()) {
      setError(isAr ? 'يرجى كتابة الرسالة المستلمة أو الهدف من الرد.' : 'Please provide the received message or goal.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receivedMessage: receivedMessage.trim(),
          goal: goal.trim(),
          desiredTone: selectedTone,
          relationship,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate replies from server');
      }

      const data: ReplyResponse = await res.json();
      setResponseResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || (isAr ? 'فشل توليد الردود' : 'Failed to generate replies'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] transition-all">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {isAr ? 'صياغة ردود جاهزة للإرسال' : 'Ready-to-Send Reply Generator'}
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                {isAr
                  ? `اقتراح صياغات مصرية طبيعية للرد على (${relationship.displayName}) بدون ألاعيب نفسية`
                  : `Natural Egyptian Arabic replies for (${relationship.displayName}) without manipulation`}
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

        {/* Form & Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              {isAr ? 'الرسالة التي وصلتك من الطرف الآخر (أو الموقف):' : 'Received message or situation:'}
            </label>
            <textarea
              rows={2}
              value={receivedMessage}
              onChange={(e) => setReceivedMessage(e.target.value)}
              placeholder={isAr ? 'مثال: "تمام براحتك مش فارقة معايا..."' : 'e.g. Received message...'}
              className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              {isAr ? 'إيه اللي عايز توصله بالظبط؟ (هدفك من الرد):' : 'What is your goal with this reply?'}
            </label>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder={
                isAr
                  ? 'مثال: عايز أوضح إني مش متجاهله بس كنت مشغول، أو عايز أوقف الكلام باحترام'
                  : 'e.g. Clarify misunderstanding, set a boundary respectfully...'
              }
              className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
              {isAr ? 'اختر النبرة المطلوبة:' : 'Select Desired Tone:'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {tones.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setSelectedTone(t.id)}
                  className={`p-2.5 rounded-xl border text-start transition ${
                    selectedTone === t.id
                      ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 ring-1 ring-amber-500/30'
                      : 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/50 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  <p
                    className={`text-xs font-bold ${
                      selectedTone === t.id ? 'text-amber-800 dark:text-amber-300' : 'text-stone-800 dark:text-stone-200'
                    }`}
                  >
                    {isAr ? t.labelAr : t.labelEn}
                  </p>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1">{t.descAr}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-medium text-xs shadow-md shadow-rose-500/20 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{isAr ? 'جارٍ صياغة الردود...' : 'Drafting options...'}</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{isAr ? 'توليد خيارات الرد' : 'Generate Options'}</span>
                </>
              )}
            </button>
          </div>

          {/* Render Options */}
          {responseResult && (
            <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-800 space-y-3">
              <h3 className="text-xs font-bold text-stone-800 dark:text-stone-200">
                {isAr ? 'خيارات الرد المقترحة (اختر الأنسب لشخصيتك):' : 'Suggested Reply Options:'}
              </h3>

              {responseResult.options?.map((opt, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/70 dark:bg-stone-800/50 hover:border-amber-400 dark:hover:border-amber-600 transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                      {opt.title || `الخيار ${idx + 1}`}
                    </span>
                    <button
                      onClick={() => handleCopy(opt.text, idx)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-650 transition"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">
                            {isAr ? 'تم النسخ' : 'Copied'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="text-[11px]">{isAr ? 'نسخ النص' : 'Copy'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-xs sm:text-sm font-medium text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-900 p-2.5 rounded-lg border border-stone-100 dark:border-stone-800 leading-relaxed font-sans select-all">
                    "{opt.text}"
                  </p>

                  <div className="mt-2 text-[11px] text-stone-500 dark:text-stone-400 flex flex-col gap-0.5">
                    <span>
                      <strong className="text-stone-700 dark:text-stone-300">
                        {isAr ? 'تحليل النبرة: ' : 'Tone note: '}
                      </strong>
                      {opt.toneExplanation}
                    </span>
                    <span>
                      <strong className="text-stone-700 dark:text-stone-300">
                        {isAr ? 'أنسب وقت: ' : 'Best for: '}
                      </strong>
                      {opt.bestFor}
                    </span>
                  </div>
                </div>
              ))}

              {responseResult.advice && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                  <strong>{isAr ? 'نصيحة قبل الإرسال: ' : 'Friendly advice: '}</strong>
                  {responseResult.advice}
                </div>
              )}
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
