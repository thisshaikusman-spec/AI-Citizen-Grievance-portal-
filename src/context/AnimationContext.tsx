import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'civic_animation_paused';

export function isWebGLSupported(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGL2RenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('experimental-webgl2'))
    );
  } catch {
    return false;
  }
}

interface AnimationContextType {
  isPaused: boolean;
  togglePause: () => void;
  setIsPaused: (paused: boolean) => void;
  prefersReducedMotion: boolean;
  isMobile: boolean;
  isTabHidden: boolean;
  hasWebGL: boolean;
  canAnimate: boolean;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

export const AnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPaused, setIsPausedState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [hasWebGL, setHasWebGL] = useState<boolean>(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isTabHidden, setIsTabHidden] = useState<boolean>(false);

  useEffect(() => {
    // WebGL Check
    setHasWebGL(isWebGLSupported());

    // Reduced Motion Media Query
    if (typeof window !== 'undefined' && window.matchMedia) {
      const motionMql = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(motionMql.matches);
      const onMotionChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      motionMql.addEventListener('change', onMotionChange);

      // Screen size check (under 640px)
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 640);
      };
      checkMobile();
      window.addEventListener('resize', checkMobile);

      // Tab visibility check
      const onVisibilityChange = () => {
        setIsTabHidden(document.hidden);
      };
      document.addEventListener('visibilitychange', onVisibilityChange);

      // LocalStorage sync across tabs
      const onStorage = (e: StorageEvent) => {
        if (e.key === STORAGE_KEY) {
          setIsPausedState(e.newValue === 'true');
        }
      };
      window.addEventListener('storage', onStorage);

      return () => {
        motionMql.removeEventListener('change', onMotionChange);
        window.removeEventListener('resize', checkMobile);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('storage', onStorage);
      };
    }
  }, []);

  const setIsPaused = useCallback((val: boolean) => {
    setIsPausedState(val);
    try {
      localStorage.setItem(STORAGE_KEY, String(val));
    } catch (err) {
      console.warn('Failed to save animation preference:', err);
    }
  }, []);

  const togglePause = useCallback(() => {
    setIsPausedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch (err) {
        console.warn('Failed to save animation preference:', err);
      }
      return next;
    });
  }, []);

  const canAnimate = hasWebGL && !prefersReducedMotion && !isMobile && !isPaused;

  return (
    <AnimationContext.Provider
      value={{
        isPaused,
        togglePause,
        setIsPaused,
        prefersReducedMotion,
        isMobile,
        isTabHidden,
        hasWebGL,
        canAnimate,
      }}
    >
      {children}
    </AnimationContext.Provider>
  );
};

export const useAnimation = (): AnimationContextType => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimation must be used within an AnimationProvider');
  }
  return context;
};
