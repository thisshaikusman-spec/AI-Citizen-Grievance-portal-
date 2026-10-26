import React, { Suspense } from 'react';
import { useAnimation } from '../context/AnimationContext.tsx';

// Lazy load MoltenMetal so initial paint is fast and doesn't wait for WebGL
const MoltenMetal = React.lazy(() => import('../components/MoltenMetal.tsx'));

const StaticDarkGradientFallback: React.FC = () => (
  <div
    className="absolute inset-0 bg-gradient-to-b from-[#0B1B4D] via-[#060D24] to-[#020617]"
    style={{
      background: 'linear-gradient(180deg, #0B1B4D 0%, #060D24 60%, #020617 100%)',
    }}
    aria-hidden="true"
  />
);

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const { canAnimate, isTabHidden, isPaused, togglePause } = useAnimation();

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden text-white">
      {/* Full-screen fixed background layer */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none select-none overflow-hidden"
        aria-hidden="true"
        style={{ zIndex: -10 }}
      >
        {!canAnimate ? (
          <StaticDarkGradientFallback />
        ) : (
          <Suspense fallback={<StaticDarkGradientFallback />}>
            <div className="absolute inset-0 w-full h-full bg-[#0B1B4D]">
              <MoltenMetal
                colors={['#0B1B4D', '#1E3A8A', '#1D4ED8', '#60A5FA', '#93C5FD']}
                coreColor="#93C5FD"
                backgroundColor="#0B1B4D"
                colorMode="frost"
                speed={0.25}
                glow={1.2}
                detail={3}
                dpr={1.5}
                paused={isTabHidden || isPaused}
                className="w-full h-full"
              />
              {/* Overlay gradient so it stays calm and matches the brand */}
              <div
                className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-blue-950/50 to-slate-950/80 pointer-events-none"
                aria-hidden="true"
              />
            </div>
          </Suspense>
        )}
      </div>

      {/* Top Bar with brand icon & pause animation toggle */}
      <header className="w-full px-4 sm:px-6 md:px-8 py-4 flex items-center justify-between z-10">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            window.history.pushState({}, '', '/');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          className="flex items-center gap-2.5 text-white hover:text-blue-200 transition-colors cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[20px]">shield</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-slate-100">
            Citizen Grievance Portal
          </span>
        </a>

        {/* Small Pause Animation Button */}
        <button
          type="button"
          onClick={togglePause}
          aria-pressed={isPaused}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-950/60 hover:bg-slate-900/80 backdrop-blur-md rounded-lg border border-white/10 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <span className="material-symbols-outlined text-[16px]">
            {isPaused ? 'play_arrow' : 'pause'}
          </span>
          <span>{isPaused ? 'Resume Motion' : 'Pause Motion'}</span>
        </button>
      </header>

      {/* Main Content Area: Centered Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 z-10">
        {children}
      </main>

      {/* Compact Auth Footer */}
      <footer className="w-full py-4 px-4 text-center text-xs text-slate-400 z-10">
        <p>College project prototype. Not an official government service.</p>
      </footer>
    </div>
  );
};

export default AuthLayout;
