import React from 'react';
import { useGrievance } from '../context/GrievanceContext.tsx';
import { useAnimation } from '../context/AnimationContext.tsx';

export const Footer: React.FC = () => {
  const { setActiveTab } = useGrievance();
  const { isPaused, togglePause } = useAnimation();

  return (
    <footer className="w-full bg-slate-950/80 backdrop-blur-xl border-t border-white/10 text-slate-300 mt-auto relative z-20">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 py-7 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-400 text-[20px]">verified_user</span>
            <span className="font-semibold text-[15px] text-white">Citizen Grievance Redressal</span>
          </div>
          <p className="text-[13px] text-slate-400 text-center md:text-left">
            AI-assisted classification & transparent election monitoring intake channel.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-center md:text-right">
          <div className="flex items-center gap-1.5 text-slate-300 text-xs">
            <span className="material-symbols-outlined text-blue-400 text-[18px]">headset_mic</span>
            <span className="font-semibold text-slate-200">Toll-Free:</span>
            <span className="font-semibold text-blue-300">1800-CIVIC-AI</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setActiveTab('how-it-works');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-[12px] font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Citizen Charter
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('departments');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-[12px] font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Directory
          </button>

          {/* Pause Animation Toggle Button */}
          <button
            type="button"
            onClick={togglePause}
            aria-pressed={isPaused}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-900/90 hover:bg-slate-800 rounded-lg border border-white/20 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer min-h-[36px]"
          >
            <span className="material-symbols-outlined text-[16px] text-blue-400" aria-hidden="true">
              {isPaused ? 'play_arrow' : 'pause'}
            </span>
            <span>{isPaused ? 'Resume Motion' : 'Pause Animation'}</span>
          </button>
        </div>
      </div>

      <div className="w-full bg-slate-950/95 py-2.5 px-4 border-t border-white/5 text-center">
        <p className="text-[12px] text-slate-400 font-medium">
          College project prototype. Not an official government service.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
