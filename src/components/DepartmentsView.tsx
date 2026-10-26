import React from 'react';
import { useGrievance } from '../context/GrievanceContext.tsx';
import { DepartmentType } from '../types/index.ts';

export const DepartmentsView: React.FC = () => {
  const { departments, setSelectedDepartment, setActiveTab } = useGrievance();

  const handleFileCase = (deptName: DepartmentType) => {
    setSelectedDepartment(deptName);
    setActiveTab('submit-complaint');
    try {
      window.history.pushState({}, '', '/submit-complaint');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full py-8 px-4 sm:px-6 md:px-8 max-w-[1200px] mx-auto flex flex-col gap-8 text-slate-900">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-[#4059aa] uppercase tracking-wider">
            Municipal & Electoral Jurisdictions
          </span>
          <h1 className="text-[26px] sm:text-[32px] font-bold text-[#131b2e] tracking-tight mt-1">
            Grievance Departments Directory
          </h1>
          <p className="text-[15px] text-[#434655] max-w-2xl mt-1">
            Comprehensive oversight across the 6 municipal and electoral administrative departments.
            Issues filed through the intake portal are automatically classified and routed according to jurisdiction.
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
          className="h-10 px-5 bg-[#1d4ed8] text-white text-[14px] font-semibold rounded-xl hover:bg-[#1e40af] transition-colors flex items-center gap-1.5 self-start md:self-auto cursor-pointer shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Submit a Complaint</span>
        </button>
      </div>

      {/* Exactly 6 Departments Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((dept) => (
          <div
            key={dept.name}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between group hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-xl bg-blue-50 text-[#1d4ed8] group-hover:bg-[#1d4ed8] group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[24px]">{dept.icon}</span>
                </span>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  Official Body
                </span>
              </div>

              <h2 className="text-[18px] font-bold text-[#131b2e] mt-1">{dept.name}</h2>
              <p className="text-[13px] text-[#434655] leading-relaxed">{dept.description}</p>

              {/* Sample Issues */}
              <div className="mt-2 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Sample Issues Handled:
                </span>
                <ul className="text-[12px] text-slate-600 space-y-1 pl-4 list-disc">
                  {dept.sampleIssues.map((issue, idx) => (
                    <li key={idx} className="line-clamp-2">
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Automatic AI Routing</span>
              <button
                type="button"
                onClick={() => handleFileCase(dept.name)}
                className="text-[13px] font-semibold text-[#1d4ed8] hover:text-[#1e40af] flex items-center gap-0.5 hover:gap-1.5 transition-all cursor-pointer"
              >
                <span>Report Issue</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DepartmentsView;
