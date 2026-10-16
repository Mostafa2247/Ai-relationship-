import React, { useState } from 'react';
import {
  Brain,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Filter,
  RefreshCw,
  X,
  Check,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ConfirmModal } from './ConfirmModal';
import type { Relationship, MemoryItem, MemoryCategory, MemoryClassification, ConfidenceLevel } from '../types';

interface MemoryManagerProps {
  relationship: Relationship;
  memories: MemoryItem[];
  recentChatText?: string;
  onAddMemory: (memory: Omit<MemoryItem, 'id' | 'relationshipId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateMemory: (memId: string, updates: Partial<MemoryItem>) => Promise<void>;
  onDeleteMemory: (memId: string) => Promise<void>;
  onClearAllMemories: () => Promise<void>;
  onUpdateSummary: (newSummary: string) => Promise<void>;
}

export const MemoryManager: React.FC<MemoryManagerProps> = ({
  relationship,
  memories,
  recentChatText,
  onAddMemory,
  onUpdateMemory,
  onDeleteMemory,
  onClearAllMemories,
  onUpdateSummary,
}) => {
  const { uiLang } = useTheme();
  const isAr = uiLang === 'ar';

  const [activeTab, setActiveTab] = useState<'all' | MemoryCategory>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // New Memory Form State
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('fact');
  const [newClassification, setNewClassification] = useState<MemoryClassification>('fact');
  const [newConfidence, setNewConfidence] = useState<ConfidenceLevel>('high');
  const [newSource, setNewSource] = useState('');

  // Editing single item
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<MemoryCategory>('fact');
  const [editClassification, setEditClassification] = useState<MemoryClassification>('fact');
  const [editConfidence, setEditConfidence] = useState<ConfidenceLevel>('moderate');

  // Summary Edit State
  const [summaryText, setSummaryText] = useState(relationship.summary || '');
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [savingSummary, setSavingSummary] = useState(false);

  // AI Extraction State
  const [extracting, setExtracting] = useState(false);
  const [suggestedMemories, setSuggestedMemories] = useState<any[]>([]);
  const [suggestedSummary, setSuggestedSummary] = useState('');

  const categoryLabels: Record<MemoryCategory, { ar: string; en: string; color: string }> = {
    fact: { ar: 'حقائق مؤكدة', en: 'Verified Facts', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' },
    pattern: { ar: 'أنماط ملحوظة', en: 'Observed Patterns', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400' },
    interpretation: { ar: 'استنتاجات وتفسيرات', en: 'Interpretations', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400' },
    preference: { ar: 'تفضيلات وحدود', en: 'Preferences & Boundaries', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400' },
    unresolved: { ar: 'نقاط غير محسومة', en: 'Unresolved Questions', color: 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300' },
  };

  const confidenceLabels: Record<ConfidenceLevel, { ar: string; en: string }> = {
    high: { ar: 'ثقة عالية', en: 'High' },
    moderate: { ar: 'متوسطة', en: 'Moderate' },
    tentative: { ar: 'أولية / قيد الملاحظة', en: 'Tentative' },
    unconfirmed: { ar: 'غير مؤكدة', en: 'Unconfirmed' },
  };

  const filteredMemories = memories.filter((m) => {
    if (activeTab === 'all') return true;
    return m.category === activeTab;
  });

  const handleSaveNewMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    await onAddMemory({
      content: newContent.trim(),
      category: newCategory,
      classification: newClassification,
      confidence: newConfidence,
      sourceReference: newSource.trim(),
    });
    setNewContent('');
    setNewSource('');
    setShowAddModal(false);
  };

  const handleStartEdit = (m: MemoryItem) => {
    setEditingId(m.id);
    setEditContent(m.content);
    setEditCategory(m.category);
    setEditClassification(m.classification);
    setEditConfidence(m.confidence || 'moderate');
  };

  const handleSaveEdit = async (mId: string) => {
    if (!editContent.trim()) return;
    await onUpdateMemory(mId, {
      content: editContent.trim(),
      category: editCategory,
      classification: editClassification,
      confidence: editConfidence,
    });
    setEditingId(null);
  };

  const handleSaveSummary = async () => {
    setSavingSummary(true);
    try {
      await onUpdateSummary(summaryText.trim());
      setIsEditingSummary(false);
    } finally {
      setSavingSummary(false);
    }
  };

  const handleExtractFromChat = async () => {
    setExtracting(true);
    setSuggestedMemories([]);
    setSuggestedSummary('');

    try {
      const res = await fetch('/api/extract-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recentText: recentChatText || relationship.contextDescription || 'تحليل المعلومات الحالية',
          relationship,
        }),
      });

      if (!res.ok) throw new Error('Extraction failed');
      const data = await res.json();
      setSuggestedMemories(data.suggestedMemories || []);
      if (data.suggestedSummary) {
        setSuggestedSummary(data.suggestedSummary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setExtracting(false);
    }
  };

  const handleApproveSuggested = async (item: any, index: number) => {
    await onAddMemory({
      content: item.content,
      category: item.category || 'fact',
      classification: item.classification || 'fact',
      confidence: item.confidence || 'moderate',
      sourceReference: item.sourceReference || 'مستخرج آلياً',
    });
    setSuggestedMemories((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Overview */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {isAr ? 'ذاكرة وسياق العلاقة' : 'Relationship Memory & Context'}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {isAr
                  ? `يتم تزويد الذكاء الاصطناعي بهذه المعلومات لضمان فهم تاريخك مع (${relationship.displayName}) بدقة، ولك مطلق التحكم فيها.`
                  : `Context passed to the AI for this relationship. You have full control over what is kept.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExtractFromChat}
              disabled={extracting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${extracting ? 'animate-spin' : ''}`} />
              <span>{extracting ? (isAr ? 'جارٍ الاستخراج...' : 'Extracting...') : isAr ? 'استخراج معلومات ذكياً' : 'AI Extract Context'}</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'إضافة معلومة' : 'Add Memory'}</span>
            </button>
          </div>
        </div>

        {/* Relationship Summary Box */}
        <div className="mt-5 pt-4 border-t border-stone-100 dark:border-stone-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
              {isAr ? 'الملخص العام المحفوظ للعلاقة:' : 'Relationship Current Summary:'}
            </span>
            {!isEditingSummary ? (
              <button
                onClick={() => setIsEditingSummary(true)}
                className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                <span>{isAr ? 'تعديل الملخص' : 'Edit Summary'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditingSummary(false)}
                  className="text-[11px] text-stone-500 hover:underline"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleSaveSummary}
                  disabled={savingSummary}
                  className="text-[11px] text-emerald-600 font-bold hover:underline"
                >
                  {savingSummary ? '...' : isAr ? 'حفظ' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {isEditingSummary ? (
            <textarea
              rows={3}
              value={summaryText}
              onChange={(e) => setSummaryText(e.target.value)}
              placeholder={isAr ? 'ملخص ديناميكية العلاقة وأهم خطوطها...' : 'Relationship dynamics summary...'}
              className="w-full p-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          ) : (
            <p className="text-xs text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-stone-800/60 p-3 rounded-xl border border-stone-100 dark:border-stone-800 leading-relaxed font-sans">
              {relationship.summary || (
                <span className="text-stone-400 italic">
                  {isAr
                    ? 'لا يوجد ملخص عام محفوظ بعد. يمكنك كتابته يدوياً أو سيتم استنتاجه تدريجياً من المحادثات.'
                    : 'No summary saved yet.'}
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Suggested Memories Banner if available */}
      {suggestedMemories.length > 0 && (
        <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              {isAr
                ? `اقتراحات الذكاء الاصطناعي لإضافتها للذاكرة (${suggestedMemories.length}):`
                : `AI Suggested Memory Items (${suggestedMemories.length}):`}
            </span>
            <button
              onClick={() => setSuggestedMemories([])}
              className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline"
            >
              {isAr ? 'تجاهل الكل' : 'Dismiss All'}
            </button>
          </div>

          <div className="space-y-2">
            {suggestedMemories.map((item, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-stone-900 p-3 rounded-xl border border-purple-100 dark:border-purple-900/50 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300">
                      {categoryLabels[item.category as MemoryCategory]?.ar || item.category}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                      {item.classification === 'fact' ? (isAr ? 'حقيقة' : 'Fact') : (isAr ? 'استنتاج' : 'Inference')}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      ثقة: {confidenceLabels[item.confidence as ConfidenceLevel]?.ar || item.confidence}
                    </span>
                  </div>
                  <p className="text-xs text-stone-800 dark:text-stone-200">{item.content}</p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleApproveSuggested(item, idx)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isAr ? 'اعتماد' : 'Approve'}</span>
                  </button>
                  <button
                    onClick={() => setSuggestedMemories((p) => p.filter((_, i) => i !== idx))}
                    className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs & Total Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              activeTab === 'all'
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-semibold'
                : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-50'
            }`}
          >
            {isAr ? `الكل (${memories.length})` : `All (${memories.length})`}
          </button>
          {(['fact', 'pattern', 'interpretation', 'preference', 'unresolved'] as MemoryCategory[]).map((cat) => {
            const count = memories.filter((m) => m.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                  activeTab === cat
                    ? 'bg-rose-500 text-white font-semibold'
                    : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-50'
                }`}
              >
                {isAr ? categoryLabels[cat].ar : categoryLabels[cat].en} ({count})
              </button>
            );
          })}
        </div>

        {memories.length > 0 && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 self-end sm:self-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isAr ? 'مسح كل الذاكرة' : 'Clear All Memory'}</span>
          </button>
        )}
      </div>

      {/* Memory Items List */}
      {filteredMemories.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 border border-dashed border-stone-300 dark:border-stone-700 rounded-2xl p-8 text-center">
          <Brain className="w-10 h-10 mx-auto text-stone-300 dark:text-stone-600 mb-3" />
          <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300">
            {isAr ? 'لا توجد معلومات محفوظة في هذا القسم' : 'No memories saved in this section'}
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-md mx-auto">
            {isAr
              ? 'يمكنك إضافة معلومات يدوياً كحقائق، أنماط متكررة، أو تفضيلات، أو استخدام زر "استخراج معلومات ذكياً" لقراءتها من المحادثات.'
              : 'Add memories manually or click "AI Extract Context" to extract them from conversations.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredMemories.map((m) => {
            const isEditing = editingId === m.id;
            return (
              <div
                key={m.id}
                className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-xs transition hover:border-stone-300 dark:hover:border-stone-700 flex flex-col justify-between"
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <textarea
                      rows={3}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] text-stone-500 mb-1">القسم</label>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value as MemoryCategory)}
                          className="w-full p-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
                        >
                          <option value="fact">حقيقة مؤكدة</option>
                          <option value="pattern">نمط ملحوظ</option>
                          <option value="interpretation">استنتاج</option>
                          <option value="preference">تفضيل / حد</option>
                          <option value="unresolved">غير محسوم</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-stone-500 mb-1">التصنيف</label>
                        <select
                          value={editClassification}
                          onChange={(e) => setEditClassification(e.target.value as MemoryClassification)}
                          className="w-full p-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
                        >
                          <option value="fact">حقيقة (Fact)</option>
                          <option value="inference">استنتاج (Inference)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 text-xs text-stone-500 hover:bg-stone-100 rounded-lg"
                      >
                        إلغاء
                      </button>
                      <button
                        onClick={() => handleSaveEdit(m.id)}
                        className="px-3 py-1 text-xs font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded-lg"
                      >
                        حفظ
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      {/* Category & Status badges */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                              categoryLabels[m.category]?.color || 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {isAr ? categoryLabels[m.category]?.ar : categoryLabels[m.category]?.en}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-medium">
                            {m.classification === 'fact' ? (isAr ? 'حقيقة' : 'Fact') : (isAr ? 'استنتاج' : 'Inference')}
                          </span>
                          {m.confidence && (
                            <span className="text-[10px] text-stone-400">
                              {confidenceLabels[m.confidence]?.ar || m.confidence}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStartEdit(m)}
                            className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition"
                            title="تعديل"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTargetId(m.id)}
                            className="p-1 rounded-md text-stone-400 hover:text-rose-600 transition"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-stone-800 dark:text-stone-200 leading-relaxed font-sans">
                        {m.content}
                      </p>
                    </div>

                    {m.sourceReference && (
                      <p className="mt-3 pt-2 border-t border-stone-100 dark:border-stone-800/80 text-[10px] text-stone-400 truncate">
                        {isAr ? 'المصدر: ' : 'Source: '} {m.sourceReference}
                      </p>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Memory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {isAr ? 'إضافة معلومة جديدة لذاكرة العلاقة' : 'Add New Memory Item'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewMemory} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  {isAr ? 'نص المعلومة أو النمط السلوكي *' : 'Memory Content *'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder={
                    isAr
                      ? 'اكتب ما تود تذكره بدقة (مثلاً: يفضل التواصل بالرسائل في الصباح، أو يتجنب النقاشات الحادة عند التعب...)'
                      : 'State the fact or pattern clearly...'
                  }
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    {isAr ? 'نوع التصنيف' : 'Category'}
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                    className="w-full p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
                  >
                    <option value="fact">حقيقة مؤكدة (Fact)</option>
                    <option value="pattern">نمط سلوكي ملحوظ (Pattern)</option>
                    <option value="interpretation">استنتاج وتفسير أولي (Interpretation)</option>
                    <option value="preference">تفضيل أو حد شخصي (Preference)</option>
                    <option value="unresolved">نقطة غير محسومة (Unresolved)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    {isAr ? 'حقيقة أم استنتاج؟' : 'Classification'}
                  </label>
                  <select
                    value={newClassification}
                    onChange={(e) => setNewClassification(e.target.value as MemoryClassification)}
                    className="w-full p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
                  >
                    <option value="fact">حقيقة مؤكدة (Fact)</option>
                    <option value="inference">استنتاج / فرضية (Inference)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    {isAr ? 'درجة الثقة' : 'Confidence'}
                  </label>
                  <select
                    value={newConfidence}
                    onChange={(e) => setNewConfidence(e.target.value as ConfidenceLevel)}
                    className="w-full p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
                  >
                    <option value="high">عالية (High)</option>
                    <option value="moderate">متوسطة (Moderate)</option>
                    <option value="tentative">أولية / قيد الملاحظة (Tentative)</option>
                    <option value="unconfirmed">غير مؤكدة (Unconfirmed)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    {isAr ? 'المصدر (اختياري)' : 'Source Reference'}
                  </label>
                  <input
                    type="text"
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    placeholder={isAr ? 'مثال: محادثة الأسبوع الماضي' : 'e.g. Chat from last week'}
                    className="w-full p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
                  />
                </div>
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {isAr ? 'حفظ في الذاكرة' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={showClearConfirm}
        title={isAr ? 'مسح كافة معلومات الذاكرة' : 'Clear All Memory'}
        message={
          isAr
            ? `هل أنت متأكد من مسح جميع عناصر الذاكرة (${memories.length}) الخاصة بـ (${relationship.displayName})؟ هذا الإجراء نهائي ولا يمكن التراجع عنه.`
            : `Are you sure you want to delete all (${memories.length}) memory items for this relationship? This cannot be undone.`
        }
        confirmLabel={isAr ? 'مسح الكل نهائياً' : 'Clear All'}
        onConfirm={async () => {
          await onClearAllMemories();
          setShowClearConfirm(false);
        }}
        onCancel={() => setShowClearConfirm(false)}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTargetId)}
        title={isAr ? 'حذف هذا العنصر من الذاكرة' : 'Delete Memory Item'}
        message={
          isAr
            ? 'هل أنت متأكد من حذف هذه المعلومة؟ لن يعتمد عليها الذكاء الاصطناعي في التحليلات القادمة.'
            : 'Are you sure you want to delete this memory item?'
        }
        confirmLabel={isAr ? 'حذف' : 'Delete'}
        onConfirm={async () => {
          if (deleteTargetId) {
            await onDeleteMemory(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
