import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import JSZip from 'jszip';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Database file setup
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface User {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  pinHash?: string;
  pinEnabled: boolean;
  recoveryKeyHash?: string;
  createdAt: string;
}

interface DocumentVersion {
  version: number;
  renewedAt: string;
  expiryDate: string | null;
  documentNumber: string | null;
  notes?: string;
}

interface ChecklistItem {
  id: string;
  task: string;
  completed: boolean;
}

interface DocumentItem {
  id: string;
  userId: string;
  documentType: 'passport' | 'driving_licence' | 'insurance' | 'warranty' | 'id_card' | 'vehicle_rc' | 'medical' | 'other';
  title: string;
  holderName: string | null;
  documentNumber: string | null; // Masked or encrypted
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
  fileData?: string; // base64 or encrypted data url
  fileType?: string; // e.g. 'image/jpeg', 'application/pdf'
  fileName?: string;
  fileSize?: number;
  encryptedKey?: string;
  iv?: string;
  versions: DocumentVersion[];
  customReminderDays?: number[];
  createdAt: string;
  updatedAt: string;
}

interface ShareLink {
  id: string;
  userId: string;
  token: string;
  documentIds: string[];
  recipientLabel: string;
  recipientEmail?: string;
  pinHash?: string;
  hasPin: boolean;
  failedPinAttempts: number;
  isLocked: boolean;
  expiresAt: string; // ISO string
  maxViews: number | null;
  viewCount: number;
  allowDownload: boolean;
  revokedAt: string | null;
  encryptedLinkKey?: string;
  createdAt: string;
}

interface ShareAccessLog {
  id: string;
  shareLinkId: string;
  accessedAt: string;
  ipHash: string;
  userAgent: string;
  device: string;
  result: 'SUCCESS' | 'PIN_FAILED' | 'EXPIRED' | 'LOCKED' | 'REVOKED';
}

interface NotificationItem {
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

interface TrustedContact {
  id: string;
  userId: string;
  name: string;
  email: string;
  relationship: string;
  requestStatus: 'IDLE' | 'PENDING' | 'APPROVED' | 'DENIED';
  requestTimestamp?: string | null;
  autoApproveAt?: string | null;
}

interface NotificationSettings {
  emailAlerts: boolean;
  browserPush: boolean;
  inAppAlerts: boolean;
  reminderDays: number[]; // [60, 30, 7, 0]
}

interface AppDatabase {
  users: User[];
  documents: DocumentItem[];
  shareLinks: ShareLink[];
  accessLogs: ShareAccessLog[];
  notifications: NotificationItem[];
  trustedContacts: TrustedContact[];
  settings: Record<string, NotificationSettings>;
}

// Initial seed data with authentic realistic documents
const defaultSeedUser: User = {
  id: 'user_docvault_demo',
  email: 'mithuleshj@gmail.com',
  name: 'Mithilesh Joshi',
  pinEnabled: false,
  createdAt: new Date().toISOString(),
};

function getSeedDocuments(userId: string): DocumentItem[] {
  return [];
}

// Load or initialize DB
function loadDb(): AppDatabase {
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return parsed;
    } catch (err) {
      console.error('Error reading db.json, reinitializing:', err);
    }
  }

  const initialDb: AppDatabase = {
    users: [defaultSeedUser],
    documents: [],
    shareLinks: [],
    accessLogs: [],
    notifications: [],
    trustedContacts: [],
    settings: {
      [defaultSeedUser.id]: {
        emailAlerts: true,
        browserPush: true,
        inAppAlerts: true,
        reminderDays: [60, 30, 7, 0],
      },
    },
  };

  saveDb(initialDb);
  return initialDb;
}

function saveDb(db: AppDatabase) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

let db = loadDb();

