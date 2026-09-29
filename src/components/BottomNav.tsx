import React from 'react';
import { Shield, Share2, Users, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAddModal: () => void;
  onOpenEmergencyShare: () => void;
  onOpenTrustedContacts: () => void;
  onOpenSettings: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenEmergencyShare,
  onOpenTrustedContacts,
  onOpenSettings,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe shadow-lg">
      <div className="grid grid-cols-4 items-center h-16 max-w-lg mx-auto px-2">
        {/* Tab 1: Vault */}
        <button
          onClick={() => setActiveTab('vault')}
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'vault'
              ? 'text-teal-700 dark:text-teal-400 font-semibold'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <Shield className="w-5 h-5" />
          <span className="text-[11px] font-medium tracking-tight mt-1">Vault</span>
        </button>

        {/* Tab 2: Emergency Share */}
        <button
          onClick={() => onOpenEmergencyShare()}
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'share'
              ? 'text-teal-700 dark:text-teal-400 font-semibold'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <Share2 className="w-5 h-5" />
          <span className="text-[11px] font-medium tracking-tight mt-1">Share</span>
        </button>

        {/* Tab 3: Trusted Contacts */}
        <button
          onClick={() => onOpenTrustedContacts()}
          className="flex flex-col items-center justify-center py-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 transition-colors"
        >
          <Users className="w-5 h-5" />
          <span className="text-[11px] font-medium tracking-tight mt-1">Contacts</span>
        </button>

        {/* Tab 4: Settings */}
        <button
          onClick={() => onOpenSettings()}
          className="flex flex-col items-center justify-center py-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 transition-colors"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[11px] font-medium tracking-tight mt-1">Settings</span>
        </button>
      </div>
    </nav>
  );
};
