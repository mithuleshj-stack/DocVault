import {
  DocumentItem,
  ExtractedDocumentData,
  UserProfile,
  ShareLink,
  ShareAccessLog,
  NotificationItem,
  TrustedContact,
  NotificationSettings,
} from '../types';

export const api = {
  // Auth
  async getMe(): Promise<{ user: UserProfile }> {
    const res = await fetch('/api/auth/me');
    if (!res.ok) throw new Error('Failed to fetch user');
    return res.json();
  },

  async updateProfile(payload: { name?: string; email?: string }): Promise<{ user: UserProfile }> {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to update profile');
    }
    return res.json();
  },

  async login(payload: { email: string; password?: string; pin?: string }): Promise<{ user: UserProfile }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Login failed');
    }
    return res.json();
  },

  async setAppLockPin(pin: string, enable: boolean): Promise<{ success: boolean; pinEnabled: boolean }> {
    const res = await fetch('/api/auth/app-lock-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, enable }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to set app lock PIN');
    }
    return res.json();
  },

  async verifyPin(pin: string): Promise<{ valid: boolean }> {
    const res = await fetch('/api/auth/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    return res.json();
  },

  async saveRecoveryKey(recoveryKey: string): Promise<{ success: boolean }> {
    const res = await fetch('/api/auth/recovery-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recoveryKey }),
    });
    return res.json();
  },

  async deleteAccount(confirmText: string): Promise<{ success: boolean }> {
    const res = await fetch('/api/auth/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmText }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete account');
    }
    return res.json();
  },

  // Gemini Vision OCR Extraction
  async extractDocument(imageBase64: string, mimeType: string): Promise<{ extraction: ExtractedDocumentData }> {
    const res = await fetch('/api/gemini/extract-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, mimeType }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Gemini extraction failed');
    }
    return res.json();
  },

  // Documents
  async getDocuments(): Promise<{ documents: DocumentItem[] }> {
    const res = await fetch('/api/documents');
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  async createDocument(docData: Partial<DocumentItem>): Promise<{ document: DocumentItem }> {
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docData),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || data.error || 'Failed to create document');
    }
    return res.json();
  },

  async updateDocument(id: string, docData: Partial<DocumentItem>): Promise<{ document: DocumentItem }> {
    const res = await fetch(`/api/documents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docData),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to update document');
    }
    return res.json();
  },

  async renewDocument(
    id: string,
    payload: {
      newExpiryDate: string;
      newDocumentNumber?: string;
      renewalNotes?: string;
      fileData?: string;
      fileName?: string;
    }
  ): Promise<{ document: DocumentItem }> {
    const res = await fetch(`/api/documents/${id}/renew`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to renew document');
    }
    return res.json();
  },

  async deleteDocument(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete document');
    return res.json();
  },

  // Emergency Share
  async getShareLinks(): Promise<{ shareLinks: ShareLink[]; accessLogs: ShareAccessLog[] }> {
    const res = await fetch('/api/share-links');
    if (!res.ok) throw new Error('Failed to fetch share links');
    return res.json();
  },

  async createShareLink(payload: {
    documentIds: string[];
    recipientLabel: string;
    recipientEmail?: string;
    durationHours: number;
    pin?: string;
    maxViews?: number;
    allowDownload?: boolean;
    encryptedLinkKey?: string;
  }): Promise<{ shareLink: ShareLink }> {
    const res = await fetch('/api/share-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to create share link');
    }
    return res.json();
  },

  async revokeShareLink(id: string): Promise<{ success: boolean; shareLink: ShareLink }> {
    const res = await fetch(`/api/share-links/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to revoke share link');
    return res.json();
  },

  // Public Share Access
  async accessPublicShare(token: string, pin?: string): Promise<any> {
    const res = await fetch(`/api/public-share/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    const data = await res.json();
    return { status: res.status, ...data };
  },

  // Notifications
  async getNotifications(): Promise<{ notifications: NotificationItem[] }> {
    const res = await fetch('/api/notifications');
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    return res.json();
  },

  async snoozeNotification(id: string, days: number): Promise<{ success: boolean }> {
    const res = await fetch(`/api/notifications/${id}/snooze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days }),
    });
    return res.json();
  },

  async dismissNotification(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/notifications/${id}/dismiss`, { method: 'POST' });
    return res.json();
  },

  async runScheduler(): Promise<{ success: boolean; count: number }> {
    const res = await fetch('/api/notifications/run-scheduler', { method: 'POST' });
    return res.json();
  },

  // Trusted Contacts
  async getTrustedContacts(): Promise<{ contacts: TrustedContact[] }> {
    const res = await fetch('/api/trusted-contacts');
    if (!res.ok) throw new Error('Failed to fetch trusted contacts');
    return res.json();
  },

  async addTrustedContact(payload: { name: string; email: string; relationship: string }): Promise<{ contact: TrustedContact }> {
    const res = await fetch('/api/trusted-contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to add contact');
    return res.json();
  },

  async simulateContactRequest(id: string): Promise<{ success: boolean; contact: TrustedContact }> {
    const res = await fetch(`/api/trusted-contacts/${id}/simulate-request`, { method: 'POST' });
    return res.json();
  },

  async respondContactRequest(id: string, action: 'APPROVE' | 'DENY'): Promise<{ success: boolean; contact: TrustedContact }> {
    const res = await fetch(`/api/trusted-contacts/${id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    return res.json();
  },

  // Settings
  async getSettings(): Promise<{ settings: NotificationSettings }> {
    const res = await fetch('/api/settings');
    return res.json();
  },

  async updateSettings(settings: Partial<NotificationSettings>): Promise<{ settings: NotificationSettings }> {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.json();
  },
};
