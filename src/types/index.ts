export type DocumentType =
  | 'passport'
  | 'driving_licence'
  | 'insurance'
  | 'warranty'
  | 'id_card'
  | 'vehicle_rc'
  | 'medical'
  | 'other';

export interface ChecklistItem {
  id: string;
  task: string;
  completed: boolean;
}

export interface DocumentVersion {
  version: number;
  renewedAt: string;
  expiryDate: string | null;
  documentNumber: string | null;
  notes?: string;
}

export interface DocumentItem {
  id: string;
  userId: string;
  documentType: DocumentType;
  title: string;
  holderName: string | null;
  documentNumber: string | null;
  documentNumberEncrypted?: string;
  issueDate: string | null;
  expiryDate: string | null;
  noExpiry: boolean;
  issuer: string | null;
  confidence: number;
  tags: string[];
  folder: string;
  notes: string;
  checklist: ChecklistItem[];
  fileData?: string;
  fileType?: string;
  fileName?: string;
  fileSize?: number;
  encryptedKey?: string;
  iv?: string;
  versions: DocumentVersion[];
  customReminderDays?: number[];
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedDocumentData {
  document_type: DocumentType;
  title: string;
  holder_name: string | null;
  document_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  issuer: string | null;
  confidence: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  pinEnabled: boolean;
  hasRecoveryKey: boolean;
  createdAt?: string;
}

export interface ShareLink {
  id: string;
  userId: string;
  token: string;
  documentIds: string[];
  recipientLabel: string;
  recipientEmail?: string;
  hasPin: boolean;
  failedPinAttempts: number;
  isLocked: boolean;
  expiresAt: string;
  maxViews: number | null;
  viewCount: number;
  allowDownload: boolean;
  revokedAt: string | null;
  createdAt: string;
}

export interface ShareAccessLog {
  id: string;
  shareLinkId: string;
  accessedAt: string;
  ipHash: string;
  userAgent: string;
  device: string;
  result: 'SUCCESS' | 'PIN_FAILED' | 'EXPIRED' | 'LOCKED' | 'REVOKED';
}

export interface NotificationItem {
  id: string;
  userId: string;
  documentId: string;
  title: string;
  message: string;
  type: 'EXPIRY_60' | 'EXPIRY_30' | 'EXPIRY_7' | 'EXPIRY_TODAY' | 'OVERDUE' | 'SHARE_ACCESSED' | 'TRUSTED_REQUEST';
  daysLeft: number;
  status: 'UNREAD' | 'READ' | 'DISMISSED';
  createdAt: string;
  snoozedUntil?: string | null;
}

export interface TrustedContact {
  id: string;
  userId: string;
  name: string;
  email: string;
  relationship: string;
  requestStatus: 'IDLE' | 'PENDING' | 'APPROVED' | 'DENIED';
  requestTimestamp?: string | null;
  autoApproveAt?: string | null;
}

export interface NotificationSettings {
  emailAlerts: boolean;
  browserPush: boolean;
  inAppAlerts: boolean;
  reminderDays: number[];
}
