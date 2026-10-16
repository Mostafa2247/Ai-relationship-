import React, { useState, useEffect } from 'react';
import {
  Heart,
  Users,
  Sparkles,
  Plus,
  Search,
  MessageSquare,
  Brain,
  Calendar,
  ArrowLeft,
  ArrowRight,
  MoreVertical,
  Trash2,
  Edit2,
  FolderOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { CreateRelationshipModal } from './CreateRelationshipModal';
import { EditRelationshipModal } from './EditRelationshipModal';
import { ConfirmModal } from './ConfirmModal';
import { getRelationships, createRelationship, updateRelationship, deleteRelationship } from '../services/relationshipService';
import type { Relationship, RelationshipType } from '../types';

interface DashboardProps {
  onSelectRelationship: (relationship: Relationship) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectRelationship }) => {
  const { user, profile } = useAuth();
  const { uiLang } = useTheme();
  const isAr = uiLang === 'ar';

  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | RelationshipType>('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRel, setEditingRel] = useState<Relationship | null>(null);
  const [deleteRelTarget, setDeleteRelTarget] = useState<Relationship | null>(null);

  useEffect(() => {
    if (user) {
      loadRelationships();
    }
  }, [user]);

  const loadRelationships = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await getRelationships(user.uid);
      setRelationships(list);
    } catch (e) {
      console.error('Failed to load relationships:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: {
    displayName: string;
    relationshipType: RelationshipType;
    status: string;
    contextDescription: string;
  }) => {
    if (!user) return;
    const created = await createRelationship(user.uid, data);
    setRelationships((prev) => [created, ...prev]);
    onSelectRelationship(created);
  };

  const handleUpdate = async (updates: Partial<Relationship>) => {
    if (!user || !editingRel) return;
    await updateRelationship(user.uid, editingRel.id, updates);
    setRelationships((prev) =>
      prev.map((r) => (r.id === editingRel.id ? { ...r, ...updates } : r))
    );
    setEditingRel(null);
  };

  const handleDelete = async () => {
    if (!user || !deleteRelTarget) return;
    await deleteRelationship(user.uid, deleteRelTarget.id);
    setRelationships((prev) => prev.filter((r) => r.id !== deleteRelTarget.id));
    setDeleteRelTarget(null);
  };

  const filtered = relationships.filter((r) => {
    const matchesSearch =
      r.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.contextDescription && r.contextDescription.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || r.relationshipType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-stone-900 via-stone-850 to-stone-900 dark:from-stone-900 dark:to-stone-950 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xl border border-stone-850">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold mb-3 border border-rose-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAr ? 'رفيقك المصري الذكي والواعي عاطفياً' : 'Your Candid Emotional Intelligence Companion'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {isAr
              ? `أهلاً بيك يا ${profile?.displayName || 'صديقي'}!`
              : `Welcome, ${profile?.displayName || 'Friend'}!`}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-stone-300 leading-relaxed">
            {isAr
              ? 'هنا مساحتك الآمنة لتحليل العلاقات الإنسانية والعاطفية بموضوعية وبناءً على الأدلة والوقائع فقط. بدون تملق، بدون تشخيصات وهمية، وباحترام كامل لحدودك واستقلاليتك.'
              : 'Your evidence-based companion for romantic and interpersonal dynamics. Candid, perceptive, and strictly isolated per relationship.'}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-semibold text-xs sm:text-sm shadow-md shadow-rose-500/25 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'علاقة جديدة' : 'New Relationship'}</span>
            </button>

            <div className="text-xs text-stone-400 flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-800/60 border border-stone-700/60">
              <Brain className="w-4 h-4 text-purple-400" />
              <span>
                {isAr
                  ? `${relationships.length} علاقات مسجلة بمساحات مستقلة`
                  : `${relationships.length} isolated workspaces`}
              </span>
            </div>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -end-10 -bottom-10 w-72 h-72 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Type tabs */}
        <div className="flex rounded-xl bg-stone-100 dark:bg-stone-800 p-1">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              filterType === 'all'
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            {isAr ? 'الكل' : 'All'}
          </button>
          <button
            onClick={() => setFilterType('romantic')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
              filterType === 'romantic'
                ? 'bg-white dark:bg-stone-700 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Heart className="w-3 h-3 text-rose-500" />
            <span>{isAr ? 'عاطفية' : 'Romantic'}</span>
          </button>
          <button
            onClick={() => setFilterType('friendship')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
              filterType === 'friendship'
                ? 'bg-white dark:bg-stone-700 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Users className="w-3 h-3 text-amber-500" />
            <span>{isAr ? 'صداقة' : 'Friendship'}</span>
          </button>
          <button
            onClick={() => setFilterType('other')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
              filterType === 'other'
                ? 'bg-white dark:bg-stone-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Sparkles className="w-3 h-3 text-indigo-500" />
            <span>{isAr ? 'أخرى' : 'Other'}</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-stone-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isAr ? 'بحث بالاسم أو النبذة...' : 'Search relationships...'}
            className="w-full ps-9 pe-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </div>
      </div>

      {/* Relationships Grid or Empty State */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 mx-auto border-3 border-rose-500/30 border-t-rose-500 rounded-full animate-spin mb-3" />
          <p className="text-xs text-stone-500">{isAr ? 'جارٍ تحميل علاقاتك...' : 'Loading relationships...'}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 border border-dashed border-stone-300 dark:border-stone-800 rounded-3xl p-10 text-center max-w-2xl mx-auto shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
            <Heart className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
            {isAr ? 'لا توجد علاقات مسجلة بعد' : 'No relationships yet'}
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-2 max-w-md mx-auto leading-relaxed">
            {isAr
              ? 'ابدأ بإضافة أول شخص تود فهم طبيعة العلاقة معه (سواء كانت شريك حياة، خطيب، صديق مقرب، أو زميل). كل علاقة ستحصل على ذاكرة معزولة ومحادثات خاصة بها.'
              : 'Add your first relationship to start analyzing communication patterns, saving memories, and getting grounded insights.'}
          </p>

          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-medium text-xs shadow-md shadow-rose-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'إضافة أول علاقة الآن' : 'Add First Relationship'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((rel) => {
            const isRomantic = rel.relationshipType === 'romantic';
            const isFriendship = rel.relationshipType === 'friendship';

            return (
              <div
                key={rel.id}
                onClick={() => onSelectRelationship(rel)}
                className="group bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-rose-300 dark:hover:border-rose-900/60 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-xs ${
                          isRomantic
                            ? 'bg-gradient-to-tr from-rose-500 to-pink-500'
                            : isFriendship
                            ? 'bg-gradient-to-tr from-amber-500 to-orange-500'
                            : 'bg-gradient-to-tr from-indigo-500 to-purple-500'
                        }`}
                      >
                        {isRomantic ? (
                          <Heart className="w-5 h-5" />
                        ) : isFriendship ? (
                          <Users className="w-5 h-5" />
                        ) : (
                          <Sparkles className="w-5 h-5" />
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                          {rel.displayName}
                        </h3>
                        <span className="text-[11px] text-stone-400 font-medium">
                          {isRomantic
                            ? isAr
                              ? 'علاقة عاطفية'
                              : 'Romantic'
                            : isFriendship
                            ? isAr
                              ? 'صداقة'
                              : 'Friendship'
                            : isAr
                            ? 'أخرى'
                            : 'Other'}
                        </span>
                      </div>
                    </div>

                    {rel.status && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-medium">
                        {rel.status}
                      </span>
                    )}
                  </div>

                  {rel.summary ? (
                    <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-2 leading-relaxed bg-stone-50 dark:bg-stone-800/40 p-2.5 rounded-xl border border-stone-100 dark:border-stone-800">
                      {rel.summary}
                    </p>
                  ) : rel.contextDescription ? (
                    <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
                      {rel.contextDescription}
                    </p>
                  ) : (
                    <p className="text-[11px] text-stone-400 italic">
                      {isAr ? 'اضغط لفتح مساحة التحليل وبدء المحادثة...' : 'Click to open analysis workspace...'}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-stone-400">
                    {new Date(rel.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingRel(rel);
                      }}
                      className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition"
                      title={isAr ? 'تعديل' : 'Edit'}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteRelTarget(rel);
                      }}
                      className="p-1 rounded-lg text-stone-400 hover:text-rose-600 transition"
                      title={isAr ? 'حذف' : 'Delete'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-0.5 ms-1 group-hover:translate-x-[-2px] rtl:group-hover:translate-x-[2px] transition-transform">
                      <span>{isAr ? 'فتح' : 'Open'}</span>
                      {isAr ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <CreateRelationshipModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
      />

      {/* Edit Modal */}
      {editingRel && (
        <EditRelationshipModal
          isOpen={Boolean(editingRel)}
          relationship={editingRel}
          onClose={() => setEditingRel(null)}
          onSubmit={handleUpdate}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteRelTarget)}
        title={isAr ? `تأكيد حذف العلاقة (${deleteRelTarget?.displayName})` : 'Confirm Deletion'}
        message={
          isAr
            ? `هل أنت متأكد من رغبتك في حذف مساحة العلاقة مع (${deleteRelTarget?.displayName}) نهائياً؟ سيتم مسح كافة المحادثات والذاكرة والخط الزمني المرتبط بها.`
            : `Are you sure you want to delete (${deleteRelTarget?.displayName})? All conversations and memories will be permanently removed.`
        }
        confirmLabel={isAr ? 'نعم، احذف نهائياً' : 'Yes, Delete'}
        onConfirm={handleDelete}
        onCancel={() => setDeleteRelTarget(null)}
      />
    </div>
  );
};