// Periodic Reminder Engine: Runs every 12 hours (or on simulation trigger)
function runReminderEngine() {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  let addedCount = 0;
  for (const doc of db.documents) {
    if (doc.noExpiry || !doc.expiryDate) continue;

    const expiryTime = new Date(doc.expiryDate).getTime();
    const currentTime = now.getTime();
    const diffDays = Math.ceil((expiryTime - currentTime) / (1000 * 60 * 60 * 24));

    const reminderDays = doc.customReminderDays || [60, 30, 7, 0];

    // Check if a reminder matches diffDays or overdue
    let matchType: NotificationItem['type'] | null = null;
    if (diffDays <= 0 && diffDays >= -7) {
      matchType = diffDays === 0 ? 'EXPIRY_TODAY' : 'OVERDUE';
    } else if (diffDays <= 7 && diffDays > 0 && reminderDays.includes(7)) {
      matchType = 'EXPIRY_7';
    } else if (diffDays <= 30 && diffDays > 7 && reminderDays.includes(30)) {
      matchType = 'EXPIRY_30';
    } else if (diffDays <= 60 && diffDays > 30 && reminderDays.includes(60)) {
      matchType = 'EXPIRY_60';
    }

    if (matchType) {
      // Check if we already created a notification for this document today to avoid duplicates
      const exists = db.notifications.find(
        (n) =>
          n.documentId === doc.id &&
          n.type === matchType &&
          n.createdAt.startsWith(todayStr)
      );

      if (!exists) {
        db.notifications.unshift({
          id: 'notif_' + crypto.randomUUID(),
          userId: doc.userId,
          documentId: doc.id,
          title: `${doc.title} ${diffDays < 0 ? 'is OVERDUE' : diffDays === 0 ? 'expires TODAY' : `expires in ${diffDays} days`}`,
          message: diffDays < 0 
            ? `Expired on ${doc.expiryDate}. Please renew immediately.`
            : `Validity ends on ${doc.expiryDate}. Review the renewal checklist.`,
          type: matchType,
          daysLeft: diffDays,
          status: 'UNREAD',
          createdAt: new Date().toISOString(),
        });
        addedCount++;
      }
    }
  }

  if (addedCount > 0) {
    saveDb(db);
  }
}

// Start daily check interval
setInterval(runReminderEngine, 12 * 60 * 60 * 1000);

// Helper for hashing PIN
function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin.trim()).digest('hex');
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Current User / Auth simulation
app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = db.users[0] || defaultSeedUser;
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      pinEnabled: user.pinEnabled,
      hasRecoveryKey: !!user.recoveryKeyHash,
      createdAt: user.createdAt,
    },
  });
});

app.put('/api/auth/profile', (req: Request, res: Response) => {
  const { name, email } = req.body;
  const user = db.users[0];
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (name) user.name = name.trim();
  if (email) user.email = email.trim();
  saveDb(db);
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      pinEnabled: user.pinEnabled,
      hasRecoveryKey: !!user.recoveryKeyHash,
      createdAt: user.createdAt,
    },
  });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password, pin } = req.body;
  const user = db.users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase()) || db.users[0];
  
  if (pin && user.pinEnabled && user.pinHash) {
    if (hashPin(pin) !== user.pinHash) {
      return res.status(401).json({ error: 'Incorrect app-lock PIN' });
    }
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      pinEnabled: user.pinEnabled,
      hasRecoveryKey: !!user.recoveryKeyHash,
    },
  });
});

app.post('/api/auth/google', (req: Request, res: Response) => {
  const { email, name } = req.body;
  let user = db.users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase());
  if (!user) {
    user = {
      id: 'user_' + crypto.randomUUID(),
      email: email || 'user@example.com',
      name: name || 'Google User',
      pinEnabled: false,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    saveDb(db);
  }
  res.json({ user });
});

app.post('/api/auth/app-lock-pin', (req: Request, res: Response) => {
  const { pin, enable } = req.body;
  const user = db.users[0];
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (enable) {
    if (!pin || pin.length < 4 || pin.length > 6) {
      return res.status(400).json({ error: 'PIN must be 4 to 6 digits' });
    }
    user.pinHash = hashPin(pin);
    user.pinEnabled = true;
  } else {
    user.pinHash = undefined;
    user.pinEnabled = false;
  }
  saveDb(db);
  res.json({ success: true, pinEnabled: user.pinEnabled });
});

app.post('/api/auth/verify-pin', (req: Request, res: Response) => {
  const { pin } = req.body;
  const user = db.users[0];
  if (!user || !user.pinHash) {
    return res.json({ valid: true });
  }
  const valid = hashPin(pin) === user.pinHash;
  res.json({ valid });
});

app.post('/api/auth/recovery-key', (req: Request, res: Response) => {
  const { recoveryKey } = req.body;
  const user = db.users[0];
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.recoveryKeyHash = hashPin(recoveryKey);
  saveDb(db);
  res.json({ success: true });
});

