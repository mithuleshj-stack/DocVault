import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Shield,
  Clock,
  Eye,
  Lock,
  Download,
  AlertTriangle,
  History,
  Trash2,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { DocumentItem, ShareLink, ShareAccessLog } from '../types';
import { api } from '../services/api';
import { InfoTooltip } from './InfoTooltip';

interface EmergencyShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDocument?: DocumentItem | null;
  allDocuments: DocumentItem[];
  onOpenViewer: (token: string) => void;
}

export const EmergencyShareModal: React.FC<EmergencyShareModalProps> = ({
  isOpen,
  onClose,
  initialDocument,
  allDocuments,
  onOpenViewer,
}) => {
  const [tab, setTab] = useState<'create' | 'active_links'>('create');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(
    initialDocument ? [initialDocument.id] : []
  );

  const [recipientLabel, setRecipientLabel] = useState('Mom');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [durationHours, setDurationHours] = useState<number>(24);
  const [pin, setPin] = useState('');
  const [requirePin, setRequirePin] = useState(false);
  const [maxViews, setMaxViews] = useState<number | ''>('');
  const [allowDownload, setAllowDownload] = useState(false);

  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [accessLogs, setAccessLogs] = useState<ShareAccessLog[]>([]);
  const [createdLinkUrl, setCreatedLinkUrl] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialDocument) {
      setSelectedDocIds([initialDocument.id]);
    }
  }, [initialDocument]);

  useEffect(() => {
    if (isOpen) {
      loadLinks();
    }
  }, [isOpen]);

  const loadLinks = async () => {
    try {
      const data = await api.getShareLinks();
      setShareLinks(data.shareLinks);
      setAccessLogs(data.accessLogs);
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const toggleSelectDoc = (id: string) => {
    if (selectedDocIds.includes(id)) {
      setSelectedDocIds(selectedDocIds.filter((item) => item !== id));
    } else {
      setSelectedDocIds([...selectedDocIds, id]);
    }
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDocIds.length === 0) {
      setErrorMsg('Please select at least one document to share');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.createShareLink({
        documentIds: selectedDocIds,
        recipientLabel: recipientLabel.trim() || 'Family Recipient',
        recipientEmail: recipientEmail.trim() || undefined,
        durationHours: Number(durationHours),
        pin: requirePin && pin ? pin.trim() : undefined,
        maxViews: maxViews !== '' ? Number(maxViews) : undefined,
        allowDownload,
      });

      const fullUrl = `${window.location.origin}/#share=${res.shareLink.token}`;
      setCreatedLinkUrl(fullUrl);
      loadLinks();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create share link');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (window.confirm('Revoke this link immediately? The recipient will lose access right away.')) {
      try {
        await api.revokeShareLink(id);
        loadLinks();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(id);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const getWhatsAppShareUrl = (linkUrl: string) => {
    const text = encodeURIComponent(
      `Hello ${recipientLabel}, here is the secure document link from DocVault: ${linkUrl}`
    );
    return `https://api.whatsapp.com/send?text=${text}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Emergency Share Links
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Safe, time-limited access for family members or doctors
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-6 pt-3 border-b border-slate-100 dark:border-slate-800 flex gap-4 text-xs font-semibold">
          <button
            onClick={() => {
              setTab('create');
              setCreatedLinkUrl(null);
            }}
            className={`pb-2.5 transition-colors ${
              tab === 'create'
                ? 'border-b-2 border-teal-600 text-teal-700 dark:text-teal-400 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Create New Link
          </button>
          <button
            onClick={() => setTab('active_links')}
            className={`pb-2.5 transition-colors relative ${
              tab === 'active_links'
                ? 'border-b-2 border-teal-600 text-teal-700 dark:text-teal-400 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Active Links & Access Logs
            {shareLinks.filter((l) => !l.revokedAt && new Date(l.expiresAt) > new Date()).length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 text-[10px] font-mono">
                {shareLinks.filter((l) => !l.revokedAt && new Date(l.expiresAt) > new Date()).length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {tab === 'create' && (
            <>
              {createdLinkUrl ? (
                <div className="p-6 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-center space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-teal-600 text-white flex items-center justify-center">
                    <Check className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Secure Share Link Created!
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto">
                      Send this link to {recipientLabel}. They can view your watermarked document safely without creating a DocVault account.
                    </p>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-teal-200 dark:border-teal-800 flex items-center justify-between gap-3 text-xs font-mono break-all text-slate-800 dark:text-slate-200">
                    <span className="truncate">{createdLinkUrl}</span>
                    <button
                      onClick={() => handleCopy(createdLinkUrl, 'new')}
                      className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-sans font-semibold rounded-lg shrink-0 flex items-center gap-1.5 transition-colors"
                    >
                      {copiedToken === 'new' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Share Channels */}
                  <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                    <a
                      href={getWhatsAppShareUrl(createdLinkUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Share on WhatsApp</span>
                    </a>

                    <button
                      onClick={() => {
                        const tokenMatch = createdLinkUrl.match(/#share=(.+)$/);
                        if (tokenMatch) {
                          onOpenViewer(tokenMatch[1]);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-teal-800 dark:text-teal-300 bg-teal-100/70 dark:bg-teal-900/40 rounded-xl hover:bg-teal-200/70 transition-colors"
                    >
                      <span>Preview Recipient View</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="pt-2 text-xs text-slate-500">
                    <span>Active for {durationHours} hours</span>
                    {requirePin && <span> · PIN protected</span>}
                    {allowDownload ? <span> · Download allowed</span> : <span> · View only</span>}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateLink} className="space-y-4">
                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-rose-50 text-xs text-rose-800 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Document selection */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Select Documents to Share *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 border border-slate-200 dark:border-slate-800 rounded-xl">
                      {allDocuments.map((doc) => {
                        const selected = selectedDocIds.includes(doc.id);
                        return (
                          <div
                            key={doc.id}
                            onClick={() => toggleSelectDoc(doc.id)}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                              selected
                                ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-500 text-teal-900 dark:text-teal-200 font-semibold'
                                : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="truncate">{doc.title}</span>
                            {selected && <Check className="w-3.5 h-3.5 text-teal-600 shrink-0 ml-1.5" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recipient Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Recipient Name / Label *
                      </label>
                      <input
                        type="text"
                        required
                        value={recipientLabel}
                        onChange={(e) => setRecipientLabel(e.target.value)}
                        placeholder="e.g. Mom, Dr. Sharma, Airline Agent"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Recipient Email (optional)
                      </label>
                      <input
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="recipient@example.com"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Expiry Duration & Views Limit */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        <span>Link Expiry Duration</span>
                        <InfoTooltip content="After this window passes, the link stops resolving immediately. You can also revoke it early at any time." />
                      </label>
                      <select
                        value={durationHours}
                        onChange={(e) => setDurationHours(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      >
                        <option value={1}>1 Hour (Emergency Flash Access)</option>
                        <option value={24}>24 Hours (Standard 1 Day)</option>
                        <option value={72}>3 Days</option>
                        <option value={168}>7 Days (1 Week)</option>
                        <option value={720}>30 Days (1 Month)</option>
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        <span>Max Views Limit (optional)</span>
                        <InfoTooltip content="Self-destructs the share link once it has been opened this many times." />
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={maxViews}
                        onChange={(e) => setMaxViews(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Leave blank for unlimited"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* PIN protection */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-900 dark:text-white">
                        <input
                          type="checkbox"
                          checked={requirePin}
                          onChange={(e) => setRequirePin(e.target.checked)}
                          className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                        />
                        <span>Protect with Access PIN</span>
                        <InfoTooltip content="Requires the recipient to enter this 4-digit code before viewing any document contents." />
                      </label>
                      <Lock className="w-4 h-4 text-slate-400" />
                    </div>

                    {requirePin && (
                      <div className="pt-2">
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          4-Digit Security PIN
                        </label>
                        <input
                          type="password"
                          maxLength={6}
                          value={pin}
                          onChange={(e) => setPin(e.target.value)}
                          placeholder="e.g. 4821"
                          className="w-36 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono tracking-widest text-center"
                        />
                      </div>
                    )}
                  </div>

                  {/* Allow Download toggle */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white">
                          Allow File Download
                        </span>
                        <InfoTooltip content="When switched off, the recipient can view the document in their browser but cannot download raw files." />
                      </div>
                      <span className="text-[11px] text-slate-500">
                        When disabled, the recipient can only preview the watermarked document
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowDownload}
                        onChange={(e) => setAllowDownload(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                    </label>
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-xs text-slate-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || selectedDocIds.length === 0}
                      className="px-6 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow transition-colors disabled:opacity-50"
                    >
                      Generate Share Link
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {tab === 'active_links' && (
            <div className="space-y-6">
              {shareLinks.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No share links generated yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {shareLinks.map((link) => {
                    const isRevoked = !!link.revokedAt;
                    const isExpired = new Date() > new Date(link.expiresAt);
                    const isActive = !isRevoked && !isExpired && !link.isLocked;

                    return (
                      <div
                        key={link.id}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {link.recipientLabel}
                            </span>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {link.documentIds.length} Document{link.documentIds.length === 1 ? '' : 's'} ·{' '}
                              {link.viewCount} view{link.viewCount === 1 ? '' : 's'}
                              {link.maxViews ? ` (max ${link.maxViews})` : ''}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isActive ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                Active
                              </span>
                            ) : isRevoked ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                Revoked
                              </span>
                            ) : link.isLocked ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                                Locked (5 wrong PINs)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                                Expired
                              </span>
                            )}

                            {isActive && (
                              <button
                                onClick={() => handleRevoke(link.id)}
                                title="Revoke link immediately"
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                          <span className="font-mono">
                            Expires {new Date(link.expiresAt).toLocaleString()}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                onOpenViewer(link.token);
                              }}
                              className="text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1 font-medium"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Open
                            </button>
                            <button
                              onClick={() =>
                                handleCopy(`${window.location.origin}/#share=${link.token}`, link.id)
                              }
                              className="text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1 font-medium"
                            >
                              <Copy className="w-3 h-3" />
                              {copiedToken === link.id ? 'Copied' : 'Copy Link'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Access Audit Trail */}
              {accessLogs.length > 0 && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    <History className="w-3.5 h-3.5" />
                    <span>Access Logs</span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {accessLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between"
                      >
                        <div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {log.device}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">
                            {new Date(log.accessedAt).toLocaleTimeString()}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                              log.result === 'SUCCESS'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {log.result === 'SUCCESS' ? 'Opened' : log.result}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
