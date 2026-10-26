import React, { useState } from 'react';
import { useGrievance } from '../context/GrievanceContext.tsx';
import { DepartmentType } from '../types/index.ts';

export const HomeView: React.FC = () => {
  const {
    departments,
    setActiveTab,
    setTrackQuery,
    setSelectedDepartment,
  } = useGrievance();

  const [inputVal, setInputVal] = useState('');
  const [inputWarning, setInputWarning] = useState(false);

  const handleTrackSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputVal.trim().toUpperCase();
    if (!query) {
      setInputWarning(true);
      setTimeout(() => setInputWarning(false), 1200);
      return;
    }

    setTrackQuery(query);
    setActiveTab('track-complaint');
    try {
      window.history.pushState({}, '', '/track-complaint');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFileForDepartment = (deptName: DepartmentType) => {
    setSelectedDepartment(deptName);
    setActiveTab('submit-complaint');
    try {
      window.history.pushState({}, '', '/submit-complaint');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col w-full text-slate-900">
      {/* Top Advisory Strip */}
      <section className="w-full bg-slate-950/70 backdrop-blur-md py-2.5 px-4 sm:px-6 md:px-8 border-b border-white/10 text-white">
        <div className="max-w-[1200px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#1d4ed8] text-white">
              <span className="material-symbols-outlined text-[15px]">info</span>
            </span>
            <p className="text-[13px] text-slate-200">
              <strong className="font-semibold text-blue-300">Public Advisory:</strong> Citizen grievance intake and election monitoring are active across all municipal jurisdictions.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300 text-[12px] font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Intake Gateway: Active</span>
          </div>
        </div>
      </section>

      {/* Hero Section */}
      <section className="w-full py-8 md:py-12 px-4 sm:px-6 md:px-8">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Primary Messaging & Tracking Box */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="flex flex-col gap-3 p-6 sm:p-7 rounded-2xl bg-gradient-to-r from-slate-950/85 via-slate-950/75 to-blue-950/70 backdrop-blur-md border border-white/15 text-white shadow-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600/30 border border-blue-400/30 rounded-full w-fit">
                <span className="material-symbols-outlined text-blue-300 text-[18px]">verified_user</span>
                <span className="text-[12px] text-blue-200 font-semibold tracking-wide uppercase">
                  Civic Grievance & Election Oversight
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <h1 className="text-[32px] sm:text-[36px] md:text-[42px] font-bold text-white tracking-tight leading-tight">
                  Report. Route. Resolve.
                </h1>
                <p className="text-[15px] sm:text-[17px] text-slate-200 leading-relaxed max-w-xl">
                  Submit civic and election grievances with automated AI triage. Your issue is classified, routed to the designated administrative department, and tracked with a unique reference number.
                </p>
              </div>
            </div>

            {/* Tracking Input Card */}
            <div className="bg-white p-5 rounded-2xl shadow-xl border border-slate-200 flex flex-col gap-4">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Direct Complaint Tracking
              </span>

              <form onSubmit={handleTrackSubmit} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                    search
                  </span>
                  <input
                    id="complaintTrackInput"
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value.toUpperCase())}
                    placeholder="Enter tracking reference (e.g. GRV-2026-123456)"
                    className={`w-full h-12 pl-10 pr-4 bg-slate-50 text-slate-900 placeholder:text-slate-400 rounded-xl text-sm font-mono font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#1d4ed8] border border-slate-300 transition-all ${
                      inputWarning ? 'ring-2 ring-red-500' : ''
                    }`}
                  />
                </div>
                <button
                  id="trackBtn"
                  type="submit"
                  className="h-12 px-6 bg-[#1d4ed8] text-white text-[14px] font-semibold rounded-xl hover:bg-[#1e40af] transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Track Status</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </form>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                <span>Have an urgent civic issue to report?</span>
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
                  className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#1d4ed8] hover:text-[#1e40af] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">add_circle</span>
                  <span>File a Grievance Now</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Workflow Overview Cards */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 flex flex-col gap-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <span className="material-symbols-outlined text-blue-600 text-[20px]">how_to_reg</span>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  How The System Operates
                </h3>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex gap-3.5 items-start">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-200">
                    1
                  </div>
                  <div className="flex flex-col">
                    <h4 className="text-sm font-bold text-slate-900">Natural Language Intake</h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Citizens describe the issue in plain text. Location and evidence links can be attached.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3.5 items-start">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-200">
                    2
                  </div>
                  <div className="flex flex-col">
                    <h4 className="text-sm font-bold text-slate-900">AI Classification & Triage</h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      The backend AI triages the problem, predicts category, determines priority, and assigns the correct civic department.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3.5 items-start">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-200">
                    3
                  </div>
                  <div className="flex flex-col">
                    <h4 className="text-sm font-bold text-slate-900">Transparent Tracking & Resolution</h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Track real-time progress using your tracking number. Field officers document updates and resolution.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('how-it-works');
                  try {
                    window.history.pushState({}, '', '/how-it-works');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  } catch {}
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="mt-2 w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Read Full Citizen Charter</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Jurisdictions Grid Section */}
      <section className="w-full py-8 px-4 sm:px-6 md:px-8 max-w-[1200px] mx-auto flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold text-[#4059aa] uppercase tracking-wider">
              Municipal Services
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-0.5">
              Civic Jurisdictions Covered
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveTab('departments');
              try {
                window.history.pushState({}, '', '/departments');
                window.dispatchEvent(new PopStateEvent('popstate'));
              } catch {}
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-xs font-bold text-[#1d4ed8] hover:underline self-start sm:self-auto cursor-pointer flex items-center gap-1"
          >
            <span>View All Departments</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <div
              key={dept.name}
              onClick={() => handleFileForDepartment(dept.name)}
              className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-400 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex flex-col gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-[#1d4ed8] group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[22px]">{dept.icon}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-base">{dept.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{dept.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-[#1d4ed8] font-semibold">
                <span>File in this department</span>
                <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                  chevron_right
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomeView;
