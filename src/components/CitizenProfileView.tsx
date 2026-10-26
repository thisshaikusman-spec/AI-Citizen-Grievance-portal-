import React, { useState, useEffect } from 'react';
import { useGrievance } from '../context/GrievanceContext.tsx';
import { Complaint, AuthMe } from '../types/index.ts';
import { apiFetch, ApiError } from '../lib/api.ts';

export const CitizenProfileView: React.FC = () => {
  const {
    currentUser,
    setCurrentUser,
    myComplaints,
    isComplaintsLoading,
    complaintsError,
    refreshMyComplaints,
    setActiveTab,
    setTrackQuery,
  } = useGrievance();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedComplaintId, setSelectedComplaintId] = useState<number | null>(null);
  const [detailComplaint, setDetailComplaint] = useState<Complaint | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Note form state in detail modal
  const [noteText, setNoteText] = useState('');
  const [isPostingNote, setIsPostingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    refreshMyComplaints();
    if (!currentUser) {
      apiFetch<AuthMe>('/auth/me', { auth: true })
        .then((user) => setCurrentUser(user))
        .catch(() => {});
    }
  }, [refreshMyComplaints, currentUser, setCurrentUser]);

  // When selectedComplaintId changes, fetch full complaint
  useEffect(() => {
    if (!selectedComplaintId) {
      setDetailComplaint(null);
      return;
    }
    setIsDetailLoading(true);
    apiFetch<Complaint>(`/complaints/${selectedComplaintId}`, { auth: true })
      .then((data) => setDetailComplaint(data))
      .catch((err) => console.warn('Failed to load complaint details:', err))
      .finally(() => setIsDetailLoading(false));
  }, [selectedComplaintId]);

  // Computed stat cards
  const totalCount = myComplaints.length;
  const pendingCount = myComplaints.filter((c) => c.status === 'Pending').length;
  const inProgressCount = myComplaints.filter((c) => c.status === 'In Progress').length;
  const resolvedCount = myComplaints.filter((c) => c.status === 'Resolved').length;
  const needsReviewCount = myComplaints.filter((c) => c.status === 'Needs Review').length;

  const filteredList =
    filterStatus === 'all'
      ? myComplaints
      : myComplaints.filter((c) => c.status === filterStatus);

  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailComplaint || !noteText.trim()) return;

    setIsPostingNote(true);
    setNoteError(null);

    try {
      await apiFetch(`/complaints/${detailComplaint.id}/notes`, {
        method: 'POST',
        auth: true,
        body: { note: noteText.trim() },
      });

      // Refetch current detail
      const refreshed = await apiFetch<Complaint>(`/complaints/${detailComplaint.id}`, { auth: true });
      setDetailComplaint(refreshed);
      setNoteText('');
      refreshMyComplaints();
    } catch (err: any) {
      setNoteError(err?.message || 'Could not post note.');
    } finally {
      setIsPostingNote(false);
    }
  };

  const userName = currentUser?.name || localStorage.getItem('name') || 'Citizen Resident';
  const userEmail = currentUser?.email || 'citizen@portal.gov.in';
  const userRole = currentUser?.role || localStorage.getItem('role') || 'citizen';

  return (
    <div className="w-full py-8 px-4 sm:px-6 md:px-8 max-w-[1200px] mx-auto flex flex-col gap-6">
      {/* Top Page Heading on Dark Background */}
      <div className="bg-slate-950/70 backdrop-blur-md rounded-2xl p-6 border border-white/15 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-blue-600/30 border border-blue-400/30 rounded-full text-blue-200 text-xs font-semibold mb-2">
            <span className="material-symbols-outlined text-[15px]">dashboard</span>
            <span>Citizen Portal Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">My Grievances & Profile</h1>
          <p className="text-sm text-slate-300 mt-1">
            Track status, review field updates, and view case notes.
          </p>
        </div>
      </div>

      {/* Citizen Profile Card */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 text-[#131b2e]">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-600/20 border-2 border-blue-500/40 flex items-center justify-center text-blue-600 font-bold text-2xl shrink-0">
            {userName.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[22px] sm:text-[26px] font-bold text-[#131b2e]">{userName}</h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-[#0037b0] px-2.5 py-0.5 rounded-full capitalize">
                <span className="material-symbols-outlined text-[13px]">verified</span>
                {userRole}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-500 mt-1">
              <span className="text-[#0037b0] font-medium">{userEmail}</span>
              {currentUser?.phone && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                    <span className="material-symbols-outlined text-[15px] text-blue-600">phone</span>
                    {currentUser.phone}
                  </span>
                </>
              )}
              {currentUser?.created_at && (
                <>
                  <span>·</span>
                  <span>Registered: {new Date(currentUser.created_at).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
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
          className="h-10 px-5 bg-[#1d4ed8] text-white text-[13px] font-semibold rounded-lg hover:bg-[#0037b0] transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-stretch sm:self-auto justify-center shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>File New Grievance</span>
        </button>
      </div>

      {/* Dynamic Stat Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div
          onClick={() => setFilterStatus('all')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filterStatus === 'all' ? 'bg-blue-50/80 border-blue-400 shadow-sm' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[11px] font-bold text-slate-500 uppercase">Total Filed</span>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{totalCount}</p>
          <span className="text-[11px] text-slate-400">All cases</span>
        </div>

        <div
          onClick={() => setFilterStatus('Pending')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filterStatus === 'Pending' ? 'bg-amber-50/80 border-amber-400 shadow-sm' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[11px] font-bold text-amber-600 uppercase">Pending</span>
          <p className="text-2xl sm:text-3xl font-bold text-amber-600 mt-1">{pendingCount}</p>
          <span className="text-[11px] text-slate-400">Awaiting action</span>
        </div>

        <div
          onClick={() => setFilterStatus('In Progress')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filterStatus === 'In Progress' ? 'bg-blue-50/80 border-blue-400 shadow-sm' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[11px] font-bold text-blue-600 uppercase">In Progress</span>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-1">{inProgressCount}</p>
          <span className="text-[11px] text-slate-400">Field work active</span>
        </div>

        <div
          onClick={() => setFilterStatus('Resolved')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filterStatus === 'Resolved' ? 'bg-emerald-50/80 border-emerald-400 shadow-sm' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[11px] font-bold text-emerald-600 uppercase">Resolved</span>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1">{resolvedCount}</p>
          <span className="text-[11px] text-slate-400">Officially closed</span>
        </div>

        <div
          onClick={() => setFilterStatus('Needs Review')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filterStatus === 'Needs Review' ? 'bg-amber-50/80 border-amber-400 shadow-sm' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[11px] font-bold text-amber-700 uppercase">Needs Review</span>
          <p className="text-2xl sm:text-3xl font-bold text-amber-700 mt-1">{needsReviewCount}</p>
          <span className="text-[11px] text-slate-400">Officer triage</span>
        </div>
      </div>

      {/* Grievances List Card */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 flex flex-col gap-4 text-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Registered Complaints</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {filteredList.length}
            </span>
          </h2>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            {['all', 'Pending', 'In Progress', 'Resolved', 'Needs Review'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filterStatus === st
                    ? 'bg-[#1d4ed8] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'all' ? 'All' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Loading / Error / List States */}
        {isComplaintsLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span className="text-sm font-medium">Loading your registered complaints...</span>
          </div>
        ) : complaintsError ? (
          <div className="py-8 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-3">
            <span className="material-symbols-outlined text-red-600">error</span>
            <span>{complaintsError}</span>
            <button
              type="button"
              onClick={refreshMyComplaints}
              className="ml-auto px-3 py-1 bg-red-100 hover:bg-red-200 rounded-lg text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
            <span className="material-symbols-outlined text-[44px]">inbox</span>
            <p className="text-base font-semibold text-slate-700">No complaints found</p>
            <p className="text-xs text-slate-500 max-w-sm">
              {filterStatus === 'all'
                ? 'You have not submitted any complaints yet. Use the "File New Grievance" button above to register an issue.'
                : `No complaints found with status "${filterStatus}".`}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredList.map((complaint) => (
              <div
                key={complaint.id}
                className="p-4 sm:p-5 rounded-xl border border-slate-200 hover:border-blue-300 transition-all bg-white hover:bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                      {complaint.tracking_number}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        complaint.status === 'Resolved'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : complaint.status === 'In Progress'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : complaint.status === 'Needs Review'
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-slate-100 text-slate-800 border-slate-300'
                      }`}
                    >
                      {complaint.status}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {complaint.department}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-slate-800 line-clamp-2">
                    {complaint.text}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span>Filed: {new Date(complaint.created_at).toLocaleString()}</span>
                    {complaint.location && (
                      <>
                        <span>·</span>
                        <span>{complaint.location}</span>
                      </>
                    )}
                    <span>·</span>
                    <span className="font-semibold text-slate-600">
                      AI Match: {Math.round((complaint.confidence || 0) * 100)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => setSelectedComplaintId(complaint.id)}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1d4ed8] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    View Details
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTrackQuery(complaint.tracking_number);
                      setActiveTab('track-complaint');
                      try {
                        window.history.pushState({}, '', '/track-complaint');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      } catch {}
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Track Publicly"
                  >
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal / Panel */}
      {selectedComplaintId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 text-slate-900 flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-slate-900">
                  {detailComplaint?.tracking_number || 'Loading...'}
                </span>
                {detailComplaint?.status && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    {detailComplaint.status}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedComplaintId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Content */}
            {isDetailLoading || !detailComplaint ? (
              <div className="p-12 text-center text-slate-400">Loading details...</div>
            ) : (
              <div className="p-6 flex flex-col gap-6">
                {/* Issue Text */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</span>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-200">
                    {detailComplaint.text}
                  </p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-semibold text-slate-500">Department</span>
                    <p className="font-bold text-slate-900 mt-0.5">{detailComplaint.department}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-semibold text-slate-500">Category</span>
                    <p className="font-bold text-slate-900 mt-0.5">{detailComplaint.category}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-semibold text-slate-500">Priority</span>
                    <p className="font-bold text-slate-900 mt-0.5">{detailComplaint.priority}</p>
                  </div>
                  {detailComplaint.location && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 col-span-2">
                      <span className="font-semibold text-slate-500">Location</span>
                      <p className="font-bold text-slate-900 mt-0.5">{detailComplaint.location}</p>
                    </div>
                  )}
                  {detailComplaint.evidence_url && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 col-span-2">
                      <span className="font-semibold text-slate-500">Evidence Link</span>
                      <a
                        href={detailComplaint.evidence_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-blue-600 hover:underline block truncate mt-0.5"
                      >
                        {detailComplaint.evidence_url}
                      </a>
                    </div>
                  )}
                </div>

                {/* Status History / Timeline */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Status History & Audit
                  </span>
                  {!detailComplaint.status_history || detailComplaint.status_history.length === 0 ? (
                    <p className="text-xs text-slate-400">No status changes recorded yet.</p>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
                      {detailComplaint.status_history.map((sh, idx) => (
                        <div key={sh.id || idx} className="text-xs flex flex-col gap-0.5 border-b border-slate-200 last:border-0 pb-2 last:pb-0">
                          <span className="font-bold text-slate-900">
                            {sh.old_status === 'None' ? 'Submitted' : sh.old_status} → {sh.new_status}
                          </span>
                          <span className="text-slate-500">
                            By {sh.changed_by || 'Officer'} · {new Date(sh.changed_at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Case Notes */}
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Official Case Notes
                  </span>

                  {/* Add note form */}
                  <form onSubmit={handlePostNote} className="flex flex-col gap-2">
                    <textarea
                      rows={2}
                      required
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Add an update note to this grievance..."
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#1d4ed8] focus:outline-none"
                    />
                    {noteError && <p className="text-[11px] text-red-600">{noteError}</p>}
                    <button
                      type="submit"
                      disabled={isPostingNote || !noteText.trim()}
                      className="self-end px-4 py-1.5 rounded-lg bg-[#1d4ed8] hover:bg-[#1e40af] disabled:bg-slate-300 text-white text-xs font-semibold transition-all cursor-pointer"
                    >
                      {isPostingNote ? 'Posting...' : 'Post Note'}
                    </button>
                  </form>

                  {/* Existing Notes */}
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                    {!detailComplaint.notes || detailComplaint.notes.length === 0 ? (
                      <p className="text-xs text-slate-400">No notes posted yet.</p>
                    ) : (
                      detailComplaint.notes.map((n) => (
                        <div key={n.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-col gap-1">
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
        </div>
      )}
    </div>
  );
};

export default CitizenProfileView;
