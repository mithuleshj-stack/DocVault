import React from 'react';
import { Plus, Shield, Download, Lock } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface HeaderProps {
  onOpenAddModal: () => void;
  onOpenSettings: () => void;
  onOpenEmergencyShare: () => void;
  onOpenTrustedContacts: () => void;
  onLockVault: () => void;
  pinEnabled: boolean;
  activeNavTab: string;
  setActiveNavTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAddModal,
  onOpenSettings,
  onOpenEmergencyShare,
  onOpenTrustedContacts,
  onLockVault,
  pinEnabled,
  activeNavTab,
  setActiveNavTab,
}) => {
  const { isInstallable, install } = usePWAInstall();

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand wordmark */}
        <button
          onClick={() => setActiveNavTab('vault')}
          className="flex items-center gap-2.5 text-left group focus:outline-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-700 to-teal-500 flex items-center justify-center shadow-sm text-white shrink-0 group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5 text-teal-100" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            DocVault
          </span>
        </button>

        {/* Clean humanized navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            onClick={() => setActiveNavTab('vault')}
            className={`transition-colors hover:text-teal-700 dark:hover:text-teal-400 ${
              activeNavTab === 'vault' ? 'text-teal-700 dark:text-teal-400 font-semibold' : ''
            }`}
          >
            My Vault
          </button>
          <button
            onClick={() => onOpenEmergencyShare()}
            className={`transition-colors hover:text-teal-700 dark:hover:text-teal-400 ${
              activeNavTab === 'share' ? 'text-teal-700 dark:text-teal-400 font-semibold' : ''
            }`}
          >
            Emergency Share
          </button>
          <button
            onClick={() => onOpenTrustedContacts()}
            className="transition-colors hover:text-teal-700 dark:hover:text-teal-400"
          >
            Trusted Contacts
          </button>
          <button
            onClick={() => onOpenSettings()}
            className="transition-colors hover:text-teal-700 dark:hover:text-teal-400"
          >
            Security & Backup
          </button>
        </nav>

        {/* Primary actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* PWA Install Button if available */}
          {isInstallable && (
            <button
              onClick={install}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 rounded-xl hover:bg-teal-100 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Install App
            </button>
          )}

          {/* Quick Lock Button if PIN enabled */}
          {pinEnabled && (
            <button
              onClick={onLockVault}
              title="Lock Vault"
              aria-label="Lock Vault"
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Lock className="w-5 h-5 text-slate-500" />
            </button>
          )}

          {/* Primary Action Button */}
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 rounded-xl shadow-sm hover:shadow active:scale-[0.98] transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Document</span>
          </button>
        </div>
      </div>
    </header>
  );
};
