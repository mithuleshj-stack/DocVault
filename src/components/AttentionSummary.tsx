import React from 'react';
import { AlertCircle, Clock, CheckCircle2, Shield, Plus, Share2, Printer } from 'lucide-react';
import { DocumentItem } from '../types';

interface AttentionSummaryProps {
  documents: DocumentItem[];
  onFilterChange: (status: 'all' | 'expired' | 'attention' | 'valid') => void;
  activeFilter: string;
  userName?: string;
  onOpenAddModal: () => void;
  onOpenShareModal: () => void;
}

export const AttentionSummary: React.FC<AttentionSummaryProps> = ({
  documents,
  onFilterChange,
  activeFilter,
  userName = 'Mithilesh',
  onOpenAddModal,
  onOpenShareModal,
}) => {
  const now = new Date().getTime();

  let expiredCount = 0;
  let within30Count = 0;
  let within60Count = 0;
  let validCount = 0;

  documents.forEach((doc) => {
    if (doc.noExpiry || !doc.expiryDate) {
      validCount++;
      return;
    }
    const expiryTime = new Date(doc.expiryDate).getTime();
    const diffDays = Math.ceil((expiryTime - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      expiredCount++;
    } else if (diffDays <= 30) {
      within30Count++;
    } else if (diffDays <= 60) {
      within60Count++;
    } else {
      validCount++;
    }
  });

  const urgentCount = expiredCount + within30Count;

  return (
    <div className="w-full mb-8">
      {/* Editorial Wallet Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-semibold text-teal-400 tracking-wide uppercase block mb-1">
              Personal Document Wallet
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white text-balance">
              {documents.length === 0
                ? `Welcome to your Document Wallet, ${userName}`
                : urgentCount > 0
                ? `${urgentCount} document${urgentCount === 1 ? '' : 's'} require renewal attention`
                : 'All documents in your wallet are currently up to date'}
            </h1>
            <p className="mt-2 text-sm text-slate-300 max-w-xl leading-relaxed">
              {documents.length === 0
                ? 'Store, track, and protect your IDs, vehicle documents, passports, and warranties with zero-knowledge encryption.'
                : urgentCount > 0
                ? `You have ${expiredCount > 0 ? `${expiredCount} expired` : ''}${
                    expiredCount > 0 && within30Count > 0 ? ' and ' : ''
                  }${within30Count > 0 ? `${within30Count} expiring within 30 days` : ''}. Review checklists below to renew on time.`
                : 'Your passports, driving licences, policies, and warranties are monitored with advance reminders.'}
            </p>
          </div>

          {/* Key Quick Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onOpenShareModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl transition-all"
            >
              <Share2 className="w-4 h-4 text-teal-400" />
              <span>Emergency Share</span>
            </button>
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-xl shadow transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Scan Document</span>
            </button>
          </div>
        </div>

        {/* Interactive Segmented Filter Tabs (Zero-Pill Discipline) */}
        <div className="mt-8 pt-5 border-t border-slate-800 flex flex-wrap items-center gap-2">
          <button
            onClick={() => onFilterChange('all')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-xl transition-colors ${
              activeFilter === 'all'
                ? 'bg-white text-slate-900 font-bold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            All Documents ({documents.length})
          </button>

          <button
            onClick={() => onFilterChange('attention')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-xl transition-colors ${
              activeFilter === 'attention'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Expiring Soon ({within30Count})</span>
          </button>

          <button
            onClick={() => onFilterChange('expired')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-xl transition-colors ${
              activeFilter === 'expired'
                ? 'bg-rose-500 text-white font-bold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Expired ({expiredCount})</span>
          </button>

          <button
            onClick={() => onFilterChange('valid')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-xl transition-colors ${
              activeFilter === 'valid'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Up to Date ({validCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
