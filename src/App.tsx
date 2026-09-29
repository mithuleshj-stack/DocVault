import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  Folder,
  Shield,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle2,
  Sparkles,
  Lock,
  Share2,
  Camera,
  Zap,
} from 'lucide-react';
import { DocumentItem, UserProfile, NotificationItem } from './types';
import { api } from './services/api';

// Components
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { AttentionSummary } from './components/AttentionSummary';
import { DocumentCard } from './components/DocumentCard';
import { AddDocumentModal } from './components/AddDocumentModal';
import { DocumentDetailModal } from './components/DocumentDetailModal';
import { EmergencyShareModal } from './components/EmergencyShareModal';
import { PublicShareViewer } from './components/PublicShareViewer';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { TrustedContactsModal } from './components/TrustedContactsModal';
import { SettingsModal } from './components/SettingsModal';
import { AppLockScreen } from './components/AppLockScreen';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  // Check if viewing a public emergency share link
  const [publicShareToken, setPublicShareToken] = useState<string | null>(null);

  // App Lock state
  const [isLocked, setIsLocked] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  // Vault data
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigation & Modals
  const [activeNavTab, setActiveNavTab] = useState<string>('vault');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isQuickScanActive, setIsQuickScanActive] = useState(false);
  const [selectedDocForDetail, setSelectedDocForDetail] = useState<DocumentItem | null>(null);

  const triggerQuickScan = () => {
    setIsQuickScanActive(true);
    setIsAddModalOpen(true);
  };
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedDocForShare, setSelectedDocForShare] = useState<DocumentItem | null>(null);
  const [isNotifCenterOpen, setIsNotifCenterOpen] = useState(false);
  const [isTrustedOpen, setIsTrustedOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingSlide, setOnboardingSlide] = useState(0);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'expired' | 'attention' | 'valid'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [folderFilter, setFolderFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'soonest' | 'latest' | 'alpha'>('soonest');
  const [darkMode, setDarkMode] = useState(false);

  // Check URL hash for public share links
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      const match = hash.match(/#share=(.+)$/);
      if (match) {
        setPublicShareToken(match[1]);
      } else {
        setPublicShareToken(null);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Initialize data
  useEffect(() => {
    initApp();

    // Check if onboarding was completed
    const onboarded = localStorage.getItem('docvault_onboarded');
    if (!onboarded) {
      setShowOnboarding(true);
    }
  }, []);

  const initApp = async () => {
    setLoading(true);
    try {
      const [userRes, docRes, notifRes] = await Promise.all([
        api.getMe(),
        api.getDocuments(),
        api.getNotifications(),
      ]);

      setUser(userRes.user);
      setDocuments(docRes.documents);
      setNotifications(notifRes.notifications);

      if (userRes.user?.pinEnabled) {
        setIsLocked(true);
      }
    } catch (err) {
      console.error('Failed to initialize app data:', err);
    } finally {
      setLoading(false);
    }
  };

  const reloadDocuments = async () => {
    try {
      const res = await api.getDocuments();
      setDocuments(res.documents);
      const notifRes = await api.getNotifications();
      setNotifications(notifRes.notifications);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      await api.deleteDocument(id);
      await reloadDocuments();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  // If viewing a public share link, render the PublicShareViewer
  if (publicShareToken) {
    return (
      <PublicShareViewer
        token={publicShareToken}
        onExit={() => {
          window.location.hash = '';
          setPublicShareToken(null);
        }}
      />
    );
  }

  // If vault is locked with PIN
  if (isLocked) {
    return (
      <AppLockScreen
        onUnlock={() => setIsLocked(false)}
        userEmail={user?.email}
      />
    );
  }

  const unreadNotifCount = notifications.filter((n) => n.status === 'UNREAD').length;

  // Filter & Sort Documents
  const now = new Date().getTime();

  const filteredDocuments = documents
    .filter((doc) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = doc.title.toLowerCase().includes(q);
        const matchesHolder = doc.holderName?.toLowerCase().includes(q);
        const matchesNumber = doc.documentNumber?.toLowerCase().includes(q);
        const matchesIssuer = doc.issuer?.toLowerCase().includes(q);
        const matchesTags = doc.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesHolder && !matchesNumber && !matchesIssuer && !matchesTags) {
          return false;
        }
      }

      // Type Filter
      if (typeFilter !== 'all' && doc.documentType !== typeFilter) {
        return false;
      }

      // Folder Filter
      if (folderFilter !== 'all' && doc.folder !== folderFilter) {
        return false;
      }

      // Status Filter
      if (statusFilter !== 'all') {
        if (doc.noExpiry || !doc.expiryDate) {
          return statusFilter === 'valid';
        }
        const expiryTime = new Date(doc.expiryDate).getTime();
        const diffDays = Math.ceil((expiryTime - now) / (1000 * 60 * 60 * 24));

        if (statusFilter === 'expired') return diffDays < 0;
        if (statusFilter === 'attention') return diffDays >= 0 && diffDays <= 30;
        if (statusFilter === 'valid') return diffDays > 30;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'alpha') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'latest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      // Soonest expiry: expired first, then ascending expiry dates, lifetime at the end
      if (a.noExpiry && !b.noExpiry) return 1;
      if (!a.noExpiry && b.noExpiry) return -1;
      if (a.noExpiry && b.noExpiry) return 0;
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
    });

  // Unique folders list
  const folders = ['all', ...Array.from(new Set(documents.map((d) => d.folder).filter(Boolean)))];

  return (
    <div
      className={`min-h-screen ${
        darkMode
          ? 'dark bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50'
          : 'bg-gradient-to-b from-slate-50 via-teal-50/20 to-slate-100/70 text-slate-900'
      } flex flex-col transition-colors duration-300`}
    >
      {/* Top Header */}
      <Header
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenEmergencyShare={() => {
          setSelectedDocForShare(null);
          setIsShareModalOpen(true);
        }}
        onOpenTrustedContacts={() => setIsTrustedOpen(true)}
        onLockVault={() => setIsLocked(true)}
        pinEnabled={!!user?.pinEnabled}
        activeNavTab={activeNavTab}
        setActiveNavTab={setActiveNavTab}
      />

      {/* Main Content Area */}
      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-12"
      >
        {/* Urgency & Attention Summary */}
        <AttentionSummary
          documents={documents}
          activeFilter={statusFilter}
          onFilterChange={(st) => setStatusFilter(st)}
          userName={user?.name}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onOpenShareModal={() => {
            setSelectedDocForShare(null);
            setIsShareModalOpen(true);
          }}
        />

        {/* Filter & Search Bar */}
        <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 mb-6 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, holder name, document number, or tag..."
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              {/* Category Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="all">All Categories</option>
                <option value="passport">Passports</option>
                <option value="driving_licence">Driving Licences</option>
                <option value="insurance">Insurance Policies</option>
                <option value="warranty">Warranties</option>
                <option value="id_card">National IDs</option>
                <option value="vehicle_rc">Vehicle RCs</option>
                <option value="medical">Medical</option>
                <option value="other">Other</option>
              </select>

              {/* Sort Order */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="soonest">Sort: Soonest Expiry</option>
                <option value="latest">Sort: Recently Added</option>
                <option value="alpha">Sort: Alphabetical (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Folder Filter Bar (Interactive Segmented controls with Zero-pill styling) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Folder className="w-3 h-3" />
              Folders:
            </span>
            {folders.map((f) => (
              <button
                key={f}
                onClick={() => setFolderFilter(f)}
                className={`px-3 py-1 text-xs font-medium rounded-xl transition-colors whitespace-nowrap ${
                  folderFilter === f
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {f === 'all' ? 'All Folders' : f}
              </button>
            ))}
          </div>
        </div>

        {/* Document Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-48 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse border border-slate-300/50"
              />
            ))}
          </div>
        ) : filteredDocuments.length === 0 ? (
          /* Empty State */
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-sm space-y-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No documents found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                  ? 'No documents matched your filter criteria. Try resetting your search or category filter.'
                  : 'Add your first document — takes only 20 seconds with automated Gemini vision scanning.'}
              </p>
            </div>
            <div>
              {searchQuery || typeFilter !== 'all' || statusFilter !== 'all' ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setTypeFilter('all');
                    setStatusFilter('all');
                    setFolderFilter('all');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 rounded-xl hover:bg-teal-100"
                >
                  Reset All Filters
                </button>
              ) : (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Your First Document</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onOpenDetail={(d) => setSelectedDocForDetail(d)}
                onOpenShare={(d) => {
                  setSelectedDocForShare(d);
                  setIsShareModalOpen(true);
                }}
                onOpenRenew={(d) => setSelectedDocForDetail(d)}
                onDelete={handleDeleteDocument}
              />
            ))}
          </div>
        )}
      </motion.main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeNavTab}
        setActiveTab={setActiveNavTab}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenEmergencyShare={() => {
          setSelectedDocForShare(null);
          setIsShareModalOpen(true);
        }}
        onOpenTrustedContacts={() => setIsTrustedOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Quick Scan Floating Action Button (FAB) for High-Stress Ultra-Fast Capture */}
      <aside
        aria-label="Quick scan action"
        className="fixed bottom-20 md:bottom-8 right-5 sm:right-8 z-40"
      >
        <button
          onClick={triggerQuickScan}
          title="Quick Scan (Instant Camera & Automated Extraction)"
          className="group relative flex items-center gap-2.5 px-4 py-3 sm:px-5 sm:py-3.5 bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 hover:from-teal-600 hover:to-emerald-500 text-white rounded-full shadow-lg shadow-teal-950/25 hover:shadow-xl hover:shadow-teal-900/40 hover:scale-105 active:scale-95 transition-all cursor-pointer ring-2 ring-white/20 dark:ring-slate-700/50"
        >
          <div className="relative">
            <Camera className="w-5 h-5 text-white" />
            <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300 absolute -top-1 -right-1.5 animate-pulse" />
          </div>
          <span className="text-xs sm:text-sm font-bold tracking-tight">
            Quick Scan
          </span>
          <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-extrabold uppercase bg-white/20 rounded-md tracking-wider">
            Fast
          </span>
        </button>
      </aside>

      {/* Offline Toast */}
      <OfflineIndicator />

      {/* Modals */}
      {isAddModalOpen && (
        <AddDocumentModal
          isOpen={isAddModalOpen}
          isQuickScan={isQuickScanActive}
          onClose={() => {
            setIsAddModalOpen(false);
            setIsQuickScanActive(false);
          }}
          onDocumentAdded={(newDoc) => {
            reloadDocuments();
          }}
          existingDocuments={documents}
        />
      )}

      {selectedDocForDetail && (
        <DocumentDetailModal
          isOpen={!!selectedDocForDetail}
          document={selectedDocForDetail}
          onClose={() => setSelectedDocForDetail(null)}
          onDocumentUpdated={(updatedDoc) => {
            setSelectedDocForDetail(updatedDoc);
            reloadDocuments();
          }}
          onDocumentDeleted={() => {
            setSelectedDocForDetail(null);
            reloadDocuments();
          }}
          onOpenShare={(doc) => {
            setSelectedDocForShare(doc);
            setIsShareModalOpen(true);
          }}
        />
      )}

      {isShareModalOpen && (
        <EmergencyShareModal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setSelectedDocForShare(null);
          }}
          initialDocument={selectedDocForShare}
          allDocuments={documents}
          onOpenViewer={(tok) => {
            setIsShareModalOpen(false);
            setPublicShareToken(tok);
          }}
        />
      )}

      {isNotifCenterOpen && (
        <NotificationCenterModal
          isOpen={isNotifCenterOpen}
          onClose={() => setIsNotifCenterOpen(false)}
          notifications={notifications}
          onNotificationsUpdated={reloadDocuments}
          onSelectDocument={(id) => {
            const found = documents.find((d) => d.id === id);
            if (found) setSelectedDocForDetail(found);
          }}
        />
      )}

      {isTrustedOpen && (
        <TrustedContactsModal
          isOpen={isTrustedOpen}
          onClose={() => setIsTrustedOpen(false)}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          user={user}
          onUserUpdated={(u) => setUser(u)}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onAccountDeleted={() => {
            reloadDocuments();
          }}
        />
      )}

      {/* Onboarding Presentation (First turn / initial launch) */}
      {showOnboarding && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-6 animate-fade-in">
            {/* Slide 1 */}
            {onboardingSlide === 0 && (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Shield className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Never Scramble for Expired IDs
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  DocVault scans your passport, driving licence, insurance policy, and product warranty once, accurately extracting expiry dates with Gemini Vision.
                </p>
              </div>
            )}

            {/* Slide 2 */}
            {onboardingSlide === 1 && (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Clock className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Advance Expiry Alerts
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Receive proactive alerts at 60, 30, and 7 days before expiration, plus on renewal day. Track renewal checklists and maintain historical archives.
                </p>
              </div>
            )}

            {/* Slide 3 */}
            {onboardingSlide === 2 && (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Share2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Emergency Share Links
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Generate secure, time-limited 128-bit links with optional access PINs. Family members can securely view watermarked documents without creating an account.
                </p>
              </div>
            )}

            {/* Carousel Dots */}
            <div className="flex items-center justify-center gap-2">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className={`h-2 rounded-full transition-all ${
                    onboardingSlide === idx ? 'w-6 bg-teal-600' : 'w-2 bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('docvault_onboarded', 'true');
                  setShowOnboarding(false);
                }}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Skip
              </button>

              {onboardingSlide < 2 ? (
                <button
                  type="button"
                  onClick={() => setOnboardingSlide(onboardingSlide + 1)}
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl"
                >
                  Next &rarr;
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('docvault_onboarded', 'true');
                    setShowOnboarding(false);
                  }}
                  className="px-6 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow"
                >
                  Enter My Vault
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
