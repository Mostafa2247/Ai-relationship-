import React, { useState } from 'react';
import { Download, Trash2, FileJson, FileText, AlertTriangle, ShieldCheck, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ConfirmModal } from './ConfirmModal';
import { exportRelationshipData } from '../services/relationshipService';
import type { Relationship } from '../types';

interface ExportSettingsViewProps {
  userId: string;
  relationship: Relationship;
  onDeleteRelationship: () => Promise<void>;
  onOpenEditModal: () => void;
}

export const ExportSettingsView: React.FC<ExportSettingsViewProps> = ({
  userId,
  relationship,
  onDeleteRelationship,
  onOpenEditModal,
}) => {
  const { uiLang } = useTheme();
  const isAr = uiLang === 'ar';

  const [downloadingJson, setDownloadingJson] = useState(false);
  const [downloadingTxt, setDownloadingTxt] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleExportJson = async () => {
    setDownloadingJson(true);
    try {
      const data = await exportRelationshipData(userId, relationship.id);
      const blob = new Blob([data.jsonData], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relationship_${relationship.displayName.replace(/\s+/g, '_')}_${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloadingJson(false);
    }
  };

  const handleExportTxt = async () => {
    setDownloadingTxt(true);
    try {
      const data = await exportRelationshipData(userId, relationship.id);
      const blob = new Blob([data.textData], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report_${relationship.displayName.replace(/\s+/g, '_')}_${Date.now()}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloadingTxt(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDeleteRelationship();
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Export Card */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {isAr ? 'تصدير بيانات وسجلات العلاقة' : 'Export Relationship Data'}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {isAr
                ? 'يمكنك تنزيل نسخة احتياطية كاملة تتضمن كافة المحادثات، عناصر الذاكرة، والأحداث.'
                : 'Download all conversations, memory items, and timeline events in JSON or readable text format.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <button
            onClick={handleExportTxt}
            disabled={downloadingTxt}
            className="flex items-center justify-between p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/50 hover:bg-stone-100 dark:hover:bg-stone-800 transition text-start"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-stone-600 dark:text-stone-400" />
              <div>
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                  {isAr ? 'تقرير نصي منسق (TXT)' : 'Readable Text Report (.txt)'}
                </span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400">
                  {isAr ? 'سهل القراءة والطباعة' : 'Easy to read and print'}
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
              {downloadingTxt ? '...' : isAr ? 'تحميل' : 'Download'}
            </span>
          </button>

          <button
            onClick={handleExportJson}
            disabled={downloadingJson}
            className="flex items-center justify-between p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/50 hover:bg-stone-100 dark:hover:bg-stone-800 transition text-start"
          >
            <div className="flex items-center gap-3">
              <FileJson className="w-6 h-6 text-stone-600 dark:text-stone-400" />
              <div>
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                  {isAr ? 'بيانات برمجية كاملة (JSON)' : 'Raw JSON Data (.json)'}
                </span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400">
                  {isAr ? 'نسخة احتياطية قابلة للنقل' : 'Portable structured data'}
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
              {downloadingJson ? '...' : isAr ? 'تحميل' : 'Download'}
            </span>
          </button>
        </div>
      </div>

      {/* Relationship Settings Card */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {isAr ? 'إعدادات وبيانات العلاقة' : 'Relationship Information'}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {isAr ? 'تعديل الاسم أو نوع العلاقة أو حالتها العامة' : 'Update name, relationship type, or general status'}
            </p>
          </div>
          <button
            onClick={onOpenEditModal}
            className="px-3.5 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            {isAr ? 'تعديل البيانات' : 'Edit Details'}
          </button>
        </div>

        <div className="space-y-2 text-xs text-stone-700 dark:text-stone-300">
          <p>
            <strong>{isAr ? 'الاسم: ' : 'Display Name: '}</strong> {relationship.displayName}
          </p>
          <p>
            <strong>{isAr ? 'النوع: ' : 'Type: '}</strong> {relationship.relationshipType}
          </p>
          <p>
            <strong>{isAr ? 'الحالة: ' : 'Status: '}</strong> {relationship.status || 'نشطة'}
          </p>
          {relationship.contextDescription && (
            <p>
              <strong>{isAr ? 'النبذة: ' : 'Context: '}</strong> {relationship.contextDescription}
            </p>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-6 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
              {isAr ? 'حذف مساحة العلاقة بالكامل' : 'Delete Relationship Workspace'}
            </h3>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
              {isAr
                ? `سيؤدي هذا الإجراء إلى حذف (${relationship.displayName}) نهائياً بما يشمل كافة المحادثات، الرسائل، الذاكرة المحفوظة، الملخصات، ومحطات الخط الزمني من قاعدة البيانات. لا يمكن التراجع عن هذا الإجراء.`
                : `This will permanently delete (${relationship.displayName}) including all conversations, messages, saved memory, summaries, and timeline events from the database.`}
            </p>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition disabled:opacity-50"
              >
                {deleting ? (isAr ? 'جارٍ الحذف...' : 'Deleting...') : isAr ? 'حذف العلاقة وسجلاتها نهائياً' : 'Delete Entire Relationship'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title={isAr ? `تأكيد حذف العلاقة (${relationship.displayName})` : 'Confirm Deletion'}
        message={
          isAr
            ? `أنت على وشك حذف سجل العلاقة مع (${relationship.displayName}) بالكامل. سيتم مسح كافة المحادثات والذاكرة نهائياً.`
            : `You are about to permanently delete (${relationship.displayName}) and all its history.`
        }
        confirmLabel={isAr ? 'نعم، احذف نهائياً' : 'Yes, Delete Permanently'}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};
