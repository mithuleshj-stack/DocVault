import React, { useState } from 'react';
import {
  X,
  Bell,
  Clock,
  AlertCircle,
  Check,
  Play,
  RotateCcw,
  CheckCircle2,
  Share2,
  Trash2,
} from 'lucide-react';
import { NotificationItem } from '../types';
import { api } from '../services/api';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onNotificationsUpdated: () => void;
  onSelectDocument: (docId: string) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onNotificationsUpdated,
  onSelectDocument,
}) => {
  const [runningScheduler, setRunningScheduler] = useState(false);
  const [schedulerMsg, setSchedulerMsg] = useState('');

  if (!isOpen) return null;

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      onNotificationsUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSnooze = async (id: string, days: number) => {
    try {
      await api.snoozeNotification(id, days);
      onNotificationsUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await api.dismissNotification(id);
      onNotificationsUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunScheduler = async () => {
    setRunningScheduler(true);
    setSchedulerMsg('');
    try {
      const res = await api.runScheduler();
      setSchedulerMsg(`Scheduler evaluated all documents. Total active alerts: ${res.count}`);
      onNotificationsUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setRunningScheduler(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Notification Center
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Scheduled reminders at 60, 30, 7 days and overdue checks
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

        {/* Action Header bar */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {notifications.length} Active Alert{notifications.length === 1 ? '' : 's'}
          </span>

          <button
            onClick={handleRunScheduler}
            disabled={runningScheduler}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-teal-800 dark:text-teal-300 bg-teal-100/60 dark:bg-teal-950/60 rounded-lg hover:bg-teal-200/60 transition-colors"
          >
            <Play className="w-3 h-3" />
            <span>{runningScheduler ? 'Checking...' : 'Run Reminder Check'}</span>
          </button>
        </div>

        {schedulerMsg && (
          <div className="px-6 py-2 bg-teal-50 dark:bg-teal-950/30 text-[11px] text-teal-800 dark:text-teal-300 border-b border-teal-100 dark:border-teal-900">
            {schedulerMsg}
          </div>
        )}

        {/* Notifications list */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-teal-600 mx-auto mb-2" />
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                No pending alerts
              </p>
              <p className="mt-1">All your personal document expiries are in good standing.</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isOverdue = notif.type === 'OVERDUE' || notif.daysLeft < 0;
              const isUrgent = notif.type === 'EXPIRY_7' || notif.daysLeft <= 7;

              return (
                <div
                  key={notif.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    notif.status === 'UNREAD'
                      ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 shadow-sm'
                      : 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center mt-0.5 ${
                          isOverdue
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : isUrgent
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300'
                        }`}
                      >
                        {isOverdue ? (
                          <AlertCircle className="w-4 h-4" />
                        ) : (
                          <Clock className="w-4 h-4" />
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {notif.title}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                          {notif.message}
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                          {new Date(notif.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDismiss(notif.id)}
                      title="Dismiss notification"
                      className="p-1 text-slate-400 hover:text-slate-600 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Actions: View Document, Snooze 1 Day, Snooze 1 Week */}
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
                    {notif.documentId ? (
                      <button
                        onClick={() => {
                          onSelectDocument(notif.documentId);
                          onClose();
                        }}
                        className="text-teal-700 dark:text-teal-400 hover:underline font-semibold"
                      >
                        Open Document &rarr;
                      </button>
                    ) : (
                      <span />
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSnooze(notif.id, 1)}
                        className="px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        Snooze 1d
                      </button>
                      <button
                        onClick={() => handleSnooze(notif.id, 7)}
                        className="px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        Snooze 1w
                      </button>
                      <button
                        onClick={() => handleDismiss(notif.id)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg hover:bg-emerald-100 transition-colors"
                      >
                        Handled
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
