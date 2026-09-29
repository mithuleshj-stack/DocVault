import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  Car,
  ShieldCheck,
  Zap,
  CreditCard,
  HeartPulse,
  Eye,
  EyeOff,
  Share2,
  RefreshCw,
  Folder,
  AlertCircle,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  Trash2,
} from 'lucide-react';
import { DocumentItem, DocumentType } from '../types';

interface DocumentCardProps {
  document: DocumentItem;
  onOpenDetail: (doc: DocumentItem) => void;
  onOpenShare: (doc: DocumentItem) => void;
  onOpenRenew: (doc: DocumentItem) => void;
  onDelete: (id: string) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onOpenDetail,
  onOpenShare,
  onOpenRenew,
  onDelete,
}) => {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Expiry calculation
  const now = new Date().getTime();
  let status: 'expired' | 'orange' | 'yellow' | 'green' | 'lifetime' = 'green';
  let countdownText = 'Valid';
  let daysDiff = 0;

  if (document.noExpiry || !document.expiryDate) {
    status = 'lifetime';
    countdownText = 'Permanent validity';
  } else {
    const expiryTime = new Date(document.expiryDate).getTime();
    daysDiff = Math.ceil((expiryTime - now) / (1000 * 60 * 60 * 24));

    if (daysDiff < 0) {
      status = 'expired';
      const absDays = Math.abs(daysDiff);
      countdownText = `Expired ${absDays} day${absDays === 1 ? '' : 's'} ago`;
    } else if (daysDiff === 0) {
      status = 'orange';
      countdownText = 'Expires today';
    } else if (daysDiff <= 30) {
      status = 'orange';
      countdownText = `Expires in ${daysDiff} day${daysDiff === 1 ? '' : 's'}`;
    } else if (daysDiff <= 60) {
      status = 'yellow';
      countdownText = `Expires in ${daysDiff} days`;
    } else if (daysDiff < 365) {
      status = 'green';
      countdownText = `Expires in ${Math.round(daysDiff / 30)} months`;
    } else {
      status = 'green';
      const years = (daysDiff / 365).toFixed(1).replace('.0', '');
      countdownText = `Valid for ${years} years`;
    }
  }

  // Type metadata
  const getTypeMeta = (type: DocumentType) => {
    switch (type) {
      case 'passport':
        return { icon: FileText, label: 'Passport', accent: 'text-indigo-600 dark:text-indigo-400' };
      case 'driving_licence':
        return { icon: Car, label: 'Driving Licence', accent: 'text-emerald-700 dark:text-emerald-400' };
      case 'insurance':
        return { icon: ShieldCheck, label: 'Insurance Policy', accent: 'text-teal-700 dark:text-teal-400' };
      case 'warranty':
        return { icon: Zap, label: 'Warranty Card', accent: 'text-amber-700 dark:text-amber-400' };
      case 'id_card':
        return { icon: CreditCard, label: 'National ID / PAN', accent: 'text-blue-700 dark:text-blue-400' };
      case 'vehicle_rc':
        return { icon: Car, label: 'Vehicle RC', accent: 'text-cyan-700 dark:text-cyan-400' };
      case 'medical':
        return { icon: HeartPulse, label: 'Medical Document', accent: 'text-rose-700 dark:text-rose-400' };
      default:
        return { icon: FileText, label: 'Personal Document', accent: 'text-slate-700 dark:text-slate-300' };
    }
  };

  const typeMeta = getTypeMeta(document.documentType);
  const TypeIcon = typeMeta.icon;

  const formatDocumentNumber = (num: string | null) => {
    if (!num) return '—';
    if (revealed) return num;
    if (num.length <= 4) return num;
    const lastFour = num.slice(-4);
    return `•••• ${lastFour}`;
  };

  const handleCopyNumber = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!document.documentNumber) return;
    navigator.clipboard.writeText(document.documentNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Status visual text with WCAG AA compliance (Zero-pill discipline)
  const getStatusElement = () => {
    switch (status) {
      case 'expired':
        return (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="font-mono tabular-nums">{countdownText}</span>
          </span>
        );
      case 'orange':
        return (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="font-mono tabular-nums">{countdownText}</span>
          </span>
        );
      case 'yellow':
        return (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-yellow-400">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="font-mono tabular-nums">{countdownText}</span>
          </span>
        );
      case 'green':
        return (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="font-mono tabular-nums">{countdownText}</span>
          </span>
        );
      case 'lifetime':
      default:
        return (
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>{countdownText}</span>
          </span>
        );
    }
  };

  return (
    <motion.article
      onClick={() => onOpenDetail(document)}
      whileHover={{ scale: 1.018, y: -2 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="group cursor-pointer bg-white/95 dark:bg-slate-900/90 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden hover:border-teal-500/50 dark:hover:border-teal-500/50 shadow-xs hover:shadow-xl hover:shadow-teal-950/8 transition-colors flex flex-col justify-between"
    >
      <div>
        {/* Real Document Sleeve Thumbnail (if file uploaded) */}
        {document.fileData ? (
          <div className="relative h-32 w-full bg-slate-950 overflow-hidden border-b border-slate-100 dark:border-slate-800">
            <img
              src={document.fileData}
              alt={document.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center opacity-90 group-hover:scale-105 transition-transform duration-300"
            />
            {/* Soft gradient vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
            <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-center justify-between text-white text-xs">
              <span className="font-medium text-slate-200 flex items-center gap-1.5">
                <TypeIcon className="w-3.5 h-3.5" />
                {typeMeta.label}
              </span>
              <span className="font-mono text-[11px] text-slate-300">
                {document.issuer || 'Official Document'}
              </span>
            </div>
          </div>
        ) : (
          /* Subtle clean header slot when no image exists */
          <div className="px-5 pt-4 pb-1 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <TypeIcon className={`w-4 h-4 ${typeMeta.accent}`} />
              {typeMeta.label}
            </span>
            <span>{document.issuer || 'Personal Vault'}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 pt-3.5">
          {/* Status line */}
          <div className="flex items-center justify-between mb-2">
            {getStatusElement()}
            {document.folder && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                <Folder className="w-3 h-3 text-slate-400" />
                {document.folder}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
            {document.title}
          </h3>

          {/* Document Number with Reveal & Copy */}
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-lg px-2.5 py-1">
              <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                {formatDocumentNumber(document.documentNumber)}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setRevealed(!revealed);
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-0.5"
                title={revealed ? 'Hide document number' : 'Reveal document number'}
              >
                {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            {document.documentNumber && (
              <button
                type="button"
                onClick={handleCopyNumber}
                className="p-1.5 text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Copy document number to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          {/* Unboxed Metadata Line with Clean Separators */}
          <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            {document.holderName && (
              <>
                <span className="truncate max-w-[130px] font-medium text-slate-700 dark:text-slate-300">
                  {document.holderName}
                </span>
                <span aria-hidden="true">·</span>
              </>
            )}
            {document.expiryDate ? (
              <span className="font-mono tabular-nums">
                Due {new Date(document.expiryDate).toLocaleDateString()}
              </span>
            ) : (
              <span>No Expiry</span>
            )}
            {document.versions && document.versions.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[11px] text-teal-700 dark:text-teal-400 font-medium">
                  {document.versions.length} renewal{document.versions.length === 1 ? '' : 's'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700 dark:text-slate-300 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
          View Dossier &rarr;
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenRenew(document);
            }}
            title="Mark as Renewed"
            className="p-1.5 text-slate-500 hover:text-teal-700 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenShare(document);
            }}
            title="Create Emergency Share Link"
            className="p-1.5 text-slate-500 hover:text-teal-700 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete "${document.title}" from your wallet?`)) {
                onDelete(document.id);
              }
            }}
            title="Delete Document"
            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.article>
  );
};
