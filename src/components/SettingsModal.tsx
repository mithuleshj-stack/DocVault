import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Shield,
  Key,
  Lock,
  Printer,
  Download,
  Trash2,
  Bell,
  Sun,
  Moon,
  Check,
  AlertTriangle,
  Smartphone,
  User,
  Save,
} from 'lucide-react';
import { UserProfile, NotificationSettings } from '../types';
import { api } from '../services/api';
import { generatePrintableRecoveryKey } from '../services/crypto';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { InfoTooltip } from './InfoTooltip';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onUserUpdated: (user: UserProfile) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onAccountDeleted: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserUpdated,
  darkMode,
  setDarkMode,
  onAccountDeleted,
}) => {
  // Profile state
  const [name, setName] = useState(user?.name || 'Mithilesh Joshi');
  const [email, setEmail] = useState(user?.email || 'mithuleshj@gmail.com');
  const [savingProfile, setSavingProfile] = useState(false);

  // PIN state
  const [pinInput, setPinInput] = useState('');
  const [pinEnabled, setPinEnabled] = useState(user?.pinEnabled || false);
  const [recoveryKey, setRecoveryKey] = useState<string>('');
  const [confirmDeleteText, setConfirmDeleteText] = useState('');
  const [exporting, setExporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Notification preferences
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    emailAlerts: true,
    browserPush: true,
    inAppAlerts: true,
    reminderDays: [60, 30, 7, 0],
  });

  const { isInstallable, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (user) {
        setName(user.name);
        setEmail(user.email);
        setPinEnabled(user.pinEnabled);
      }
      loadSettings();
      if (!recoveryKey) {
        setRecoveryKey(generatePrintableRecoveryKey());
      }
    }
  }, [isOpen, user]);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      if (data.settings) setNotifSettings(data.settings);
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setStatusMsg('');
    setErrorMsg('');
    try {
      const res = await api.updateProfile({ name, email });
      onUserUpdated(res.user);
      setStatusMsg('Profile details updated successfully');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle PIN toggle
  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setStatusMsg('');

    try {
      if (pinEnabled) {
        if (!pinInput || pinInput.length < 4 || pinInput.length > 6) {
          setErrorMsg('PIN must be 4 to 6 digits');
          return;
        }
        await api.setAppLockPin(pinInput, true);
        setStatusMsg('App-Lock PIN successfully saved');
        setPinInput('');
      } else {
        await api.setAppLockPin('', false);
        setStatusMsg('App-Lock PIN disabled');
      }

      if (user) {
        onUserUpdated({ ...user, pinEnabled });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update PIN');
    }
  };

  // Toggle notification preference
  const handleToggleChannel = async (key: keyof NotificationSettings, value: any) => {
    const updated = { ...notifSettings, [key]: value };
    setNotifSettings(updated);
    try {
      await api.updateSettings(updated);
    } catch (err) {
      console.error(err);
    }
  };

  // Export full ZIP
  const handleExportZip = async () => {
    setExporting(true);
    try {
      window.location.href = '/api/export';
      setStatusMsg('Document backup downloaded successfully');
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (confirmDeleteText !== 'DELETE') {
      setErrorMsg('Please type DELETE to confirm');
      return;
    }

    try {
      await api.deleteAccount('DELETE');
      onAccountDeleted();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete account');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Wallet Settings & Security
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Manage your profile, PIN, reminders, and offline recovery key
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {statusMsg && (
            <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-800 dark:text-teal-200 flex items-center gap-2">
              <Check className="w-4 h-4 text-teal-600 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* USER PROFILE */}
          <form onSubmit={handleSaveProfile} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-teal-600" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Personal Profile
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Profile</span>
              </button>
            </div>
          </form>

          {/* MASTER RECOVERY KEY */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>Master Recovery Key</span>
                  <InfoTooltip content="Your emergency physical key. Because documents are encrypted with zero-knowledge keys, this is the only fail-safe to restore your wallet if you forget your PIN." />
                </h3>
              </div>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Physical Backup
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Your documents are encrypted client-side with AES-256. If you forget your device PIN, this physical recovery key is the only way to decrypt your files. Keep a printed copy with your passport or in your locker.
            </p>

            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-xs font-bold tracking-wider text-center text-teal-800 dark:text-teal-300 border border-slate-200 dark:border-slate-700 select-all">
              {recoveryKey}
            </div>
          </div>

          {/* APP-LOCK PIN */}
          <form onSubmit={handleSavePin} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>App-Lock PIN</span>
                  <InfoTooltip content="Locks the wallet screen whenever your browser is idle or closed, preventing unauthorized local access." />
                </h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={pinEnabled}
                  onChange={(e) => setPinEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Require a 4–6 digit security PIN whenever opening or unlocking your document wallet.
            </p>

            {pinEnabled && (
              <div className="pt-2 flex items-center gap-3">
                <input
                  type="password"
                  maxLength={6}
                  placeholder="Set 4-6 digit PIN"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-44 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono tracking-widest text-center"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl"
                >
                  Save PIN
                </button>
              </div>
            )}
          </form>

          {/* ALERT CHANNELS */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-teal-600" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Notification Delivery
              </h3>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <span>In-App Alert Notifications</span>
                <input
                  type="checkbox"
                  checked={notifSettings.inAppAlerts}
                  onChange={(e) => handleToggleChannel('inAppAlerts', e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
              </label>
              <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <span>Browser Push Notifications (Mobile & Desktop)</span>
                <input
                  type="checkbox"
                  checked={notifSettings.browserPush}
                  onChange={(e) => handleToggleChannel('browserPush', e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
              </label>
              <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <span>Email Expiry Digests to {email}</span>
                <input
                  type="checkbox"
                  checked={notifSettings.emailAlerts}
                  onChange={(e) => handleToggleChannel('emailAlerts', e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
              </label>
            </div>
          </div>

          {/* PWA & APPEARANCE */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Appearance & App Install
                </h3>
                <span className="text-[11px] text-slate-500">
                  Toggle dark mode or install DocVault to your home screen
                </span>
              </div>

              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>

            {isInstallable ? (
              <button
                onClick={install}
                className="w-full py-2.5 text-xs font-bold text-teal-900 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:text-teal-200 rounded-xl flex items-center justify-center gap-2 border border-teal-200 dark:border-teal-800"
              >
                <Smartphone className="w-4 h-4" />
                Install DocVault on Device
              </button>
            ) : isIOS ? (
              <div>
                <button
                  onClick={() => setShowIOSGuide(!showIOSGuide)}
                  className="w-full py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  How to install on iPhone or iPad
                </button>
                {showIOSGuide && (
                  <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    <div>1. Tap the <strong>Share</strong> button in Safari toolbar.</div>
                    <div>2. Scroll down and tap <strong>Add to Home Screen</strong>.</div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* EXPORT DATA */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Full Vault Export (ZIP)
              </h3>
              <span className="text-[11px] text-slate-500">
                Download a complete ZIP package with all documents and manifest data
              </span>
            </div>
            <button
              onClick={handleExportZip}
              disabled={exporting}
              className="px-4 py-2 text-xs font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 rounded-xl transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5 inline mr-1.5" />
              {exporting ? 'Exporting...' : 'Export All'}
            </button>
          </div>

          {/* DELETE ACCOUNT */}
          <div className="p-5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 space-y-3">
            <h3 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Vault Account</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Permanently delete all stored documents, renewal history, and encryption keys.
            </p>

            <div className="pt-1 flex items-center gap-3">
              <input
                type="text"
                placeholder='Type "DELETE" to confirm'
                value={confirmDeleteText}
                onChange={(e) => setConfirmDeleteText(e.target.value)}
                className="w-48 px-3 py-1.5 text-xs rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
              />
              <button
                onClick={handleDeleteAccount}
                disabled={confirmDeleteText !== 'DELETE'}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-40 transition-colors"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