app.post('/api/auth/delete-account', (req: Request, res: Response) => {
  const { confirmText } = req.body;
  if (confirmText !== 'DELETE') {
    return res.status(400).json({ error: 'Please type DELETE to confirm.' });
  }

  // Wipe all user data
  db.documents = [];
  db.shareLinks = [];
  db.accessLogs = [];
  db.notifications = [];
  db.trustedContacts = [];
  db.users = [
    {
      id: 'user_docvault_new',
      email: 'user@docvault.local',
      name: 'New User',
      pinEnabled: false,
      createdAt: new Date().toISOString(),
    },
  ];
  saveDb(db);
  res.json({ success: true, message: 'All personal data deleted permanently.' });
});

// 2. Gemini OCR Extraction Route
app.post('/api/gemini/extract-document', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'No image data provided for extraction.' });
    }

    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:([a-zA-Z0-9/+-]+);base64,/, '');

    const promptText = `
You are DocVault's highly precise document OCR and expiry extraction system.
Carefully inspect the provided image of an official personal document (such as passport, driving licence, vehicle registration (RC), insurance policy, product warranty card, health card, or national ID).

Extract the following information:
1. document_type: Identify the document category. Allowed values: "passport", "driving_licence", "insurance", "warranty", "id_card", "vehicle_rc", "medical", or "other".
2. title: A concise, human-friendly title for the document (e.g. "Republic of India Passport", "HDFC Car Insurance Policy", "Sony TV Extended Warranty").
3. holder_name: Full name of the primary cardholder or insured person, or null if absent.
4. document_number: Official identification or policy number (e.g. passport number, DL number, policy number), or null if absent.
5. issue_date: Date of issue in YYYY-MM-DD format, or null if absent.
6. expiry_date: Date of expiry, expiration, or validity end in YYYY-MM-DD format. If this is a lifetime or permanent document (like Indian PAN or Aadhaar), set expiry_date to null.
7. issuer: The issuing authority, company, insurer, or government agency (e.g. "Ministry of External Affairs", "ICICI Lombard", "Apple Inc"), or null.
8. confidence: A floating number between 0.0 and 1.0 indicating your confidence in the extracted fields (reduce if image is blurry, angled, or text is partially occluded).

Return strictly JSON matching the specified schema.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType.includes('pdf') ? 'application/pdf' : mimeType,
            },
          },
          { text: promptText },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            document_type: {
              type: Type.STRING,
              description: 'One of: passport, driving_licence, insurance, warranty, id_card, vehicle_rc, medical, other',
            },
            title: {
              type: Type.STRING,
              description: 'Descriptive title of document',
            },
            holder_name: {
              type: Type.STRING,
              description: 'Full name on document or null',
            },
            document_number: {
              type: Type.STRING,
              description: 'Identification or policy number or null',
            },
            issue_date: {
              type: Type.STRING,
              description: 'YYYY-MM-DD date or null',
            },
            expiry_date: {
              type: Type.STRING,
              description: 'YYYY-MM-DD date or null if no expiry',
            },
            issuer: {
              type: Type.STRING,
              description: 'Issuing authority or company or null',
            },
            confidence: {
              type: Type.NUMBER,
              description: 'Confidence score from 0.0 to 1.0',
            },
          },
          required: ['document_type', 'title', 'confidence'],
        },
      },
    });

    const textOutput = response.text || '{}';
    let parsedData;
    try {
      parsedData = JSON.parse(textOutput);
    } catch (parseErr) {
      // Clean possible markdown code fences
      const cleaned = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    res.json({
      success: true,
      extraction: parsedData,
    });
  } catch (error: any) {
    console.error('Gemini OCR extraction error:', error);
    res.status(500).json({
      error: 'Failed to extract text from document using Gemini Vision.',
      details: error?.message || String(error),
    });
  }
});

// 3. Document CRUD Routes
app.get('/api/documents', (req: Request, res: Response) => {
  res.json({ documents: db.documents });
});

app.post('/api/documents', (req: Request, res: Response) => {
  const body = req.body;
  const user = db.users[0] || defaultSeedUser;

  // Check for duplicate document (same type + document number)
  if (body.documentNumber && body.documentType) {
    const existing = db.documents.find(
      (d) =>
        d.documentType === body.documentType &&
        d.documentNumber?.trim().toLowerCase() === body.documentNumber.trim().toLowerCase()
    );
    if (existing) {
      return res.status(409).json({
        error: 'Duplicate document detected',
        message: `A ${body.documentType} with number "${body.documentNumber}" already exists in your vault ("${existing.title}").`,
      });
    }
  }

  const newDoc: DocumentItem = {
    id: 'doc_' + crypto.randomUUID(),
    userId: user.id,
    documentType: body.documentType || 'other',
    title: body.title || 'Untitled Document',
    holderName: body.holderName || null,
    documentNumber: body.documentNumber || null,
    documentNumberEncrypted: body.documentNumberEncrypted || undefined,
    issueDate: body.issueDate || null,
    expiryDate: body.noExpiry ? null : body.expiryDate || null,
    noExpiry: !!body.noExpiry,
    issuer: body.issuer || null,
    confidence: typeof body.confidence === 'number' ? body.confidence : 1.0,
    tags: Array.isArray(body.tags) ? body.tags : [],
    folder: body.folder || 'Personal',
    notes: body.notes || '',
    checklist: Array.isArray(body.checklist) ? body.checklist : [],
    fileData: body.fileData || undefined,
    fileType: body.fileType || undefined,
    fileName: body.fileName || undefined,
    fileSize: body.fileSize || undefined,
    encryptedKey: body.encryptedKey || undefined,
    iv: body.iv || undefined,
    versions: [],
    customReminderDays: body.customReminderDays || [60, 30, 7, 0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.documents.unshift(newDoc);
  saveDb(db);

  // Trigger reminder check
  runReminderEngine();

  res.status(201).json({ document: newDoc });
});

app.get('/api/documents/:id', (req: Request, res: Response) => {
  const doc = db.documents.find((d) => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json({ document: doc });
});

app.put('/api/documents/:id', (req: Request, res: Response) => {
  const index = db.documents.findIndex((d) => d.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Document not found' });

  const current = db.documents[index];
  const body = req.body;

  const updated: DocumentItem = {
    ...current,
    title: body.title !== undefined ? body.title : current.title,
    documentType: body.documentType !== undefined ? body.documentType : current.documentType,
    holderName: body.holderName !== undefined ? body.holderName : current.holderName,
    documentNumber: body.documentNumber !== undefined ? body.documentNumber : current.documentNumber,
    issueDate: body.issueDate !== undefined ? body.issueDate : current.issueDate,
    expiryDate: body.noExpiry ? null : body.expiryDate !== undefined ? body.expiryDate : current.expiryDate,
    noExpiry: body.noExpiry !== undefined ? body.noExpiry : current.noExpiry,
    issuer: body.issuer !== undefined ? body.issuer : current.issuer,
    tags: Array.isArray(body.tags) ? body.tags : current.tags,
    folder: body.folder !== undefined ? body.folder : current.folder,
    notes: body.notes !== undefined ? body.notes : current.notes,
    checklist: Array.isArray(body.checklist) ? body.checklist : current.checklist,
    fileData: body.fileData !== undefined ? body.fileData : current.fileData,
    fileType: body.fileType !== undefined ? body.fileType : current.fileType,
    fileName: body.fileName !== undefined ? body.fileName : current.fileName,
    customReminderDays: body.customReminderDays || current.customReminderDays,
    updatedAt: new Date().toISOString(),
  };

  db.documents[index] = updated;
  saveDb(db);
  runReminderEngine();

  res.json({ document: updated });
});

app.post('/api/documents/:id/renew', (req: Request, res: Response) => {
  const index = db.documents.findIndex((d) => d.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Document not found' });

  const current = db.documents[index];
  const { newExpiryDate, newDocumentNumber, renewalNotes, fileData, fileName } = req.body;

  if (!newExpiryDate) {
    return res.status(400).json({ error: 'New expiry date is required to mark as renewed.' });
  }

  // Archive current version
  const previousVersion: DocumentVersion = {
    version: current.versions.length + 1,
    renewedAt: new Date().toISOString(),
    expiryDate: current.expiryDate,
    documentNumber: current.documentNumber,
    notes: renewalNotes || current.notes,
  };

  const updated: DocumentItem = {
    ...current,
    expiryDate: newExpiryDate,
    documentNumber: newDocumentNumber || current.documentNumber,
    noExpiry: false,
    fileData: fileData || current.fileData,
    fileName: fileName || current.fileName,
    versions: [previousVersion, ...current.versions],
    updatedAt: new Date().toISOString(),
  };

  db.documents[index] = updated;

  // Clear unread overdue/expiry notifications for this document
  db.notifications = db.notifications.filter(
    (n) => !(n.documentId === current.id && (n.type.startsWith('EXPIRY') || n.type === 'OVERDUE'))
  );

  saveDb(db);
  runReminderEngine();

  res.json({ document: updated });
});

app.delete('/api/documents/:id', (req: Request, res: Response) => {
  db.documents = db.documents.filter((d) => d.id !== req.params.id);
  db.notifications = db.notifications.filter((n) => n.documentId !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

// 4. Emergency Share Links
app.get('/api/share-links', (req: Request, res: Response) => {
  res.json({
    shareLinks: db.shareLinks,
    accessLogs: db.accessLogs,
  });
});

app.post('/api/share-links', (req: Request, res: Response) => {
  const user = db.users[0] || defaultSeedUser;
  const {
    documentIds,
    recipientLabel,
    recipientEmail,
    durationHours = 24,
    pin,
    maxViews,
    allowDownload = false,
    encryptedLinkKey,
  } = req.body;

  if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
    return res.status(400).json({ error: 'Please select at least one document to share.' });
  }

  // Generate 128-bit unguessable random token
  const token = crypto.randomBytes(16).toString('hex');

  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000).toISOString();

  const newLink: ShareLink = {
    id: 'link_' + crypto.randomUUID(),
    userId: user.id,
    token,
    documentIds,
    recipientLabel: recipientLabel || 'Family Recipient',
    recipientEmail: recipientEmail || undefined,
    pinHash: pin ? hashPin(pin) : undefined,
    hasPin: !!pin,
    failedPinAttempts: 0,
    isLocked: false,
    expiresAt,
    maxViews: typeof maxViews === 'number' && maxViews > 0 ? maxViews : null,
    viewCount: 0,
    allowDownload: !!allowDownload,
    revokedAt: null,
    encryptedLinkKey: encryptedLinkKey || undefined,
    createdAt: new Date().toISOString(),
  };

  db.shareLinks.unshift(newLink);
  saveDb(db);

  res.status(201).json({ shareLink: newLink });
});

app.delete('/api/share-links/:id', (req: Request, res: Response) => {
  const link = db.shareLinks.find((l) => l.id === req.params.id);
  if (!link) return res.status(404).json({ error: 'Share link not found' });

  link.revokedAt = new Date().toISOString();
  saveDb(db);
  res.json({ success: true, shareLink: link });
});

// 5. Public Share Viewer Access (No login required)
app.post('/api/public-share/:token', (req: Request, res: Response) => {
  const { token } = req.params;
  const { pin } = req.body;

  const link = db.shareLinks.find((l) => l.token === token);
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const ipHash = crypto.createHash('sha256').update(clientIp).digest('hex').slice(0, 10);
  const userAgent = (req.headers['user-agent'] as string) || 'Unknown Device';
  const device = userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser';

  if (!link) {
    return res.status(404).json({
      status: 'NOT_FOUND',
      error: 'This emergency share link does not exist or has been permanently removed.',
    });
  }

  // Check revocation
  if (link.revokedAt) {
    db.accessLogs.unshift({
      id: 'log_' + crypto.randomUUID(),
      shareLinkId: link.id,
      accessedAt: new Date().toISOString(),
      ipHash,
      userAgent,
      device,
      result: 'REVOKED',
    });
    saveDb(db);
    return res.status(410).json({
      status: 'REVOKED',
      error: 'This emergency share link has been revoked by the owner.',
    });
  }

  // Check Expiry
  if (new Date() > new Date(link.expiresAt)) {
    db.accessLogs.unshift({
      id: 'log_' + crypto.randomUUID(),
      shareLinkId: link.id,
      accessedAt: new Date().toISOString(),
      ipHash,
      userAgent,
      device,
      result: 'EXPIRED',
    });
    saveDb(db);
    return res.status(410).json({
      status: 'EXPIRED',
      error: 'This emergency share link has expired.',
    });
  }

  // Check Lockout
  if (link.isLocked) {
    db.accessLogs.unshift({
      id: 'log_' + crypto.randomUUID(),
      shareLinkId: link.id,
      accessedAt: new Date().toISOString(),
      ipHash,
      userAgent,
      device,
      result: 'LOCKED',
    });
    saveDb(db);
    return res.status(403).json({
      status: 'LOCKED',
      error: 'This link is locked due to 5 consecutive failed PIN attempts for security.',
    });
  }

  // Check Max Views Limit
  if (link.maxViews !== null && link.viewCount >= link.maxViews) {
    return res.status(410).json({
      status: 'EXHAUSTED',
      error: `This link has reached its maximum allowed view limit (${link.maxViews} views).`,
    });
  }

  // Check PIN requirement
  if (link.hasPin) {
    if (!pin) {
      return res.status(200).json({
        status: 'PIN_REQUIRED',
        recipientLabel: link.recipientLabel,
        expiresAt: link.expiresAt,
        message: 'This document is protected with an access PIN set by the owner.',
      });
    }

    if (hashPin(pin) !== link.pinHash) {
      link.failedPinAttempts += 1;
      if (link.failedPinAttempts >= 5) {
        link.isLocked = true;
      }
      db.accessLogs.unshift({
        id: 'log_' + crypto.randomUUID(),
        shareLinkId: link.id,
        accessedAt: new Date().toISOString(),
        ipHash,
        userAgent,
        device,
        result: 'PIN_FAILED',
      });
      saveDb(db);

      if (link.isLocked) {
        return res.status(403).json({
          status: 'LOCKED',
          error: 'Maximum PIN attempts exceeded. This emergency link has been locked permanently.',
        });
      }

      return res.status(401).json({
        status: 'PIN_INVALID',
        error: `Incorrect access PIN. ${5 - link.failedPinAttempts} attempts remaining.`,
      });
    }
  }

  // Successful Access
  link.viewCount += 1;
  db.accessLogs.unshift({
    id: 'log_' + crypto.randomUUID(),
    shareLinkId: link.id,
    accessedAt: new Date().toISOString(),
    ipHash,
    userAgent,
    device,
    result: 'SUCCESS',
  });

  // Owner notification on first access
  if (link.viewCount === 1) {
    db.notifications.unshift({
      id: 'notif_' + crypto.randomUUID(),
      userId: link.userId,
      documentId: link.documentIds[0] || '',
      title: 'Emergency Link Opened',
      message: `Emergency share link for "${link.recipientLabel}" was opened just now from ${device}.`,
      type: 'SHARE_ACCESSED',
      daysLeft: 0,
      status: 'UNREAD',
      createdAt: new Date().toISOString(),
    });
  }

  saveDb(db);

  // Retrieve shared documents
  const sharedDocs = db.documents
    .filter((d) => link.documentIds.includes(d.id))
    .map((d) => ({
      id: d.id,
      title: d.title,
      documentType: d.documentType,
      holderName: d.holderName,
      documentNumber: d.documentNumber,
      issueDate: d.issueDate,
      expiryDate: d.expiryDate,
      noExpiry: d.noExpiry,
      issuer: d.issuer,
      notes: d.notes,
      fileData: d.fileData,
      fileType: d.fileType,
      fileName: d.fileName,
      allowDownload: link.allowDownload,
    }));

  res.json({
    status: 'AUTHORIZED',
    recipientLabel: link.recipientLabel,
    expiresAt: link.expiresAt,
    allowDownload: link.allowDownload,
    documents: sharedDocs,
    watermarkText: `Shared via DocVault — Valid until ${new Date(link.expiresAt).toLocaleDateString()}`,
  });
});

// 6. Notifications & Reminder Center
app.get('/api/notifications', (req: Request, res: Response) => {
  res.json({ notifications: db.notifications });
});

app.post('/api/notifications/:id/read', (req: Request, res: Response) => {
  const notif = db.notifications.find((n) => n.id === req.params.id);
  if (notif) notif.status = 'READ';
  saveDb(db);
  res.json({ success: true });
});

app.post('/api/notifications/:id/snooze', (req: Request, res: Response) => {
  const { days = 7 } = req.body;
  const notif = db.notifications.find((n) => n.id === req.params.id);
  if (notif) {
    const snoozeDate = new Date();
    snoozeDate.setDate(snoozeDate.getDate() + days);
    notif.snoozedUntil = snoozeDate.toISOString();
    notif.status = 'DISMISSED';
  }
  saveDb(db);
  res.json({ success: true });
});

app.post('/api/notifications/:id/dismiss', (req: Request, res: Response) => {
  db.notifications = db.notifications.filter((n) => n.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

app.post('/api/notifications/run-scheduler', (req: Request, res: Response) => {
  runReminderEngine();
  res.json({ success: true, count: db.notifications.length });
});

// 7. Trusted Contacts (Dead-man / 24-hr grace period access)
app.get('/api/trusted-contacts', (req: Request, res: Response) => {
  res.json({ contacts: db.trustedContacts });
});

app.post('/api/trusted-contacts', (req: Request, res: Response) => {
  const { name, email, relationship } = req.body;
  const user = db.users[0] || defaultSeedUser;
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required.' });

  const newContact: TrustedContact = {
    id: 'contact_' + crypto.randomUUID(),
    userId: user.id,
    name,
    email,
    relationship: relationship || 'Family',
    requestStatus: 'IDLE',
  };

  db.trustedContacts.push(newContact);
  saveDb(db);
  res.status(201).json({ contact: newContact });
});

app.post('/api/trusted-contacts/:id/simulate-request', (req: Request, res: Response) => {
  const contact = db.trustedContacts.find((c) => c.id === req.params.id);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });

  const now = new Date();
  const autoApprove = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  contact.requestStatus = 'PENDING';
  contact.requestTimestamp = now.toISOString();
  contact.autoApproveAt = autoApprove.toISOString();

  db.notifications.unshift({
    id: 'notif_' + crypto.randomUUID(),
    userId: contact.userId,
    documentId: '',
    title: 'Emergency Access Requested',
    message: `${contact.name} (${contact.relationship}) requested emergency vault access. You have 24 hours to deny before auto-approval.`,
    type: 'TRUSTED_REQUEST',
    daysLeft: 1,
    status: 'UNREAD',
    createdAt: now.toISOString(),
  });

  saveDb(db);
  res.json({ success: true, contact });
});

app.post('/api/trusted-contacts/:id/respond', (req: Request, res: Response) => {
  const { action } = req.body; // 'APPROVE' | 'DENY'
  const contact = db.trustedContacts.find((c) => c.id === req.params.id);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });

  contact.requestStatus = action === 'APPROVE' ? 'APPROVED' : 'DENIED';
  saveDb(db);
  res.json({ success: true, contact });
});

// 8. Settings
app.get('/api/settings', (req: Request, res: Response) => {
  const user = db.users[0] || defaultSeedUser;
  const userSettings = db.settings[user.id] || {
    emailAlerts: true,
    browserPush: true,
    inAppAlerts: true,
    reminderDays: [60, 30, 7, 0],
  };
  res.json({ settings: userSettings });
});

app.put('/api/settings', (req: Request, res: Response) => {
  const user = db.users[0] || defaultSeedUser;
  db.settings[user.id] = {
    ...db.settings[user.id],
    ...req.body,
  };
  saveDb(db);
  res.json({ settings: db.settings[user.id] });
});

// 9. Full Vault Data Export (ZIP bundle with documents + metadata JSON)
app.get('/api/export', async (req: Request, res: Response) => {
  try {
    const zip = new JSZip();
    const user = db.users[0] || defaultSeedUser;

    const exportMetadata = {
      exportDate: new Date().toISOString(),
      vaultUser: {
        email: user.email,
        name: user.name,
      },
      documentCount: db.documents.length,
      documents: db.documents.map((d) => ({
        id: d.id,
        title: d.title,
        type: d.documentType,
        holderName: d.holderName,
        documentNumber: d.documentNumber,
        issueDate: d.issueDate,
        expiryDate: d.expiryDate,
        noExpiry: d.noExpiry,
        issuer: d.issuer,
        tags: d.tags,
        folder: d.folder,
        notes: d.notes,
        checklist: d.checklist,
        versions: d.versions,
        fileName: d.fileName,
      })),
    };

    zip.file('docvault_manifest.json', JSON.stringify(exportMetadata, null, 2));

    // Add any document attachment files
    const docsFolder = zip.folder('documents');
    for (const doc of db.documents) {
      if (doc.fileData && doc.fileName) {
        const base64Data = doc.fileData.replace(/^data:([a-zA-Z0-9/+-]+);base64,/, '');
        docsFolder?.file(doc.fileName, base64Data, { base64: true });
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=DocVault_Backup.zip');
    res.send(zipBuffer);
  } catch (err: any) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Failed to create export ZIP bundle.' });
  }
});

// ----------------------------------------------------
// VITE DEV MIDDLEWARE / STATIC PRODUCTION SERVING
// ----------------------------------------------------
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DocVault server listening on port ${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer();
