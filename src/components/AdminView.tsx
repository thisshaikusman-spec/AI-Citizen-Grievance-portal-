import React, { useState, useEffect, useCallback } from 'react';
import { useGrievance } from '../context/GrievanceContext.tsx';
import { Complaint, AdminDashboardData, AdminComplaintsResponse, DepartmentType, PriorityLevel, GrievanceStatus } from '../types/index.ts';
import { apiFetch, ApiError } from '../lib/api.ts';

export const AdminView: React.FC = () => {
  const { setActiveTab } = useGrievance();

  const userRole = (localStorage.getItem('role') || '').toLowerCase();
  const isOfficer = userRole === 'officer' || userRole.includes('officer');
  const isAdmin = userRole === 'admin' || userRole.includes('admin');

  // Dashboard Stats State
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);

  // Table State
  const [complaintsData, setComplaintsData] = useState<AdminComplaintsResponse>({
    total: 0,
    page: 1,
    limit: 20,
    items: [],
  });
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);

  // Filters
  const [filterDept, setFilterDept] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  // Selected Complaint for Detail Panel
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Status Change Dialog State
  const [pendingStatusChange, setPendingStatusChange] = useState<string | null>(null);
  const [showResolvedConfirm, setShowResolvedConfirm] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Assign Officer State
  const [assignUserIdInput, setAssignUserIdInput] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Add Note State
  const [adminNoteText, setAdminNoteText] = useState('');
  const [isPostingNote, setIsPostingNote] = useState(false);

  // Fetch Dashboard Summary
  const fetchDashboard = useCallback(async () => {
    setIsDashboardLoading(true);
    try {
      const data = await apiFetch<AdminDashboardData>('/admin/dashboard', { auth: true });
      setDashboardData(data);
    } catch (err: any) {
      console.warn('Dashboard fetch error:', err);
    } finally {
      setIsDashboardLoading(false);
    }
  }, []);

  // Fetch Complaints with Filters
  const fetchComplaints = useCallback(async (targetPage = page) => {
    setIsTableLoading(true);
    setTableError(null);

    const params = new URLSearchParams();
    if (filterDept) params.set('department', filterDept);
    if (filterPriority) params.set('priority', filterPriority);
    if (filterStatus) params.set('status', filterStatus);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    params.set('page', String(targetPage));
    params.set('limit', '20');

    try {
      const res = await apiFetch<AdminComplaintsResponse>(`/admin/complaints?${params.toString()}`, { auth: true });
      setComplaintsData(res || { total: 0, page: 1, limit: 20, items: [] });
    } catch (err: any) {
      setTableError(err?.message || 'Failed to load complaints.');
    } finally {
      setIsTableLoading(false);
    }
  }, [filterDept, filterPriority, filterStatus, dateFrom, dateTo, page]);

  useEffect(() => {
    if (isAdmin) {
      fetchDashboard();
      fetchComplaints(page);
    }
  }, [isAdmin, fetchDashboard, fetchComplaints, page]);

  // Refetch single complaint detail
  const refreshSelectedComplaint = async (id: number) => {
    setIsDetailLoading(true);
    try {
      const updated = await apiFetch<Complaint>(`/complaints/${id}`, { auth: true });
      setSelectedComplaint(updated);
      fetchDashboard();
      fetchComplaints(page);
    } catch (err: any) {
      console.warn('Failed to refresh complaint detail:', err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Status transition validity check
  const getAllowedStatuses = (currentStatus: string): string[] => {
    const s = currentStatus;
    if (s === 'Needs Review') return ['Pending', 'In Progress', 'Resolved'];
    if (s === 'Pending') return ['In Progress', 'Resolved'];
    if (s === 'In Progress') return ['Pending', 'Resolved'];
    return []; // 'Resolved' cannot be changed
  };

  // Handle status update
  const handleStatusClick = (nextStatus: string) => {
    if (nextStatus === 'Resolved') {
      setPendingStatusChange('Resolved');
      setShowResolvedConfirm(true);
    } else {
      executeStatusUpdate(nextStatus);
    }
  };

  const executeStatusUpdate = async (newStatus: string) => {
    if (!selectedComplaint) return;
    setIsUpdatingStatus(true);
    setActionError(null);

    try {
      await apiFetch<Complaint>(`/admin/complaints/${selectedComplaint.id}/status`, {
        method: 'PATCH',
        auth: true,
        body: { status: newStatus },
      });
      setShowResolvedConfirm(false);
      setPendingStatusChange(null);
      await refreshSelectedComplaint(selectedComplaint.id);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to update status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Assign Officer (number user ID)
  const handleAssignOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    const parsedId = parseInt(assignUserIdInput.trim(), 10);
    if (isNaN(parsedId) || parsedId <= 0) {
      setAssignError('Please enter a valid numeric Officer/Admin User ID.');
      return;
    }

    setIsAssigning(true);
    setAssignError(null);

    try {
      await apiFetch<Complaint>(`/admin/complaints/${selectedComplaint.id}/assign`, {
        method: 'PATCH',
        auth: true,
        body: { assigned_to: parsedId },
      });
      setAssignUserIdInput('');
      await refreshSelectedComplaint(selectedComplaint.id);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 400) {
        setAssignError('The specified user is not an officer or admin.');
      } else {
        setAssignError(err?.message || 'Failed to assign officer.');
      }
    } finally {
      setIsAssigning(false);
    }
  };

  // Add Note from Admin
  const handleAddAdminNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !adminNoteText.trim()) return;

    setIsPostingNote(true);
    try {
      await apiFetch(`/complaints/${selectedComplaint.id}/notes`, {
        method: 'POST',
        auth: true,
        body: { note: adminNoteText.trim() },
      });
      setAdminNoteText('');
      await refreshSelectedComplaint(selectedComplaint.id);
    } catch (err: any) {
      console.warn('Note error:', err);
    } finally {
      setIsPostingNote(false);
    }
  };

  // Role: Officer -> "The officer portal is coming soon."
  if (isOfficer && !isAdmin) {
    return (
      <div className="w-full py-16 px-4 max-w-[800px] mx-auto text-center">
        <div className="bg-slate-950/70 backdrop-blur-md rounded-2xl p-10 border border-white/15 text-white shadow-2xl flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-400/40 flex items-center justify-center text-blue-300">
            <span className="material-symbols-outlined text-[36px]">engineering</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Field Officer Portal</h1>
          <p className="text-slate-300 text-base max-w-md">
            The officer portal is coming soon.
          </p>
          <p className="text-xs text-slate-500">
            Dedicated mobile dispatch and field closure tools are currently in scheduled rollout.
          </p>
        </div>
      </div>
    );
  }

  // Role: Non-Admin -> Access Denied
  if (!isAdmin) {
    return (
      <div className="w-full py-16 px-4 max-w-[800px] mx-auto text-center">
        <div className="bg-slate-950/70 backdrop-blur-md rounded-2xl p-10 border border-white/15 text-white shadow-2xl flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
            <span className="material-symbols-outlined text-[36px]">gpp_bad</span>
          </div>
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-slate-300 text-sm max-w-md">
            Administrator privileges are required to view this console. Please sign in with an authorized administrative account.
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              try {
                window.history.pushState({}, '', '/login');
                window.dispatchEvent(new PopStateEvent('popstate'));
              } catch {}
            }}
            className="px-5 py-2.5 bg-[#1d4ed8] text-white text-sm font-semibold rounded-xl hover:bg-[#1e40af] transition-all cursor-pointer mt-2"
          >
            Sign In with Admin Account
          </button>
        </div>
      </div>
    );
  }

  const totalComplaintsCount = dashboardData?.total ?? dashboardData?.total_complaints ?? 0;
  const statusStats = dashboardData?.by_status || {};
  const deptStats = dashboardData?.by_department || {};
  const priorityStats = dashboardData?.by_priority || {};

  return (
    <div className="w-full py-6 px-4 sm:px-6 md:px-8 max-w-[1400px] mx-auto flex flex-col gap-6 text-slate-900">
      {/* Top Banner */}
      <div className="bg-slate-950/75 backdrop-blur-md rounded-2xl p-6 border border-white/15 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-blue-600/30 border border-blue-400/30 rounded-full text-blue-200 text-xs font-semibold mb-2">
            <span className="material-symbols-outlined text-[15px]">admin_panel_settings</span>
            <span>Central Municipal Administration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Admin Oversight Console</h1>
          <p className="text-sm text-slate-300 mt-1">
            Real-time complaint triage, department allocation, and verified lifecycle monitoring.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            fetchDashboard();
            fetchComplaints(page);
          }}
          className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Real Dashboard Cards & Breakdown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Stat Cards */}
        <div className="lg:col-span-12 grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Complaints</span>
            <p className="text-3xl font-bold text-slate-900 mt-1">{totalComplaintsCount}</p>
            <span className="text-[11px] text-slate-400">Total in database</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Pending</span>
            <p className="text-3xl font-bold text-amber-600 mt-1">{statusStats['Pending'] || 0}</p>
            <span className="text-[11px] text-slate-400">Awaiting allocation</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">In Progress</span>
            <p className="text-3xl font-bold text-blue-600 mt-1">{statusStats['In Progress'] || 0}</p>
            <span className="text-[11px] text-slate-400">Field work active</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Resolved</span>
            <p className="text-3xl font-bold text-emerald-600 mt-1">{statusStats['Resolved'] || 0}</p>
            <span className="text-[11px] text-slate-400">Closed successfully</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Needs Review</span>
            <p className="text-3xl font-bold text-amber-700 mt-1">{statusStats['Needs Review'] || 0}</p>
            <span className="text-[11px] text-slate-400">AI uncertain triage</span>
          </div>
        </div>

        {/* Real Charts Grid (Breakdowns by Department, Priority, Status only) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Breakdown by Department</h2>
            <span className="text-xs text-slate-400">{Object.keys(deptStats).length} Departments Active</span>
          </div>
          <div className="flex flex-col gap-3">
            {Object.keys(deptStats).length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No department metrics available.</p>
            ) : (
              Object.entries(deptStats).map(([dept, count]) => {
                const percent = totalComplaintsCount > 0 ? Math.round((count / totalComplaintsCount) * 100) : 0;
                return (
                  <div key={dept} className="flex flex-col gap-1 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-800">{dept}</span>
                      <span className="text-slate-500 font-mono">{count} ({percent}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Breakdown by Priority & Status</h2>
            <span className="text-xs text-slate-400">Real Backend Metrics</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Priority Bars */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-slate-500 uppercase">Priority Distribution</span>
              {['High', 'Medium', 'Low'].map((pr) => {
                const count = priorityStats[pr] || 0;
                const percent = totalComplaintsCount > 0 ? Math.round((count / totalComplaintsCount) * 100) : 0;
                return (
                  <div key={pr} className="flex flex-col gap-1 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-700">{pr}</span>
                      <span className="text-slate-500 font-mono">{count} ({percent}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          pr === 'High' ? 'bg-red-500' : pr === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Status Bars */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-slate-500 uppercase">Status Lifecycle</span>
              {['Pending', 'In Progress', 'Resolved', 'Needs Review'].map((st) => {
                const count = statusStats[st] || 0;
                const percent = totalComplaintsCount > 0 ? Math.round((count / totalComplaintsCount) * 100) : 0;
                return (
                  <div key={st} className="flex flex-col gap-1 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-700">{st}</span>
                      <span className="text-slate-500 font-mono">{count} ({percent}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Complaint Table Section */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900">All Grievances Master Table</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {complaintsData.total} Total
            </span>
          </div>

          {/* "Needs Review" quick tab */}
          <button
            type="button"
            onClick={() => {
              setFilterStatus(filterStatus === 'Needs Review' ? '' : 'Needs Review');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              filterStatus === 'Needs Review'
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">priority_high</span>
            <span>Needs Review Quick Tab ({statusStats['Needs Review'] || 0})</span>
          </button>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {/* Department Filter */}
          <select
            value={filterDept}
            onChange={(e) => {
              setFilterDept(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-[#1d4ed8] focus:outline-none"
          >
            <option value="">All Departments</option>
            <option value="Electricity / Streetlight">Electricity / Streetlight</option>
            <option value="Road Maintenance">Road Maintenance</option>
            <option value="Water Department">Water Department</option>
            <option value="Election Department">Election Department</option>
            <option value="Election Officer">Election Officer</option>
            <option value="General Admin">General Admin</option>
          </select>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={(e) => {
              setFilterPriority(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-[#1d4ed8] focus:outline-none"
          >
            <option value="">All Priorities</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-[#1d4ed8] focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Needs Review">Needs Review</option>
          </select>

          {/* Date From */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-[#1d4ed8] focus:outline-none"
            placeholder="From Date"
          />

          {/* Date To */}
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-[#1d4ed8] focus:outline-none"
            placeholder="To Date"
          />
        </div>

        {/* Table / Loading / Empty */}
        {isTableLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
            <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span className="text-xs font-semibold">Loading complaints registry...</span>
          </div>
        ) : tableError ? (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
            {tableError}
          </div>
        ) : complaintsData.items.length === 0 ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[36px]">inbox</span>
            <p className="text-sm font-semibold text-slate-600">No complaints matching the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3.5">Ref No</th>
                  <th className="py-3 px-3.5">Description</th>
                  <th className="py-3 px-3.5">Department</th>
                  <th className="py-3 px-3.5">Priority</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5">Assigned</th>
                  <th className="py-3 px-3.5">Date</th>
                  <th className="py-3 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {complaintsData.items.map((complaint) => (
                  <tr
                    key={complaint.id}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                    onClick={() => refreshSelectedComplaint(complaint.id)}
                  >
                    <td className="py-3 px-3.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {complaint.tracking_number}
                    </td>
                    <td className="py-3 px-3.5 max-w-xs truncate font-medium">
                      {complaint.text}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      {complaint.department}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          complaint.priority === 'High'
                            ? 'bg-red-100 text-red-800'
                            : complaint.priority === 'Medium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {complaint.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
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
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap text-slate-600">
                      {complaint.assigned_user?.name || (complaint.assigned_to ? `#${complaint.assigned_to}` : '—')}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap text-slate-500">
                      {new Date(complaint.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          refreshSelectedComplaint(complaint.id);
                        }}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
          <span>
            Showing {complaintsData.items.length === 0 ? 0 : (page - 1) * complaintsData.limit + 1} -{' '}
            {Math.min(page * complaintsData.limit, complaintsData.total)} of {complaintsData.total}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Previous
            </button>
            <span className="font-semibold text-slate-700">Page {page}</span>
            <button
              type="button"
              disabled={page * complaintsData.limit >= complaintsData.total}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Detail Panel Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto border border-slate-200 text-slate-900 flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-base font-bold text-slate-900">
                  {selectedComplaint.tracking_number}
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    selectedComplaint.status === 'Resolved'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : selectedComplaint.status === 'In Progress'
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : selectedComplaint.status === 'Needs Review'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-slate-100 text-slate-800 border-slate-300'
                  }`}
                >
                  {selectedComplaint.status}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedComplaint(null);
                  setActionError(null);
                  setAssignError(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col gap-6">
              {actionError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                  {actionError}
                </div>
              )}

              {/* Status Update Control Section */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Transition Status (Allowed Actions)
                </span>

                {selectedComplaint.status === 'Resolved' ? (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-700 text-[18px]">verified</span>
                    <span>Resolved cannot be changed later.</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {getAllowedStatuses(selectedComplaint.status).map((allowed) => (
                      <button
                        key={allowed}
                        type="button"
                        disabled={isUpdatingStatus}
                        onClick={() => handleStatusClick(allowed)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                          allowed === 'Resolved'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : allowed === 'In Progress'
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-amber-600 hover:bg-amber-700 text-white'
                        }`}
                      >
                        Set Status → {allowed}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Assign Officer Section */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Officer Assignment
                  </span>
                  <span className="text-xs text-slate-500">
                    Currently: <strong className="text-slate-800">{selectedComplaint.assigned_user?.name || (selectedComplaint.assigned_to ? `User #${selectedComplaint.assigned_to}` : 'None')}</strong>
                  </span>
                </div>

                <form onSubmit={handleAssignOfficer} className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter Officer/Admin User ID (e.g. 2)"
                    value={assignUserIdInput}
                    onChange={(e) => setAssignUserIdInput(e.target.value)}
                    className="flex-1 h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-xs font-medium focus:ring-2 focus:ring-[#1d4ed8] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isAssigning || !assignUserIdInput.trim()}
                    className="h-10 px-4 rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] disabled:bg-slate-300 text-white text-xs font-semibold transition-all cursor-pointer shrink-0"
                  >
                    {isAssigning ? 'Assigning...' : 'Assign User'}
                  </button>
                </form>
                {assignError && <p className="text-[11px] text-red-600 font-medium">{assignError}</p>}
              </div>

              {/* Text Description */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Complaint Text</span>
                <p className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap">
                  {selectedComplaint.text}
                </p>
              </div>

              {/* Details Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-semibold text-slate-500">Category</span>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedComplaint.category}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-semibold text-slate-500">Department</span>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedComplaint.department}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-semibold text-slate-500">Priority</span>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedComplaint.priority}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-semibold text-slate-500">AI Confidence</span>
                  <p className="font-bold text-slate-900 mt-0.5">{Math.round((selectedComplaint.confidence || 0) * 100)}%</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 col-span-2">
                  <span className="font-semibold text-slate-500">Citizen Author</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {selectedComplaint.user?.name || `User #${selectedComplaint.user_id}`}
                    {selectedComplaint.user?.phone ? ` · ${selectedComplaint.user.phone}` : ''}
                  </p>
                </div>
              </div>

              {/* Timeline (status_history) */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Audit Timeline (status_history)
                </span>
                {!selectedComplaint.status_history || selectedComplaint.status_history.length === 0 ? (
                  <p className="text-xs text-slate-400">No status audit entries.</p>
                ) : (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-2.5">
                    {selectedComplaint.status_history.map((sh, idx) => (
                      <div key={sh.id || idx} className="text-xs flex flex-col gap-0.5 border-b border-slate-200 last:border-0 pb-2 last:pb-0">
                        <span className="font-bold text-slate-900">
                          {sh.old_status === 'None' ? 'Submitted' : sh.old_status} → {sh.new_status}
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          By {sh.changed_by || 'Officer'} · {new Date(sh.changed_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Case Notes</span>
                <form onSubmit={handleAddAdminNote} className="flex flex-col gap-2">
                  <textarea
                    rows={2}
                    value={adminNoteText}
                    onChange={(e) => setAdminNoteText(e.target.value)}
                    placeholder="Enter official administrative note or directive..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#1d4ed8] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isPostingNote || !adminNoteText.trim()}
                    className="self-end px-4 py-1.5 rounded-lg bg-[#1d4ed8] hover:bg-[#1e40af] disabled:bg-slate-300 text-white text-xs font-semibold cursor-pointer"
                  >
                    {isPostingNote ? 'Posting...' : 'Add Note'}
                  </button>
                </form>

                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                  {!selectedComplaint.notes || selectedComplaint.notes.length === 0 ? (
                    <p className="text-xs text-slate-400">No notes posted yet.</p>
                  ) : (
                    selectedComplaint.notes.map((n) => (
                      <div key={n.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <div className="flex justify-between text-[11px] text-slate-500 font-semibold mb-1">
                          <span>{n.author || `User #${n.author_id}`}</span>
                          <span>{new Date(n.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-800 whitespace-pre-wrap">{n.note}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog before Resolved */}
      {showResolvedConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 text-slate-900 flex flex-col gap-4 text-center animate-in fade-in">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px]">warning</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Confirm Resolution</h3>
              <p className="text-sm text-slate-600 mt-2 font-semibold text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-200">
                Resolved cannot be changed later
              </p>
              <p className="text-xs text-slate-500 mt-2">
                This action will permanently close the complaint and mark the civic issue as resolved.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowResolvedConfirm(false);
                  setPendingStatusChange(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => executeStatusUpdate('Resolved')}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                {isUpdatingStatus ? 'Resolving...' : 'Confirm Resolved'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
