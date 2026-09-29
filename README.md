# DocVault — Document Wallet & Expiry Alerts

DocVault is a secure, client-encrypted document wallet designed to eliminate the panic of expired passports, driving licences, vehicle registrations, insurance policies, or product warranties.

---

## 1. Features

- **Automated Gemini Vision OCR Extraction**: Scan or upload documents from your camera, gallery, or PDF files. Powered by `gemini-3.8-flash` with strict structured JSON schema extraction.
- **Client-Side AES-256-GCM Encryption**: Unique random 256-bit encryption key per document, wrapped via PBKDF2 master key derivation. Server only stores ciphertext.
- **Printable Master Recovery Key**: Physical offline backup sheet generator for zero-knowledge key safety.
- **Attention Summary & Colored Expiry Chips**:
  - **Red**: Expired (e.g., AppleCare Warranty)
  - **Orange**: Expires within 30 days (e.g., Driving Licence)
  - **Yellow**: Expires within 60 days (e.g., Car Insurance)
  - **Green**: Valid (e.g., Indian Passport)
  - **Slate**: Lifetime Validity (e.g., PAN Card)
- **Masked Document Numbers**: Numbers masked by default (`•••• 9841`) with tap-to-reveal toggle.
- **Renewal Checklist & Version Archive**: Step-by-step renewal checklist per document, plus "Mark as Renewed" flow that preserves previous versions in an archive.
- **Smart Expiry Alert Engine**: Automated reminders at 60, 30, and 7 days, on expiry day, and weekly overdue. In-app notification center with 1-day/1-week snooze and dismiss actions.
- **Time-Limited Emergency Share Links**:
  - 128-bit unguessable random tokens
  - Recipient label (e.g. "Mom", "Dr. Sharma")
  - Configurable duration (1 hr, 24 hrs, 7 days, 30 days)
  - Optional 4-digit PIN protection with automatic lockout after 5 failed attempts
  - Watermarked read-only view (`Shared via DocVault — Expires on <Date>`)
  - Instant link revocation and access audit logs
- **Trusted Contacts Flow**: Pre-designated family contacts with a 24-hour grace period dead-man access approval workflow.
- **Full Vault Data Export**: One-click download of all documents and metadata in a standard ZIP archive.
- **Mobile-First PWA**: Installable to home screen on iOS and Android with offline caching and offline status indicator.

---

## 2. Gemini Extraction Prompt & JSON Schema

### Server-Side Prompt (`/server.ts`):
```text
You are DocVault's highly precise document OCR and expiry extraction system.
Carefully inspect the provided image of an official personal document (such as passport, driving licence, vehicle registration (RC), insurance policy, product warranty card, health card, or national ID).

Extract the following information:
1. document_type: Identify the document category. Allowed values: "passport", "driving_licence", "insurance", "warranty", "id_card", "vehicle_rc", "medical", or "other".
2. title: A concise, human-friendly title for the document (e.g. "Republic of India Passport", "HDFC Car Insurance Policy", "Sony TV Extended Warranty").
3. holder_name: Full name of the primary cardholder or insured person, or null if absent.
4. document_number: Official identification or policy number, or null if absent.
5. issue_date: Date of issue in YYYY-MM-DD format, or null if absent.
6. expiry_date: Date of expiry, expiration, or validity end in YYYY-MM-DD format. If this is a lifetime or permanent document, set expiry_date to null.
7. issuer: The issuing authority, company, insurer, or government agency, or null.
8. confidence: A floating number between 0.0 and 1.0 indicating your confidence in the extracted fields.
```

### JSON Schema:
```json
{
  "type": "OBJECT",
  "properties": {
    "document_type": { "type": "STRING" },
    "title": { "type": "STRING" },
    "holder_name": { "type": "STRING" },
    "document_number": { "type": "STRING" },
    "issue_date": { "type": "STRING" },
    "expiry_date": { "type": "STRING" },
    "issuer": { "type": "STRING" },
    "confidence": { "type": "NUMBER" }
  },
  "required": ["document_type", "title", "confidence"]
}
```

---

## 3. Database Schema (`data/db.json`)

- **users**: `id`, `email`, `name`, `passwordHash`, `pinHash`, `pinEnabled`, `recoveryKeyHash`, `createdAt`
- **documents**: `id`, `userId`, `documentType`, `title`, `holderName`, `documentNumber`, `issueDate`, `expiryDate`, `noExpiry`, `issuer`, `confidence`, `tags[]`, `folder`, `notes`, `checklist[]`, `fileData`, `encryptedKey`, `iv`, `versions[]`, `customReminderDays[]`, `createdAt`, `updatedAt`
- **shareLinks**: `id`, `userId`, `token`, `documentIds[]`, `recipientLabel`, `recipientEmail`, `pinHash`, `hasPin`, `failedPinAttempts`, `isLocked`, `expiresAt`, `maxViews`, `viewCount`, `allowDownload`, `revokedAt`, `createdAt`
- **accessLogs**: `id`, `shareLinkId`, `accessedAt`, `ipHash`, `userAgent`, `device`, `result`
- **notifications**: `id`, `userId`, `documentId`, `title`, `message`, `type`, `daysLeft`, `status`, `createdAt`, `snoozedUntil`
- **trustedContacts**: `id`, `userId`, `name`, `email`, `relationship`, `requestStatus`, `requestTimestamp`, `autoApproveAt`

---

## 4. Environment Variables

Define the following in `.env`:
```bash
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
PORT=3000
NODE_ENV=development
```

---

## 5. Running & Deploying

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Testing the Reminder Scheduler
Inside the app:
1. Click the **Notification Bell** icon in the header.
2. Click **Run Reminder Check**.
3. The scheduler will evaluate all documents against today's date and queue alerts.
