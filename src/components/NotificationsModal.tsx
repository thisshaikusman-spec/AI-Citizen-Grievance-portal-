import React from 'react';
import { useGrievance } from '../context/GrievanceContext.tsx';

export const NotificationsModal: React.FC = () => {
  const {
    notifications,
    isNotificationsOpen,
    setIsNotificationsOpen,
    markAllNotificationsRead,
    setSelectedGrievanceId,
    setTrackQuery,
    setActiveTab,
  } = useGrievance();

  if (!isNotificationsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={() => setIsNotificationsOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#e2e8f0] flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0037b0] text-[22px]">notifications</span>
              <h2 className="font-semibold text-[16px] text-[#131b2e]">Real-time Status Updates</h2>
            </div>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="text-[12px] font-semibold text-[#0037b0] hover:underline cursor-pointer"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsNotificationsOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {notifications.length === 0 ? (
              <div className="text-center py-16 text-slate-400 flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[40px] text-slate-300">notifications_off</span>
                <p className="text-sm font-semibold text-slate-700">No status update notifications yet</p>
                <p className="text-xs text-slate-500 max-w-xs">
                  When an officer or administrative triage updates the status of your complaints, live notifications will appear here.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.complaintId) {
                      setSelectedGrievanceId(item.complaintId);
                      setTrackQuery(item.complaintId);
                      setActiveTab('track-complaint');
                      setIsNotificationsOpen(false);
                      try {
                        window.history.pushState({}, '', '/track-complaint');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      } catch {}
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    !item.read
                      ? 'bg-blue-50/70 border-blue-200 hover:bg-blue-50'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.type === 'alert'
                            ? 'bg-amber-500'
                            : item.type === 'success'
                            ? 'bg-emerald-500'
                            : 'bg-blue-600'
                        }`}
                      />
                      <h4 className="font-semibold text-[13px] text-slate-900">{item.title}</h4>
                    </div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">{item.time}</span>
                  </div>
                  <p className="text-[13px] text-slate-600 mt-1.5 leading-relaxed">{item.message}</p>
                  {item.complaintId && (
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">
                        {item.complaintId}
                      </span>
                      <span className="text-[12px] font-semibold text-[#0037b0] flex items-center gap-0.5">
                        Track <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer note */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
            <p className="text-[11px] text-slate-500">
              Live updates directly synchronized with your filed grievances.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsModal;
