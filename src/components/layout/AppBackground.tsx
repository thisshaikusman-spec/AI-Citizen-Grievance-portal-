import React, { Suspense } from 'react';
import { useAnimation } from '../../context/AnimationContext.tsx';
import { useGrievance } from '../../context/GrievanceContext.tsx';

// Lazy load GhostFibers so initial paint is instant and doesn't block on WebGL
const GhostFibers = React.lazy(() => import('../GhostFibers.tsx'));

const StaticGradientFallback: React.FC = () => (
  <div
    className="absolute inset-0 bg-gradient-to-br from-[#0B1B4D] via-[#1E3A8A] to-[#1D4ED8]"
    style={{
      background: 'linear-gradient(135deg, #0B1B4D 0%, #1E3A8A 50%, #1D4ED8 100%)',
    }}
    aria-hidden="true"
  />
);

export const AppBackground: React.FC = () => {
  const { canAnimate, isTabHidden, isPaused } = useAnimation();
  const { activeTab } = useGrievance();

  // Determine if on login or register route
  const isAuthRoute =
    activeTab === 'login' ||
    activeTab === 'register' ||
    (typeof window !== 'undefined' &&
      (window.location.pathname.startsWith('/login') || window.location.pathname.startsWith('/register')));

  // Never mount two WebGL backgrounds at the same time: unmount on login/register
  if (isAuthRoute) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none select-none overflow-hidden"
      aria-hidden="true"
      style={{ zIndex: -10 }}
    >
      {/* Fallback is used when WebGL fails, reduced motion is requested, width < 640px, or paused */}
      {!canAnimate ? (
        <StaticGradientFallback />
      ) : (
        <Suspense fallback={<StaticGradientFallback />}>
          <div className="absolute inset-0 w-full h-full bg-[#0B1B4D]">
            <GhostFibers
              lineColor="#93C5FD"
              glowColor="#1D4ED8"
              secondaryColor="#1E3A8A"
              fiberStyle="lines"
              speed={0.35}
              dpr={1.5}
              paused={isTabHidden || isPaused}
              className="w-full h-full"
            />
            {/* Brand gradient overlay tinting the scene to deep navy & blue (#0B1B4D, #1E3A8A, #1D4ED8) */}
            <div
              className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#0B1B4D]/85 via-[#0B1B4D]/70 to-[#1E3A8A]/80 mix-blend-multiply"
              aria-hidden="true"
            />
            {/* Subtle contrast stabilizer overlay to guarantee WCAG AA compliance */}
            <div
              className="absolute inset-0 pointer-events-none bg-[#0B1B4D]/40"
              aria-hidden="true"
            />
          </div>
        </Suspense>
      )}
    </div>
  );
};

export default AppBackground;
