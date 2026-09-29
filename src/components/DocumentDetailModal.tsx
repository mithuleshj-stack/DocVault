import React, { useState } from 'react';
import {
  X,
  Calendar,
  Lock,
  Share2,
  Trash2,
  RefreshCw,
  Plus,
  Check,
  Download,
  AlertCircle,
  Clock,
  History,
  Edit2,
  Save,
  CheckCircle2,
  Printer,
  Copy,
  Folder,
} from 'lucide-react';
import { DocumentItem, ChecklistItem } from '../types';
import { api } from '../services/api';

interface DocumentDetailModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDocumentUpdated: (doc: DocumentItem) => void;
  onDocumentDeleted: (id: string) => void;
  onOpenShare: (doc: DocumentItem) => void;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document,
  isOpen,
  onClose,
  onDocumentUpdated,
  onDocumentDeleted,
  onOpenShare,
}) => {
  if (!isOpen || !document) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);

  // Edit form state
  const [title, setTitle] = useState(document.title);
  const [holderName, setHolderName] = useState(document.holderName || '');
  const [documentNumber, setDocumentNumber] = useState(document.documentNumber || '');
  const [expiryDate, setExpiryDate] = useState(document.expiryDate || '');
  const [noExpiry, setNoExpiry] = useState(document.noExpiry);
  const [issuer, setIssuer] = useState(document.issuer || '');
  const [folder, setFolder] = useState(document.folder || 'Personal');
  const [notes, setNotes] = useState(document.notes || '');

  // Checklist state
  const [checklist, setChecklist] = useState<ChecklistItem[]>(document.checklist || []);
  const [newTaskText, setNewTaskText] = useState('');

  // Renew state
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [newDocumentNumber, setNewDocumentNumber] = useState(document.documentNumber || '');
  const [renewalNotes, setRenewalNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Toggle checklist item
  const handleToggleChecklist = async (id: string) => {
    const updatedChecklist = checklist.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setChecklist(updatedChecklist);
    try {
      const res = await api.updateDocument(document.id, { checklist: updatedChecklist });
      onDocumentUpdated(res.document);
    } catch (err) {
      console.error(err);
    }
  };

  // Add checklist item
  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const newItem: ChecklistItem = {
      id: 'task_' + Date.now(),
      task: newTaskText.trim(),
      completed: false,
    };
    const updatedChecklist = [...checklist, newItem];
    setChecklist(updatedChecklist);
    setNewTaskText('');

    try {
      const res = await api.updateDocument(document.id, { checklist: updatedChecklist });
      onDocumentUpdated(res.document);
    } catch (err) {
      console.error(err);
    }
  };

  // Save edits
  const handleSaveEdits = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.updateDocument(document.id, {
        title,
        holderName: holderName.trim() || null,
        documentNumber: documentNumber.trim() || null,
        expiryDate: noExpiry ? null : expiryDate || null,
        noExpiry,
        issuer: issuer.trim() || null,
        folder,
        notes,
      });
      onDocumentUpdated(res.document);
      setIsEditing(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  // Handle Mark as Renewed
  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpiryDate) {
      setErrorMsg('Please select a new expiry date');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.renewDocument(document.id, {
        newExpiryDate,
        newDocumentNumber: newDocumentNumber || undefined,
        renewalNotes: renewalNotes || undefined,
      });
      onDocumentUpdated(res.document);
      setShowRenewModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to renew document');
    } finally {
      setLoading(false);
    }
  };

  // Copy number
  const handleCopyNumber = () => {
    if (!document.documentNumber) return;
    navigator.clipboard.writeText(document.documentNumber);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  // Delete document
  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to permanently delete "${document.title}" from your wallet?`)) {
      try {
        await api.deleteDocument(document.id);
        onDocumentDeleted(document.id);
        onClose();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Expiry status
  const now = new Date().getTime();
  let daysDiff = 0;
  if (!document.noExpiry && document.expiryDate) {
    const expiryTime = new Date(document.expiryDate).getTime();
    daysDiff = Math.ceil((expiryTime - now) / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 capitalize">
              {document.documentType.replace('_', ' ')}
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white truncate max-w-md">
              {document.title}
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onOpenShare(document)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="Create Emergency Share Link"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="Edit Fields"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Expiry Banner */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
              document.noExpiry
                ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                : daysDiff < 0
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50'
                : daysDiff <= 30
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50'
                : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-slate-700 dark:text-slate-300 shrink-0" />
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {document.noExpiry
                    ? 'Permanent Validity (No Expiry Date)'
                    : daysDiff < 0
                    ? `Expired on ${new Date(document.expiryDate || '').toLocaleDateString()} (${Math.abs(daysDiff)} days ago)`
                    : `Valid until ${new Date(document.expiryDate || '').toLocaleDateString()} (${daysDiff} days remaining)`}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {document.versions.length > 0 &&
                    `Previously renewed ${document.versions.length} time${document.versions.length === 1 ? '' : 's'} · History preserved`}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowRenewModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-teal-800 dark:text-teal-200 bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 rounded-xl shadow-xs hover:bg-teal-50 dark:hover:bg-slate-750 transition-colors shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Mark as Renewed
            </button>
          </div>

          {/* Edit Form or Metadata Dossier */}
          {isEditing ? (
            <div className="space-y-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Edit Document Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cardholder / Insured
                  </label>
                  <input
                    type="text"
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Document Number
                  </label>
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    disabled={noExpiry}
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono disabled:opacity-40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdits}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Document Number</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {document.documentNumber || '—'}
                  </span>
                  {document.documentNumber && (
                    <button
                      onClick={handleCopyNumber}
                      title="Copy number"
                      className="text-slate-400 hover:text-teal-600 p-0.5"
                    >
                      {copiedNumber ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Cardholder</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {document.holderName || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Issue Date</span>
                <span className="font-mono text-slate-900 dark:text-white">
                  {document.issueDate ? new Date(document.issueDate).toLocaleDateString() : '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Issuer</span>
                <span className="font-medium text-slate-900 dark:text-white truncate block">
                  {document.issuer || '—'}
                </span>
              </div>
            </div>
          )}

          {/* Notes Card */}
          {document.notes && !isEditing && (
            <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200">
              <strong className="block mb-1 text-amber-800 dark:text-amber-300">Renewal Notes & Tips:</strong>
              <p className="leading-relaxed">{document.notes}</p>
            </div>
          )}

          {/* Renewal Checklist */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Renewal Steps & Verification
              </h3>
              <span className="text-[11px] font-mono text-slate-500">
                {checklist.filter((c) => c.completed).length}/{checklist.length} Completed
              </span>
            </div>

            <div className="space-y-2">
              {checklist.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer text-xs transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleToggleChecklist(item.id)}
                    className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                  />
                  <span
                    className={
                      item.completed
                        ? 'line-through text-slate-400 dark:text-slate-500'
                        : 'text-slate-800 dark:text-slate-200 font-medium'
                    }
                  >
                    {item.task}
                  </span>
                </label>
              ))}
            </div>

            <form onSubmit={handleAddChecklist} className="pt-2 flex items-center gap-2">
              <input
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder="Add step (e.g., Download Form 1-A, Pay ₹400 RTO fee)..."
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-semibold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 rounded-xl hover:bg-teal-100 transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5 inline mr-1" />
                Add Step
              </button>
            </form>
          </div>

          {/* Document Preview (if uploaded) */}
          {document.fileData && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Original Document Image
                </span>
                <a
                  href={document.fileData}
                  download={document.fileName || 'document.jpg'}
                  className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-400 hover:underline font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download File
                </a>
              </div>
              <div className="relative bg-slate-950 rounded-2xl overflow-hidden p-4 flex items-center justify-center max-h-[380px]">
                <img
                  src={document.fileData}
                  alt={document.title}
                  referrerPolicy="no-referrer"
                  className="max-h-[340px] object-contain rounded-lg shadow"
                />
              </div>
            </div>
          )}

          {/* Historical Version Archive */}
          {document.versions && document.versions.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-teal-700 transition-colors"
              >
                <History className="w-4 h-4" />
                <span>Renewal History Log ({document.versions.length})</span>
              </button>

              {showHistory && (
                <div className="mt-3 space-y-2.5">
                  {document.versions.map((ver) => (
                    <div
                      key={ver.version}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          Version {ver.version} · Expired on {ver.expiryDate || 'N/A'}
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Renewed on {new Date(ver.renewedAt).toLocaleDateString()}
                          {ver.notes ? ` · "${ver.notes}"` : ''}
                        </div>
                      </div>
                      <span className="font-mono text-slate-400 text-[11px]">Archived</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Delete Action */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Registered on {new Date(document.createdAt).toLocaleDateString()}
            </span>
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 p-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Remove Document
            </button>
          </div>
        </div>

        {/* Renew Modal Overlay */}
        {showRenewModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Mark Document as Renewed
                  </h3>
                </div>
                <button
                  onClick={() => setShowRenewModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your current document record will be cleanly archived in your renewal history timeline.
              </p>

              <form onSubmit={handleRenewSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    New Expiry Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    New Document Number (if reissued or booklet renewed)
                  </label>
                  <input
                    type="text"
                    value={newDocumentNumber}
                    onChange={(e) => setNewDocumentNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Renewal Notes
                  </label>
                  <input
                    type="text"
                    value={renewalNotes}
                    onChange={(e) => setRenewalNotes(e.target.value)}
                    placeholder="e.g. 10-year validity renewed online via portal"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRenewModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl"
                  >
                    Confirm Renewal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
