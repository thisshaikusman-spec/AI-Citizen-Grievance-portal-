import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useGrievance } from '../context/GrievanceContext.tsx';
import { Complaint } from '../types/index.ts';
import { apiFetch, ApiError } from '../lib/api.ts';
import { env } from '../lib/env.ts';

/* ─── Photo file metadata ─── */
interface PhotoFile {
  file: File;
  preview: string;   // object URL for thumbnail preview
  error?: string;    // per-file validation message
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MiB
const MAX_FILES = 3;

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Only JPG, PNG or WebP allowed';
  if (file.size > MAX_BYTES) return `File too large (max 5 MB)`;
  return null;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const SubmitComplaintView: React.FC = () => {
  const { setActiveTab, setTrackQuery, refreshMyComplaints } = useGrievance();

  const userRole = (localStorage.getItem('role') || 'citizen').toLowerCase();
  const isCitizen = userRole === 'citizen' || userRole.includes('citizen');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ward, setWard] = useState('');
  const [landmark, setLandmark] = useState('');

  /* Photo state */
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Submission state */
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdComplaint, setCreatedComplaint] = useState<Complaint | null>(null);
  const [copied, setCopied] = useState(false);

  /* Upload-retry state (complaint was saved but photos failed) */
  const [pendingUploadId, setPendingUploadId] = useState<number | null>(null);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);

  /* Revoke preview URLs when photos change / component unmounts */
  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Add photos from a FileList ─── */
  const addFiles = useCallback(
    (fileList: FileList) => {
      const incoming = Array.from(fileList);
      const existing = photos.length;
      const newPhotos: PhotoFile[] = [];

      for (const file of incoming) {
        if (existing + newPhotos.length >= MAX_FILES) break;
        const error = validateFile(file) ?? undefined;
        const preview = error ? '' : URL.createObjectURL(file);
        newPhotos.push({ file, preview, error });
      }

      setPhotos((prev) => [...prev, ...newPhotos]);
    },
    [photos]
  );

  const removePhoto = (idx: number) => {
    setPhotos((prev) => {
      const updated = [...prev];
      const removed = updated.splice(idx, 1)[0];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return updated;
    });
  };

  /* ─── Drag-and-drop handlers ─── */
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  /* ─── Quick-fill presets ─── */
  const quickPresets = [
    {
      label: 'Dark Streetlight',
      title: 'Main junction streetlight dark for 3 consecutive nights',
      desc: 'The streetlight fixture at the corner is completely non-functional causing unsafe conditions for nighttime pedestrians.',
    },
    {
      label: 'Deep Pothole',
      title: 'Severe road crater pothole near pedestrian crossing',
      desc: 'A 2-foot wide pothole crater has opened following heavy rains. Two-wheelers are swerving into oncoming traffic to avoid it.',
    },
    {
      label: 'Contaminated Water',
      title: 'Yellow muddy water discharging from municipal tap line',
      desc: 'Residential tap connection is supplying brown, foul-smelling water since morning. Immediate pipe inspection needed.',
    },
    {
      label: 'Voter List Query',
      title: 'Citizen name missing from revised electoral roll',
      desc: 'Verified citizen resident unable to locate registration in the published draft electoral roll for the upcoming local election.',
    },
  ];

  const handleApplyPreset = (preset: typeof quickPresets[0]) => {
    setTitle(preset.title);
    setDescription(preset.desc);
    setErrorMessage(null);
  };

  const handleCopy = (text: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /* ─── Upload photos to an already-created complaint ─── */
  const uploadPhotos = async (complaintId: number): Promise<void> => {
    const valid = photos.filter((p) => !p.error);
    if (valid.length === 0) return;

    setUploadProgress({ done: 0, total: valid.length });

    for (let i = 0; i < valid.length; i++) {
      const form = new FormData();
      form.append('files', valid[i].file);

      const token = localStorage.getItem('access_token') ?? '';
      const baseUrl = env.VITE_API_URL;
      const res = await fetch(`${baseUrl}/complaints/${complaintId}/evidence`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg = data?.detail ?? `Upload failed (HTTP ${res.status})`;
        throw new Error(msg);
      }

      setUploadProgress({ done: i + 1, total: valid.length });
    }

    setUploadProgress(null);
  };

  /* ─── Main submit handler ─── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setPhotoUploadError(null);

    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    const combinedText = trimmedTitle ? `${trimmedTitle}: ${trimmedDesc}` : trimmedDesc;

    if (combinedText.length < 10) {
      setErrorMessage('Complaint text must be at least 10 characters long. Please describe the issue in detail.');
      return;
    }
    if (combinedText.length > 2000) {
      setErrorMessage('Complaint text exceeds the 2000-character limit. Please summarise your issue.');
      return;
    }

    const locParts = [ward.trim(), landmark.trim()].filter(Boolean);
    const location = locParts.length > 0 ? locParts.join(', ') : undefined;

    setIsSubmitting(true);

    try {
      /* Step 1 – create the complaint */
      const response = await apiFetch<Complaint>('/complaints', {
        method: 'POST',
        auth: true,
        body: {
          text: combinedText,
          location: location || undefined,
        },
      });

      setCreatedComplaint(response);
      refreshMyComplaints();

      /* Step 2 – upload photos (non-blocking on complaint success) */
      try {
        await uploadPhotos(response.id);
      } catch (uploadErr: any) {
        /* Complaint is safe; only photos failed */
        setPendingUploadId(response.id);
        setPhotoUploadError(uploadErr?.message ?? 'Photo upload failed. You can retry below.');
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setErrorMessage('Only registered citizens can submit complaints. Administrators and officers cannot file citizen grievances.');
        } else {
          setErrorMessage(err.message || 'Failed to submit grievance. Please verify your details.');
        }
      } else {
        setErrorMessage(err?.message || 'Cannot reach the server. Check your connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ─── Retry evidence upload ─── */
  const handleRetryUpload = async () => {
    if (!pendingUploadId) return;
    setPhotoUploadError(null);
    try {
      await uploadPhotos(pendingUploadId);
      setPendingUploadId(null);
    } catch (err: any) {
      setPhotoUploadError(err?.message ?? 'Retry failed.');
    }
  };

  /* ══════════ Citizens-only guard ══════════ */
  if (!isCitizen) {
    return (
      <div className="w-full py-12 px-4 sm:px-6 md:px-8 max-w-[800px] mx-auto">
        <div className="bg-slate-950/70 backdrop-blur-md rounded-2xl p-8 border border-white/15 text-white shadow-xl text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <span className="material-symbols-outlined text-[36px]">shield_lock</span>
          </div>
          <h1 className="text-2xl font-bold">Citizens Only Portal</h1>
          <p className="text-slate-300 max-w-md text-sm">
            Only registered citizens can submit complaints through this intake gateway. Your current role is{' '}
            <span className="font-semibold text-blue-300 capitalize">{userRole}</span>.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            {userRole === 'admin' && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('admin');
                  try {
                    window.history.pushState({}, '', '/admin');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  } catch {}
                }}
                className="px-5 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-semibold rounded-xl transition-all cursor-pointer"
              >
                Go to Admin Console
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                try {
                  window.history.pushState({}, '', '/login');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                } catch {}
              }}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-slate-200 text-sm font-semibold rounded-xl transition-all cursor-pointer border border-white/15"
            >
              Sign In as Citizen
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════ Success view ══════════ */
  if (createdComplaint) {
    const isNeedsReview = createdComplaint.status === 'Needs Review';
    const confidencePercent = Math.round((createdComplaint.confidence || 0) * 100);

    return (
      <div className="w-full py-8 px-4 sm:px-6 md:px-8 max-w-[800px] mx-auto flex flex-col gap-6">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden text-slate-900">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-blue-950 p-6 sm:p-8 text-white flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 mb-3 shadow-inner">
              <span className="material-symbols-outlined text-[36px]">check_circle</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Grievance Registered Successfully</h1>
            <p className="text-slate-300 text-sm mt-1">
              Your issue has been evaluated by the AI triage engine and logged on the civic registry.
            </p>

            {/* Tracking Number Badge */}
            <div className="mt-5 p-3 px-5 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center gap-3">
              <span className="text-xs uppercase tracking-wider text-slate-300 font-semibold">Tracking Number:</span>
              <span className="font-mono text-lg sm:text-xl font-bold text-white tracking-wider">
                {createdComplaint.tracking_number}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(createdComplaint.tracking_number)}
                aria-label="Copy Tracking Number"
                className="p-1.5 hover:bg-white/15 rounded-lg text-blue-300 hover:text-white transition-colors cursor-pointer"
                title="Copy tracking number"
              >
                <span className="material-symbols-outlined text-[19px]">
                  {copied ? 'done' : 'content_copy'}
                </span>
              </button>
            </div>
            {copied && <span className="text-xs text-emerald-300 mt-1 font-medium">Copied to clipboard!</span>}
          </div>

          {/* AI Result Card */}
          <div className="p-6 sm:p-8 flex flex-col gap-6">
            {/* Photo upload partial-failure banner */}
            {photoUploadError && (
              <div
                role="alert"
                className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-sm flex items-start gap-3"
              >
                <span className="material-symbols-outlined text-amber-600 text-[22px] shrink-0 mt-0.5">warning</span>
                <div className="flex-1">
                  <p className="font-semibold">Complaint submitted, but photo upload failed.</p>
                  <p className="text-xs mt-0.5">{photoUploadError}</p>
                  <button
                    type="button"
                    onClick={handleRetryUpload}
                    className="mt-2 px-4 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg cursor-pointer"
                  >
                    Retry Upload
                  </button>
                </div>
              </div>
            )}

            {/* Needs Review Alert */}
            {isNeedsReview && (
              <div
                role="alert"
                className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-sm flex items-start gap-3"
              >
                <span className="material-symbols-outlined text-amber-600 text-[22px] shrink-0 mt-0.5">help</span>
                <div>
                  <h2 className="font-bold text-amber-950">Our AI was not sure. An officer will review it.</h2>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Your complaint has been safely queued for manual verification by the designated zonal desk.
                  </p>
                </div>
              </div>
            )}

            {/* Result Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">{createdComplaint.category || 'Other'}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Department</span>
                <p className="text-base font-bold text-blue-700 mt-0.5">{createdComplaint.department}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority Level</span>
                <p className="text-base font-bold mt-0.5 flex items-center gap-1.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      createdComplaint.priority === 'High'
                        ? 'bg-red-500'
                        : createdComplaint.priority === 'Medium'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <span>{createdComplaint.priority} Priority</span>
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Confidence</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">{confidencePercent}% Match</p>
              </div>
            </div>

            {/* Status */}
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-blue-900 uppercase tracking-wider">Current Status</span>
                <p className="text-lg font-bold text-blue-950 mt-0.5">{createdComplaint.status}</p>
              </div>
              <span className="material-symbols-outlined text-blue-600 text-[28px]">
                {createdComplaint.status === 'Resolved' ? 'task_alt' : 'hourglass_top'}
              </span>
            </div>

            {/* Description */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filed Issue Description</span>
              <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{createdComplaint.text}</p>
              {createdComplaint.location && (
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">location_on</span>
                  <span>Location: {createdComplaint.location}</span>
                </p>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setTrackQuery(createdComplaint.tracking_number);
                  setActiveTab('track-complaint');
                  try {
                    window.history.pushState({}, '', '/track-complaint');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  } catch {}
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex-1 min-w-[200px] h-11 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">search</span>
                <span>Track This Complaint</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('profile');
                  try {
                    window.history.pushState({}, '', '/dashboard');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  } catch {}
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex-1 min-w-[200px] h-11 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-300"
              >
                <span className="material-symbols-outlined text-[18px]">dashboard</span>
                <span>View My Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCreatedComplaint(null);
                  setTitle('');
                  setDescription('');
                  setWard('');
                  setLandmark('');
                  setPhotos([]);
                  setPhotoUploadError(null);
                  setPendingUploadId(null);
                  setErrorMessage(null);
                }}
                className="w-full text-xs font-medium text-slate-500 hover:text-slate-800 text-center py-2 cursor-pointer transition-colors"
              >
                + Submit another grievance
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════ Main form view ══════════ */
  const validPhotos = photos.filter((p) => !p.error);
  const canAddMore = photos.length < MAX_FILES;

  return (
    <div className="w-full py-8 px-4 sm:px-6 md:px-8 max-w-[1000px] mx-auto flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 text-center sm:text-left">
        <span className="text-[11px] font-bold text-[#4059aa] uppercase tracking-wider">
          Citizen Intake Gateway
        </span>
        <h1 className="text-[26px] sm:text-[32px] font-bold text-[#131b2e] tracking-tight">
          File a Public Grievance
        </h1>
        <p className="text-[15px] text-[#434655]">
          Your grievance is evaluated by natural language triage and routed directly to the regional nodal engineer.
        </p>
      </div>

      {/* Preset Chips */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-2">
        <span className="text-xs font-semibold text-slate-500">Quick-Fill Presets:</span>
        <div className="flex flex-wrap gap-2">
          {quickPresets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-medium transition-colors cursor-pointer border border-slate-200"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Intake Form */}
      <form onSubmit={handleSubmit} noValidate className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200 flex flex-col gap-5 text-slate-900">
        {errorMessage && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-red-950/90 border border-red-500/40 text-red-200 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in"
          >
            <span className="material-symbols-outlined text-[19px] text-red-400 shrink-0 mt-0.5">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="comp-title" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Issue Title / Headline *
          </label>
          <input
            id="comp-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Hazardous dangling live electrical wire near Sector 9 park"
            className="w-full h-11 px-3.5 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-[#1D4ED8] focus:outline-none min-h-[44px]"
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="comp-desc" className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span>Detailed Problem Description *</span>
            <span className="text-[11px] font-normal text-slate-500">10 - 2000 characters</span>
          </label>
          <textarea
            id="comp-desc"
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please detail the location, severity, duration of the problem, and any immediate hazards to the neighborhood..."
            className="w-full p-3.5 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-[#1D4ED8] focus:outline-none resize-y min-h-[100px]"
          />
        </div>

        {/* Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="comp-ward" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Ward / Locality
            </label>
            <input
              id="comp-ward"
              type="text"
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              placeholder="e.g. Ward 42, North Zone"
              className="w-full h-11 px-3.5 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-[#1D4ED8] focus:outline-none min-h-[44px]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="comp-landmark" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Nearby Landmark
            </label>
            <input
              id="comp-landmark"
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="e.g. Opposite Community Hall, Gate 2"
              className="w-full h-11 px-3.5 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-[#1D4ED8] focus:outline-none min-h-[44px]"
            />
          </div>
        </div>

        {/* ─── Photo Upload Drop-zone ─── */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span>Add Photos <span className="font-normal text-slate-400">(optional, up to 3)</span></span>
            <span className="text-[11px] font-normal text-slate-500">JPG · PNG · WebP · max 5 MB each</span>
          </label>

          {/* Drop zone — only shown when we can still add files */}
          {canAddMore && (
            <div
              role="button"
              tabIndex={0}
              aria-label="Photo upload area — drag and drop or click to select"
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
              className={`
                relative flex flex-col items-center justify-center gap-2 py-7 px-4
                rounded-xl border-2 border-dashed cursor-pointer select-none
                transition-colors duration-150
                ${isDragging
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-slate-300 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/40'}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                aria-hidden="true"
                onChange={(e) => { if (e.target.files) { addFiles(e.target.files); e.target.value = ''; } }}
              />
              <span className="material-symbols-outlined text-[36px] text-slate-400">add_photo_alternate</span>
              <p className="text-sm font-medium text-slate-600">
                Drag &amp; drop photos here, or{' '}
                <span className="text-blue-600 underline underline-offset-2">browse</span>
              </p>
              <p className="text-xs text-slate-400">
                {photos.length}/{MAX_FILES} added
              </p>
            </div>
          )}

          {/* Thumbnail list */}
          {photos.length > 0 && (
            <ul className="flex flex-col gap-2 mt-1">
              {photos.map((photo, idx) => (
                <li
                  key={idx}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border ${
                    photo.error
                      ? 'border-red-300 bg-red-50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  {/* Thumbnail */}
                  {photo.preview ? (
                    <img
                      src={photo.preview}
                      alt={photo.file.name}
                      className="w-12 h-12 object-cover rounded-lg shrink-0 border border-slate-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[22px] text-slate-400">broken_image</span>
                    </div>
                  )}

                  {/* File meta */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{photo.file.name}</p>
                    <p className="text-xs text-slate-500">{humanSize(photo.file.size)}</p>
                    {photo.error && (
                      <p className="text-xs text-red-600 font-medium mt-0.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">error</span>
                        {photo.error}
                      </p>
                    )}
                  </div>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    aria-label={`Remove ${photo.file.name}`}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Upload progress */}
          {uploadProgress && (
            <div className="mt-1 flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Uploading photos…</span>
                <span>{uploadProgress.done} / {uploadProgress.total}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || photos.some((p) => p.error)}
            className={`w-full h-12 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[48px] cursor-pointer ${
              isSubmitting
                ? 'bg-blue-700/80 cursor-wait'
                : photos.some((p) => p.error)
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-[#1D4ED8] hover:bg-[#1E40AF] active:scale-[0.99]'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2.5">
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span className="font-semibold tracking-wide">
                  {uploadProgress
                    ? `Uploading photo ${uploadProgress.done} of ${uploadProgress.total}…`
                    : 'AI is analysing…'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                <span>Submit Grievance to AI Engine</span>
              </div>
            )}
          </button>

          {photos.some((p) => p.error) && (
            <p className="text-xs text-red-500 text-center mt-2">
              Remove invalid photos before submitting.
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

export default SubmitComplaintView;
