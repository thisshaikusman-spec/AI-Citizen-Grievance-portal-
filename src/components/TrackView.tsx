import React, { useState, useEffect } from 'react';
import { useGrievance } from '../context/GrievanceContext.tsx';
import { TrackComplaintPublic, Complaint } from '../types/index.ts';
import { apiFetch, ApiError } from '../lib/api.ts';

export const TrackView: React.FC = () => {
  const { trackQuery, selectedGrievanceId, setActiveTab } = useGrievance();

  const [searchInput, setSearchInput] = useState(selectedGrievanceId || trackQuery || '');
  const [validatedQuery, setValidatedQuery] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [publicData, setPublicData] = useState<TrackComplaintPublic | null>(null);
  const [fullComplaint, setFullComplaint] = useState<Complaint | null>(null);

  // Note addition state
  const [noteText, setNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Sync if trackQuery or selectedGrievanceId changes
  useEffect(() => {
    const target = (trackQuery || selectedGrievanceId || '').trim().toUpperCase();
    if (target) {
      setSearchInput(target);
      executeSearch(target);
    }
  }, [trackQuery, selectedGrievanceId]);

  const executeSearch = async (trackingNo: string) => {
    const cleanNumber = trackingNo.trim().toUpperCase();
    setErrorMessage(null);
    setPublicData(null);
    setFullComplaint(null);

    // Validate format GRV-YYYY-NNNNNN
    const formatRegex = /^GRV-\d{4}-\d{6}$/;
    if (!formatRegex.test(cleanNumber)) {
      setErrorMessage('Please enter a valid tracking number in the format GRV-YYYY-NNNNNN (e.g. GRV-2026-123456).');
      return;
    }

    setIsLoading(true);
    setValidatedQuery(cleanNumber);

    try {
      // 1. Fetch public tracking data
      const publicRes = await apiFetch<TrackComplaintPublic>(`/complaints/track/${cleanNumber}`);
      setPublicData(publicRes);

      // 2. If user is logged in, attempt to fetch full complaint details
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          // Check if complaint is accessible by user
          // First search my complaints or call /complaints
          const myComplaints = await apiFetch<Complaint[]>('/complaints?limit=50&offset=0', { auth: true }).catch(() => []);
          const match = myComplaints.find((c) => c.tracking_number.toUpperCase() === cleanNumber);

          if (match) {
            const detail = await apiFetch<Complaint>(`/complaints/${match.id}`, { auth: true });
            setFullComplaint(detail);
          }
        } catch {
          // Not the owner or non-admin, public tracking view remains shown
        }
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 404) {
        setErrorMessage(`No complaint found with tracking number "${cleanNumber}". Please double-check the number.`);
      } else {
        setErrorMessage(err?.message || 'Failed to retrieve tracking details. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(searchInput);
  };

  // Add note to complaint (owner or admin)
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullComplaint || !noteText.trim()) return;

    setIsSubmittingNote(true);
    setNoteError(null);

    try {
      await apiFetch(`/complaints/${fullComplaint.id}/notes`, {
        method: 'POST',
        auth: true,
        body: { note: noteText.trim() },
      });

      // Refetch full complaint details
      const updated = await apiFetch<Complaint>(`/complaints/${fullComplaint.id}`, { auth: true });
      setFullComplaint(updated);
      setNoteText('');
    } catch (err: any) {
      setNoteError(err?.message || 'Failed to add note.');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Stepper Calculation
  const getStepStatus = (stepIndex: number, currentStatus: string) => {
    const normalized = (currentStatus || '').toLowerCase();

    // 0: Intake / Registered (always completed if record exists)
    if (stepIndex === 0) return 'completed';

    // 1: Triage / Verification
    if (stepIndex === 1) {
      if (normalized === 'needs review') return 'active';
      return 'completed';
    }

    // 2: In Progress
    if (stepIndex === 2) {
      if (normalized === 'in progress') return 'active';
      if (normalized === 'resolved') return 'completed';
      return 'upcoming';
    }

    // 3: Resolved
    if (stepIndex === 3) {
      if (normalized === 'resolved') return 'completed';
      return 'upcoming';
    }

    return 'upcoming';
  };

  const statusVal = fullComplaint?.status || publicData?.status || 'Pending';

  return (
    <div className="w-full py-8 px-4 sm:px-6 md:px-8 max-w-[1100px] mx-auto flex flex-col gap-6">
      {/* Search Header Banner */}
      <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-xl border border-slate-200 flex flex-col gap-4 text-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold text-[#4059aa] uppercase tracking-wider">
              Transparent Civic Registry
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#131b2e] tracking-tight">
              Track Grievance Status
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Enter your official tracking identifier to review live lifecycle progress.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setActiveTab('submit-complaint');
              try {
                window.history.pushState({}, '', '/submit-complaint');
                window.dispatchEvent(new PopStateEvent('popstate'));
              } catch {}
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs sm:text-sm font-semibold rounded-xl transition-all self-start sm:self-auto cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            <span>New Complaint</span>
          </button>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
              search
            </span>
            <input
              type="text"
              required
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
              placeholder="e.g. GRV-2026-123456"
              className="w-full h-12 pl-10 pr-4 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 border border-slate-300 font-mono text-sm sm:text-base font-semibold focus:bg-white focus:ring-2 focus:ring-[#1D4ED8] focus:outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !searchInput.trim()}
            className="h-12 px-6 rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] disabled:bg-slate-400 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shrink-0"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Searching...</span>
              </>
            ) : (
              <span>Track Now</span>
            )}
          </button>
        </form>
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-950/90 border border-red-500/40 text-red-200 text-sm flex items-start gap-3 animate-in fade-in"
        >
          <span className="material-symbols-outlined text-red-400 text-[20px] shrink-0 mt-0.5">
            error
          </span>
          <div className="flex-1">
            <p className="font-semibold text-white">Tracking Notice</p>
            <p className="text-xs text-red-200 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Result Container */}
      {(publicData || fullComplaint) && (
        <div className="flex flex-col gap-6 animate-in fade-in">
          {/* Main Status & Stepper Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 flex flex-col gap-6 text-slate-900">
            {/* Header info row */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Complaint Reference</span>
                <span className="font-mono text-xl sm:text-2xl font-bold text-slate-900">
                  {publicData?.tracking_number || fullComplaint?.tracking_number}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                    statusVal === 'Resolved'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : statusVal === 'In Progress'
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : statusVal === 'Needs Review'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-slate-100 text-slate-800 border-slate-300'
                  }`}
                >
                  {statusVal}
                </span>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Print Slip"
                  aria-label="Print Slip"
                >
                  <span className="material-symbols-outlined text-[20px]">print</span>
                </button>
              </div>
            </div>

            {/* Stepper Progress Bar */}
            <div className="py-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-2">
                {[
                  { label: 'Intake Registered', desc: 'Logged on portal' },
                  { label: 'Under Review', desc: 'AI triage & verification' },
                  { label: 'In Progress', desc: 'Field unit mobilized' },
                  { label: 'Resolved', desc: 'Official closure' },
                ].map((step, idx) => {
                  const state = getStepStatus(idx, statusVal);

                  return (
                    <div key={step.label} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                            state === 'completed'
                              ? 'bg-emerald-600 text-white'
                              : state === 'active'
                              ? 'bg-[#1d4ed8] text-white ring-4 ring-blue-100'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {state === 'completed' ? (
                            <span className="material-symbols-outlined text-[16px]">check</span>
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <div
                          className={`h-1.5 flex-1 rounded-full ${
                            state === 'completed' ? 'bg-emerald-500' : 'bg-slate-200'
                          }`}
                        />
                      </div>
                      <div className="flex flex-col">
                        <span
                          className={`text-xs font-bold ${
                            state === 'completed'
                              ? 'text-slate-900'
                              : state === 'active'
                              ? 'text-[#1d4ed8]'
                              : 'text-slate-400'
                          }`}
                        >
                          {step.label}
                        </span>
                        <span className="text-[11px] text-slate-500 leading-tight">{step.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Public Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</span>
                <p className="text-sm font-bold text-slate-900 mt-1">
                  {publicData?.department || fullComplaint?.department}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</span>
                <p className="text-sm font-bold text-slate-900 mt-1">
                  {publicData?.category || fullComplaint?.category || 'General'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filing Timestamp</span>
                <p className="text-sm font-bold text-slate-900 mt-1">
                  {new Date(publicData?.created_at || fullComplaint?.created_at || '').toLocaleString()}
                </p>
              </div>
            </div>

            {/* Officer Assignment row if available from full complaint */}
            {fullComplaint && (
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-400/40 flex items-center justify-center text-blue-700">
                    <span className="material-symbols-outlined text-[20px]">badge</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-blue-900 uppercase tracking-wider">Assigned Officer</span>
                    <p className="text-sm font-bold text-blue-950">
                      {fullComplaint.assigned_user?.name || (fullComplaint.assigned_to ? `Officer #${fullComplaint.assigned_to}` : 'Pending Assignment')}
                    </p>
                  </div>
                </div>

                {fullComplaint.priority && (
                  <span className="text-xs font-semibold px-3 py-1 bg-white rounded-lg border border-blue-200 text-slate-700">
                    Priority: <span className="font-bold">{fullComplaint.priority}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Full Details Section (When user is owner or admin) */}
          {fullComplaint && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Timeline (from status_history) */}
              <div className="lg:col-span-6 bg-white p-6 rounded-2xl shadow-xl border border-slate-200 flex flex-col gap-4 text-slate-900">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <span className="material-symbols-outlined text-blue-600 text-[22px]">history</span>
                  <h2 className="text-base font-bold text-slate-900">Status History & Audit Trail</h2>
                </div>

                {!fullComplaint.status_history || fullComplaint.status_history.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No status changes recorded yet.</p>
                ) : (
                  <div className="flex flex-col gap-4 pt-1">
                    {fullComplaint.status_history.map((sh, idx) => {
                      const oldLabel = sh.old_status === 'None' ? 'Submitted' : sh.old_status;
                      const timeStr = new Date(sh.changed_at).toLocaleString();

                      return (
                        <div key={sh.id || idx} className="flex gap-3 text-xs">
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 rounded-full bg-blue-600 mt-1 shrink-0" />
                            {idx !== (fullComplaint.status_history?.length || 0) - 1 && (
                              <div className="w-0.5 flex-1 bg-slate-200 my-1" />
                            )}
                          </div>
                          <div className="flex flex-col gap-0.5 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">
                                {oldLabel} → {sh.new_status}
                              </span>
                            </div>
                            <span className="text-slate-500">
                              Changed by <span className="font-semibold text-slate-700">{sh.changed_by || 'Officer'}</span>
                            </span>
                            <span className="text-[11px] text-slate-400">{timeStr}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Notes & Comments Section */}
              <div className="lg:col-span-6 bg-white p-6 rounded-2xl shadow-xl border border-slate-200 flex flex-col gap-4 text-slate-900">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <span className="material-symbols-outlined text-blue-600 text-[22px]">comment</span>
                  <h2 className="text-base font-bold text-slate-900">Official Case Notes</h2>
                </div>

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} className="flex flex-col gap-2">
                  <textarea
                    rows={2}
                    required
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add an update or note to this complaint..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#1d4ed8] focus:outline-none resize-none"
                  />
                  {noteError && <p className="text-[11px] text-red-600 font-medium">{noteError}</p>}
                  <button
                    type="submit"
                    disabled={isSubmittingNote || !noteText.trim()}
                    className="self-end px-4 py-1.5 rounded-lg bg-[#1d4ed8] hover:bg-[#1e40af] disabled:bg-slate-300 text-white text-xs font-semibold transition-all cursor-pointer"
                  >
                    {isSubmittingNote ? 'Posting...' : 'Post Note'}
                  </button>
                </form>

                {/* Notes List */}
                <div className="flex flex-col gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {!fullComplaint.notes || fullComplaint.notes.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No notes added to this case yet.</p>
                  ) : (
                    fullComplaint.notes.map((n) => (
                      <div key={n.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-bold text-slate-800">{n.author || `User #${n.author_id}`}</span>
                          <span>{new Date(n.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap">{n.note}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrackView;
