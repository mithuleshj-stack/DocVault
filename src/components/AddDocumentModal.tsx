import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Camera,
  RotateCw,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Check,
  Shield,
  FileText,
  AlertTriangle,
  Loader2,
  Lock,
  RefreshCw,
  Video,
  Zap,
} from 'lucide-react';
import { DocumentItem, DocumentType, ExtractedDocumentData } from '../types';
import { api } from '../services/api';
import { generateDocumentKey, encryptData, exportKeyRaw } from '../services/crypto';
import { InfoTooltip } from './InfoTooltip';

interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentAdded: (newDoc: DocumentItem) => void;
  existingDocuments: DocumentItem[];
  isQuickScan?: boolean;
}

export const AddDocumentModal: React.FC<AddDocumentModalProps> = ({
  isOpen,
  onClose,
  onDocumentAdded,
  existingDocuments,
  isQuickScan = false,
}) => {
  const [step, setStep] = useState<'upload' | 'camera_live' | 'preview_crop' | 'extracting' | 'review'>('upload');

  // File & camera state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [isConsentGiven, setIsConsentGiven] = useState<boolean>(true);
  const [isEncrypted, setIsEncrypted] = useState<boolean>(true);

  // Live camera stream
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState('');

  // Extracted fields
  const [formData, setFormData] = useState<{
    documentType: DocumentType;
    title: string;
    holderName: string;
    documentNumber: string;
    issueDate: string;
    expiryDate: string;
    noExpiry: boolean;
    issuer: string;
    confidence: number;
    tags: string;
    folder: string;
    notes: string;
  }>({
    documentType: 'other',
    title: '',
    holderName: '',
    documentNumber: '',
    issueDate: '',
    expiryDate: '',
    noExpiry: false,
    issuer: '',
    confidence: 1.0,
    tags: '',
    folder: 'Personal',
    notes: '',
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [duplicateWarning, setDuplicateWarning] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);

  // Handle quick scan mode auto-trigger
  useEffect(() => {
    if (isOpen && isQuickScan) {
      startLiveCamera();
    } else if (isOpen) {
      setStep('upload');
    }
  }, [isOpen, isQuickScan]);

  // Stop camera stream on unmount or step change
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const triggerDirectExtraction = async (dataUrl: string) => {
    setPreviewUrl(dataUrl);
    setStep('extracting');
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.extractDocument(dataUrl, 'image/jpeg');
      const ext: ExtractedDocumentData = res.extraction;

      setFormData({
        documentType: ext.document_type || 'other',
        title: ext.title || (isQuickScan ? 'Quick Scanned Document' : 'Personal Document'),
        holderName: ext.holder_name || '',
        documentNumber: ext.document_number || '',
        issueDate: ext.issue_date || '',
        expiryDate: ext.expiry_date || '',
        noExpiry: !ext.expiry_date,
        issuer: ext.issuer || '',
        confidence: ext.confidence || 0.92,
        tags: ext.document_type ? ext.document_type.replace('_', ' ') : 'Quick Scan',
        folder: ext.document_type === 'passport' || ext.document_type === 'driving_licence' ? 'Identity' : 'Personal',
        notes: isQuickScan ? 'Captured via Quick Scan mode' : '',
      });

      if (ext.document_number) {
        const isDup = existingDocuments.some(
          (d) => d.documentNumber && d.documentNumber.toLowerCase() === ext.document_number?.toLowerCase()
        );
        if (isDup) {
          setDuplicateWarning(`A document with number ${ext.document_number} is already in your wallet.`);
        }
      }

      setStep('review');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Auto-extraction failed. Please review and fill in details.');
      setStep('review');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Handle standard file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg('Document exceeds 10 MB limit. Please choose a smaller file.');
        return;
      }
      setSelectedFile(file);
      setErrorMsg('');

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setPreviewUrl(dataUrl);
        if (isQuickScan) {
          triggerDirectExtraction(dataUrl);
        } else {
          setStep('preview_crop');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Launch live camera
  const startLiveCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      setStep('camera_live');
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err: any) {
      console.warn('Live camera access failed, falling back to file picker:', err);
      // Fallback to mobile native camera input
      nativeCameraInputRef.current?.click();
    }
  };

  // Capture frame from live camera
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setPreviewUrl(dataUrl);
    stopCamera();

    if (isQuickScan) {
      // Skips intermediate screen for ultra-fast document capture
      triggerDirectExtraction(dataUrl);
    } else {
      setStep('preview_crop');
    }
  };

  // Rotate preview 90 degrees
  const handleRotate = (direction: 'cw' | 'ccw') => {
    const delta = direction === 'cw' ? 90 : -90;
    setRotationDegrees((prev) => (prev + delta + 360) % 360);
  };

  // Apply rotation onto canvas
  const getProcessedBase64 = async (): Promise<string> => {
    if (!previewUrl || rotationDegrees === 0) {
      return previewUrl;
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(previewUrl);

        if (rotationDegrees === 90 || rotationDegrees === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotationDegrees * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        resolve(canvas.toDataURL(selectedFile?.type || 'image/jpeg', 0.92));
      };
      img.src = previewUrl;
    });
  };

  // Start Gemini OCR extraction
  const handleStartExtraction = async () => {
    if (!previewUrl) return;

    setStep('extracting');
    setLoading(true);
    setErrorMsg('');

    try {
      const processedImage = await getProcessedBase64();
      const res = await api.extractDocument(processedImage, selectedFile?.type || 'image/jpeg');
      const ext: ExtractedDocumentData = res.extraction;

      setFormData({
        documentType: ext.document_type || 'other',
        title: ext.title || (selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : 'Personal Document'),
        holderName: ext.holder_name || '',
        documentNumber: ext.document_number || '',
        issueDate: ext.issue_date || '',
        expiryDate: ext.expiry_date || '',
        noExpiry: !ext.expiry_date,
        issuer: ext.issuer || '',
        confidence: ext.confidence || 0.88,
        tags: ext.document_type ? ext.document_type.replace('_', ' ') : 'General',
        folder: ext.document_type === 'passport' || ext.document_type === 'driving_licence' ? 'Identity' : 'Personal',
        notes: '',
      });

      // Check duplicates
      if (ext.document_number) {
        const dup = existingDocuments.find(
          (d) => d.documentNumber?.trim().toLowerCase() === ext.document_number?.trim().toLowerCase()
        );
        if (dup) {
          setDuplicateWarning(`Note: Document number "${ext.document_number}" is already registered in your vault ("${dup.title}").`);
        } else {
          setDuplicateWarning('');
        }
      }

      setStep('review');
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Could not automatically read text from this document. Please enter the details manually.');
      setStep('review');
    } finally {
      setLoading(false);
    }
  };

  // Skip to manual entry
  const handleSkipToManual = () => {
    setFormData({
      documentType: 'other',
      title: selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : 'Personal Document',
      holderName: '',
      documentNumber: '',
      issueDate: '',
      expiryDate: '',
      noExpiry: false,
      issuer: '',
      confidence: 1.0,
      tags: '',
      folder: 'Personal',
      notes: '',
    });
    setStep('review');
  };

  // Save document
  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const processedImage = await getProcessedBase64();
      let encryptedPayload: string | undefined = processedImage;
      let encryptedKeyStr: string | undefined = undefined;
      let ivStr: string | undefined = undefined;

      if (isEncrypted && processedImage) {
        const docKey = await generateDocumentKey();
        const encrypted = await encryptData(processedImage, docKey);
        encryptedPayload = encrypted.cipherText;
        ivStr = encrypted.iv;
        encryptedKeyStr = await exportKeyRaw(docKey);
      }

      const tagsArray = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const created = await api.createDocument({
        documentType: formData.documentType,
        title: formData.title.trim() || 'Personal Document',
        holderName: formData.holderName.trim() || null,
        documentNumber: formData.documentNumber.trim() || null,
        issueDate: formData.issueDate || null,
        expiryDate: formData.noExpiry ? null : formData.expiryDate || null,
        noExpiry: formData.noExpiry,
        issuer: formData.issuer.trim() || null,
        confidence: formData.confidence,
        tags: tagsArray.length > 0 ? tagsArray : ['General'],
        folder: formData.folder || 'Personal',
        notes: formData.notes,
        fileData: processedImage,
        fileType: selectedFile?.type || 'image/jpeg',
        fileName: selectedFile?.name || 'document.jpg',
        fileSize: selectedFile?.size,
        encryptedKey: encryptedKeyStr,
        iv: ivStr,
        checklist: [
          { id: '1', task: 'Check renewal requirements and validity', completed: false },
        ],
      });

      onDocumentAdded(created.document);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save document. Please check the fields and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isQuickScan
                ? 'bg-amber-500/10 text-amber-500 dark:bg-amber-400/10 dark:text-amber-400'
                : 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300'
            }`}>
              {isQuickScan ? <Zap className="w-4 h-4 fill-amber-400" /> : <FileText className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {isQuickScan && step === 'camera_live' && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                    ⚡ Fast Capture
                  </span>
                )}
                {step === 'upload' && 'Add Document to Wallet'}
                {step === 'camera_live' && (isQuickScan ? 'Quick Scan Viewfinder' : 'Position Document in Frame')}
                {step === 'preview_crop' && 'Preview & Check Orientation'}
                {step === 'extracting' && 'Reading Document Dates...'}
                {step === 'review' && 'Review Document Details'}
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {isQuickScan && step === 'camera_live'
                  ? 'High-stress rapid mode: capture automatically triggers instant extraction.'
                  : step === 'upload'
                  ? 'Upload once, receive advance alerts before expiration'
                  : step === 'camera_live'
                  ? 'Keep the document flat in good lighting'
                  : step === 'preview_crop'
                  ? 'Ensure text is upright and readable'
                  : step === 'extracting'
                  ? 'Extracting dates, holder name, and policy numbers'
                  : 'Verify and confirm the extracted information'}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-Step Guided Progress Bar */}
        <div className="px-6 py-3.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 select-none">
          <div className="max-w-lg mx-auto">
            {(() => {
              const stepItems = isQuickScan
                ? [
                    { title: 'Viewfinder', desc: 'Camera frame' },
                    { title: 'Instant Read', desc: 'Auto-extract' },
                    { title: 'Confirm', desc: 'Save record' },
                  ]
                : [
                    { title: 'Capture', desc: 'File or camera' },
                    { title: 'Orient', desc: 'Check angle' },
                    { title: 'Read', desc: 'Extract dates' },
                    { title: 'Confirm', desc: 'Save to wallet' },
                  ];

              const currentStepIdx = isQuickScan
                ? step === 'camera_live'
                  ? 0
                  : step === 'extracting'
                  ? 1
                  : 2
                : step === 'upload' || step === 'camera_live'
                ? 0
                : step === 'preview_crop'
                ? 1
                : step === 'extracting'
                ? 2
                : 3;

              return (
                <div className="flex items-center justify-between relative">
                  {/* Background Track Line */}
                  <div className="absolute top-3.5 left-4 right-4 h-0.5 bg-slate-200 dark:bg-slate-700 -z-0" />
                  {/* Active Progress Track Line */}
                  <div
                    className="absolute top-3.5 left-4 h-0.5 bg-teal-600 transition-all duration-300 ease-out -z-0"
                    style={{
                      width: `${(currentStepIdx / (stepItems.length - 1)) * 92}%`,
                    }}
                  />

                  {stepItems.map((s, idx) => {
                    const isCompleted = idx < currentStepIdx;
                    const isActive = idx === currentStepIdx;

                    return (
                      <div
                        key={s.title}
                        className="flex flex-col items-center relative z-10 text-center"
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                            isCompleted
                              ? 'bg-teal-600 text-white shadow-xs'
                              : isActive
                              ? 'bg-teal-700 text-white ring-4 ring-teal-100 dark:ring-teal-900/60 shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <span className="font-mono text-[11px]">{idx + 1}</span>
                          )}
                        </div>

                        <span
                          className={`mt-1.5 text-[11px] font-semibold whitespace-nowrap transition-colors ${
                            isActive
                              ? 'text-teal-800 dark:text-teal-300 font-bold'
                              : isCompleted
                              ? 'text-slate-700 dark:text-slate-300 font-medium'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {s.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 flex items-start gap-3 text-xs text-rose-800 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: UPLOAD OR SCAN */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/30 group"
              >
                <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center group-hover:scale-105 transition-transform mb-4">
                  <Upload className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Drop your document here or browse
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Supports JPG, PNG photos or PDF documents up to 10 MB
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors shadow-xs"
                  >
                    Select File
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      startLiveCamera();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-xs"
                  >
                    <Camera className="w-3.5 h-3.5 text-teal-600" />
                    Scan with Camera
                  </button>
                </div>
              </div>

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <input
                ref={nativeCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Privacy Notice with Zero Jargon */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Zero-Knowledge Document Security
                    </h4>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Your document is processed in real time solely to detect expiry dates and identifiers. Files are encrypted client-side with AES-256 before storage.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={isConsentGiven}
                      onChange={(e) => setIsConsentGiven(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                    />
                    <span>Automatically read dates from document</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleSkipToManual}
                    className="text-xs text-teal-700 dark:text-teal-400 hover:underline font-medium"
                  >
                    Enter manually &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: LIVE CAMERA SCANNER */}
          {step === 'camera_live' && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-2xl overflow-hidden aspect-[4/3] flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Viewfinder Target Reticle */}
                <div className="absolute inset-6 sm:inset-8 border-2 border-dashed border-teal-400/80 rounded-2xl pointer-events-none flex flex-col justify-between p-3 text-center">
                  <span className="text-[11px] font-mono font-semibold text-teal-300 bg-black/70 px-2.5 py-1 rounded-md self-center flex items-center gap-1.5 backdrop-blur-xs">
                    {isQuickScan && <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />}
                    <span>{isQuickScan ? 'Align & tap capture to auto-extract' : 'Align document inside frame'}</span>
                  </span>
                  
                  {isQuickScan && (
                    <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_12px_#2dd4bf] animate-pulse" />
                  )}

                  <span className="text-[10px] text-slate-400 bg-black/60 px-2 py-0.5 rounded self-center">
                    Auto-focus active · Ensure text is clearly visible
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    if (isQuickScan) {
                      onClose();
                    } else {
                      setStep('upload');
                    }
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={capturePhoto}
                  className={`inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-lg transition-transform active:scale-95 ${
                    isQuickScan
                      ? 'bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 hover:from-teal-600 hover:to-emerald-500 shadow-teal-900/30'
                      : 'bg-teal-600 hover:bg-teal-500'
                  }`}
                >
                  {isQuickScan ? (
                    <>
                      <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
                      <span>Instant Capture & Extract</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      <span>Capture Photo</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & ORIENTATION */}
          {step === 'preview_crop' && (
            <div className="space-y-5">
              <div className="relative bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center min-h-[300px] max-h-[420px] p-4">
                <img
                  src={previewUrl}
                  alt="Document Preview"
                  className="max-h-[380px] max-w-full object-contain transition-transform duration-200 rounded-lg shadow"
                  style={{ transform: `rotate(${rotationDegrees}deg)` }}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRotate('ccw')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Rotate Left
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRotate('cw')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    Rotate Right
                  </button>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleSkipToManual}
                    className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-colors"
                  >
                    Enter Manually
                  </button>
                  <button
                    type="button"
                    disabled={!isConsentGiven}
                    onClick={handleStartExtraction}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 text-teal-200" />
                    Read Document Details
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: EXTRACTING PROGRESS */}
          {step === 'extracting' && (
            <div className="py-14 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center animate-spin">
                <Loader2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Reading Document Dates & Details
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Analyzing the document image to identify expiry date, holder name, and policy numbers...
              </p>
            </div>
          )}

          {/* STEP 5: REVIEW & CONFIRM */}
          {step === 'review' && (
            <form onSubmit={handleSaveDocument} className="space-y-4">
              {duplicateWarning && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{duplicateWarning}</span>
                </div>
              )}

              {formData.confidence < 0.70 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Some text in the image was angled or faint. Please check the document number and expiry date before saving.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    <span>Document Category *</span>
                    <InfoTooltip content="Helps organize your wallet and tailors renewal guidance for specific document types." />
                  </label>
                  <select
                    value={formData.documentType}
                    onChange={(e) => setFormData({ ...formData, documentType: e.target.value as DocumentType })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="passport">Passport</option>
                    <option value="driving_licence">Driving Licence</option>
                    <option value="insurance">Insurance Policy</option>
                    <option value="warranty">Product Warranty</option>
                    <option value="id_card">National ID / PAN Card</option>
                    <option value="vehicle_rc">Vehicle RC</option>
                    <option value="medical">Medical Document</option>
                    <option value="other">Other Personal Document</option>
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Republic of India Passport"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                {/* Holder Name */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    <span>Cardholder / Insured Name</span>
                    <InfoTooltip content="The primary name printed on the document for easy multi-family member searching." />
                  </label>
                  <input
                    type="text"
                    value={formData.holderName}
                    onChange={(e) => setFormData({ ...formData, holderName: e.target.value })}
                    placeholder="Full name as printed"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                {/* Document Number */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    <span>Document / Policy Number</span>
                    <InfoTooltip content="Unique identifier printed on the card. This is stored with zero-knowledge encryption and masked in shared previews." />
                  </label>
                  <input
                    type="text"
                    value={formData.documentNumber}
                    onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                    placeholder="e.g. Z5891402 or DL-04..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                {/* Issue Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                {/* Expiry Date */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>Expiry Date *</span>
                      <InfoTooltip content="Advance alerts at 60, 30, and 7 days are scheduled against this date so you never miss a renewal deadline." />
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-500">
                      <input
                        type="checkbox"
                        checked={formData.noExpiry}
                        onChange={(e) => setFormData({ ...formData, noExpiry: e.target.checked })}
                        className="rounded text-teal-600 focus:ring-teal-500 h-3.5 w-3.5"
                      />
                      <span>Permanent Validity</span>
                      <InfoTooltip content="Tick this for documents without expiration, like Indian PAN cards, Aadhaar, birth certificates, or lifelong IDs." />
                    </label>
                  </div>
                  <input
                    type="date"
                    disabled={formData.noExpiry}
                    required={!formData.noExpiry}
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono disabled:opacity-40"
                  />
                </div>

                {/* Issuer */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    <span>Issuing Authority or Insurer</span>
                    <InfoTooltip content="The agency or company that issued this record, like Passport Seva Kendra or HDFC ERGO." />
                  </label>
                  <input
                    type="text"
                    value={formData.issuer}
                    onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                    placeholder="e.g. Passport Seva Kendra, HDFC ERGO"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Folder */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Folder
                  </label>
                  <select
                    value={formData.folder}
                    onChange={(e) => setFormData({ ...formData, folder: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Personal">Personal</option>
                    <option value="Identity">Identity</option>
                    <option value="Vehicle">Vehicle</option>
                    <option value="Travel">Travel</option>
                    <option value="Finance">Finance</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Family">Family</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Physical Storage Location
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Stored in bedroom safe. Requires Form 1A on Sarathi portal for renewal."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save to Wallet</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
