import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Download,
  AlertCircle,
  Clock,
  ArrowLeft,
  FileText,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';

interface PublicShareViewerProps {
  token: string;
  onExit: () => void;
}

export const PublicShareViewer: React.FC<PublicShareViewerProps> = ({ token, onExit }) => {
  const [pin, setPin] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [pinRequired, setPinRequired] = useState(false);
  const [recipientLabel, setRecipientLabel] = useState('');

  const loadDocument = async (enteredPin?: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.accessPublicShare(token, enteredPin);
      if (res.status === 'PIN_REQUIRED') {
        setPinRequired(true);
        setRecipientLabel(res.recipientLabel || 'Family Recipient');
      } else if (res.status === 'AUTHORIZED') {
        setPinRequired(false);
        setData(res);
      } else if (res.status === 'PIN_INVALID') {
        setErrorMsg(res.error || 'Incorrect PIN');
      } else {
        setErrorMsg(res.error || 'This link is no longer available');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to open shared document.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocument();
  }, [token]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;
    loadDocument(pin);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Banner */}
      <header className="h-16 px-4 sm:px-8 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center text-white">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-white block">DocVault</span>
            <span className="text-[10px] text-teal-400 font-mono">Secure Emergency Access</span>
          </div>
        </div>

        <button
          onClick={onExit}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Return to My Vault
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 flex flex-col items-center justify-center">
        {loading ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-mono">Decrypting emergency link...</p>
          </div>
        ) : pinRequired ? (
          /* PIN Challenge */
          <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-3xl p-8 text-center shadow-2xl space-y-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-950 text-teal-400 flex items-center justify-center border border-teal-800">
              <Lock className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">PIN Protected Document</h2>
              <p className="text-xs text-slate-400 mt-1">
                This document was shared with <strong className="text-slate-200">{recipientLabel}</strong>. Please enter the 4-digit access PIN provided by the owner.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <input
                type="password"
                maxLength={6}
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="• • • •"
                className="w-48 mx-auto px-4 py-3 text-center text-xl tracking-[0.5em] font-mono rounded-2xl bg-slate-900 border border-slate-600 text-white focus:outline-none focus:border-teal-500"
              />

              <button
                type="submit"
                disabled={!pin}
                className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl shadow-lg transition-colors disabled:opacity-40"
              >
                Unlock Document
              </button>
            </form>
          </div>
        ) : errorMsg ? (
          /* Expired / Revoked / Locked State */
          <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-3xl p-8 text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-950 text-rose-400 flex items-center justify-center border border-rose-800">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-white">This link is no longer available</h2>
            <p className="text-xs text-slate-400 leading-relaxed">{errorMsg}</p>
            <p className="text-[11px] text-slate-500">
              Emergency links expire automatically, when the view limit is reached, or when revoked by the owner for privacy.
            </p>
          </div>
        ) : data ? (
          /* Authorized Watermarked View */
          <div className="w-full space-y-6">
            {/* Watermark Banner */}
            <div className="p-3.5 rounded-2xl bg-teal-950/60 border border-teal-800/80 flex items-center justify-between text-xs text-teal-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span>{data.watermarkText}</span>
              </div>
              <span className="font-mono text-[11px] text-teal-400">Read-Only</span>
            </div>

            {/* Document list */}
            {data.documents.map((doc: any) => (
              <div
                key={doc.id}
                className="bg-slate-800/90 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl"
              >
                {/* Card Header */}
                <div className="p-6 border-b border-slate-700/80 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-teal-400 uppercase tracking-wider block">
                      {doc.documentType.replace('_', ' ')}
                    </span>
                    <h3 className="text-xl font-bold text-white mt-0.5">{doc.title}</h3>
                  </div>

                  {data.allowDownload && doc.fileData && (
                    <a
                      href={doc.fileData}
                      download={doc.fileName || `${doc.title}.jpg`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </a>
                  )}
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-slate-900/50 border-b border-slate-700/80 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Cardholder</span>
                    <span className="font-semibold text-white">{doc.holderName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Document No.</span>
                    <span className="font-mono font-semibold text-white">{doc.documentNumber || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Expiry Date</span>
                    <span className="font-mono font-semibold text-amber-400">
                      {doc.noExpiry ? 'Lifetime Validity' : doc.expiryDate || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Issuer</span>
                    <span className="text-white truncate block">{doc.issuer || '—'}</span>
                  </div>
                </div>

                {/* Document Preview with Security Watermark Overlay */}
                {doc.fileData && (
                  <div className="relative bg-black p-6 flex items-center justify-center min-h-[360px] overflow-hidden">
                    <img
                      src={doc.fileData}
                      alt={doc.title}
                      className="max-h-[500px] object-contain rounded-lg shadow-lg relative z-0"
                    />

                    {/* Watermark Diagonal Text Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex flex-col justify-around rotate-[-25deg] opacity-20 select-none z-10 text-white font-mono text-sm uppercase font-bold tracking-widest text-center">
                      <div>EMERGENCY ACCESS ONLY · DOCVAULT VERIFIED</div>
                      <div>SHARED WITH {data.recipientLabel} · TIME LIMITED</div>
                      <div>EMERGENCY ACCESS ONLY · DOCVAULT VERIFIED</div>
                    </div>
                  </div>
                )}

                {doc.notes && (
                  <div className="p-4 bg-slate-900/30 text-xs text-slate-300 border-t border-slate-700/80">
                    <strong className="text-slate-200">Notes from Owner: </strong>
                    {doc.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </main>
    </div>
  );
};
