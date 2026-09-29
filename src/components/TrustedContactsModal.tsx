import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  UserPlus,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Mail,
  HeartHandshake,
} from 'lucide-react';
import { TrustedContact } from '../types';
import { api } from '../services/api';
import { InfoTooltip } from './InfoTooltip';

interface TrustedContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TrustedContactsModal: React.FC<TrustedContactsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('Family');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadContacts();
    }
  }, [isOpen]);

  const loadContacts = async () => {
    try {
      const data = await api.getTrustedContacts();
      setContacts(data.contacts);
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setLoading(true);
    setErrorMsg('');
    try {
      await api.addTrustedContact({ name, email, relationship });
      setName('');
      setEmail('');
      loadContacts();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add contact');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async (id: string) => {
    try {
      await api.simulateContactRequest(id);
      loadContacts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRespond = async (id: string, action: 'APPROVE' | 'DENY') => {
    try {
      await api.respondContactRequest(id, action);
      loadContacts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Trusted Family Contacts</span>
                <InfoTooltip content="Trusted contacts can request access in emergencies if you cannot unlock your wallet yourself." />
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Designated contacts with 24-hour review window
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

        {/* Reassuring Context Banner */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
          <HeartHandshake className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            In an emergency, designated family members can request access to your essential documents. You receive an immediate alert and have <strong>24 hours</strong> to approve or deny the request before access opens automatically.
          </p>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Contact List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Trusted Contacts ({contacts.length})
            </h3>

            {contacts.map((contact, idx) => (
              <div
                key={contact.id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Realistic Avatar for primary contact */}
                    {idx === 0 ? (
                      <img
                        src="/src/assets/images/emergency_contact_avatar_1790659020229.jpg"
                        alt={contact.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-xs"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center text-xs">
                        {contact.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {contact.name}
                      </h4>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {contact.relationship} · {contact.email}
                      </span>
                    </div>
                  </div>

                  {contact.requestStatus === 'PENDING' ? (
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-900 animate-pulse">
                      Pending Review (24h)
                    </span>
                  ) : contact.requestStatus === 'APPROVED' ? (
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-900">
                      Access Granted
                    </span>
                  ) : contact.requestStatus === 'DENIED' ? (
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-100 text-rose-900">
                      Access Denied
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      Standby
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  {contact.requestStatus === 'PENDING' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRespond(contact.id, 'APPROVE')}
                        className="px-3 py-1 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
                      >
                        Approve Now
                      </button>
                      <button
                        onClick={() => handleRespond(contact.id, 'DENY')}
                        className="px-3 py-1 text-xs font-semibold text-rose-800 bg-rose-100 hover:bg-rose-200 rounded-lg transition-colors"
                      >
                        Deny
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRequestAccess(contact.id)}
                      className="text-teal-700 dark:text-teal-400 hover:underline text-xs font-medium"
                    >
                      Trigger Emergency Access Request &rarr;
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Contact Form */}
          <form onSubmit={handleAddContact} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-teal-600" />
              <span>Add Family Contact</span>
              <InfoTooltip content="Add a spouse, parent, adult child, or primary physician who might need access in urgent situations." />
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <input
                type="email"
                required
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <input
                type="text"
                placeholder="Relation (e.g. Mother, Spouse)"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors disabled:opacity-50"
              >
                Add Contact
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
