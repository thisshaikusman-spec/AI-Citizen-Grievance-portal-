import React, { useState, useEffect } from 'react';
import { GrievanceProvider, useGrievance } from './context/GrievanceContext.tsx';
import { AnimationProvider } from './context/AnimationContext.tsx';
import { isEnvMissing, missingEnvVars, EnvErrorScreen } from './lib/env.ts';
import SplitFlapIntro from './components/SplitFlapIntro.tsx';
import { Suspense, lazy } from 'react';


import { AppBackground } from './components/layout/AppBackground.tsx';
import { AuthLayout } from './layouts/AuthLayout.tsx';
import { LoginView } from './components/auth/LoginView.tsx';
import { RegisterView } from './components/auth/RegisterView.tsx';
const AdminView = lazy(() => import('./components/AdminView.tsx'));
import { Header } from './components/Header.tsx';
import { Footer } from './components/Footer.tsx';
const HomeView = lazy(() => import('./components/HomeView.tsx'));
const TrackView = lazy(() => import('./components/TrackView.tsx'));
const SubmitComplaintView = lazy(() => import('./components/SubmitComplaintView.tsx'));
const DepartmentsView = lazy(() => import('./components/DepartmentsView.tsx'));
const HowItWorksView = lazy(() => import('./components/HowItWorksView.tsx').then(module => ({ default: module.HowItWorksView })));
const CitizenProfileView = lazy(() => import('./components/CitizenProfileView.tsx'));
import { NotificationsModal } from './components/NotificationsModal.tsx';
// import { WelcomeScreen } from './components/WelcomeScreen.tsx'; // Replaced by SplitFlapIntro

// ─── helpers ─────────────────────────────────────────────────────────────────

function getToken(): string | null {
  try { return localStorage.getItem('access_token'); } catch { return null; }
}

function getRole(): string {
  try { return (localStorage.getItem('role') || 'citizen').toLowerCase(); } catch { return 'citizen'; }
}

/** Map a URL pathname to an activeTab string */
function pathToTab(path: string): string {
  if (path === '/login')            return 'login';
  if (path === '/register')         return 'register';
  if (path === '/forgot-password')  return 'login'; // handled inside LoginView
  if (path === '/dashboard' || path === '/profile') return 'profile';
  if (path === '/submit-complaint') return 'submit-complaint';
  if (path === '/track-complaint')  return 'track-complaint';
  if (path === '/departments')      return 'departments';
  if (path === '/how-it-works')     return 'how-it-works';
  if (path === '/admin' || path === '/officer-info') return 'admin';
  return 'home'; // '/' and anything else
}

/** Map an activeTab to its canonical URL */
function tabToPath(tab: string): string {
  if (tab === 'login')             return '/login';
  if (tab === 'register')          return '/register';
  if (tab === 'profile')           return '/dashboard';
  if (tab === 'submit-complaint')  return '/submit-complaint';
  if (tab === 'track-complaint')   return '/track-complaint';
  if (tab === 'departments')       return '/departments';
  if (tab === 'how-it-works')      return '/how-it-works';
  if (tab === 'admin')             return '/admin';
  return '/';
}

/** Guard: resolve the tab the user is allowed to visit */
function guardedTab(requestedTab: string): string {
  const token = getToken();
  const role  = getRole();

  // Auth pages: always accessible when logged out; redirect to dashboard when logged in
  if (requestedTab === 'login' || requestedTab === 'register') {
    return token ? 'profile' : requestedTab;
  }

  // Protected pages: need a token
  if (requestedTab === 'profile' || requestedTab === 'submit-complaint') {
    return token ? requestedTab : 'login';
  }

  // Admin page: needs admin role
  if (requestedTab === 'admin') {
    if (!token) return 'login';
    if (role !== 'admin' && !role.includes('admin')) return 'profile';
    return 'admin';
  }

  // Public pages: always accessible
  return requestedTab;
}

// ─── Main app ─────────────────────────────────────────────────────────────────

const MainAppContent: React.FC = () => {
  const { activeTab, setActiveTab } = useGrievance();

  // Boot: derive initial tab from the current URL with guards applied
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const p = typeof window !== 'undefined' ? window.location.pathname : '/';
    return p;
  });

  // On first render, resolve the URL to a guarded tab
  useEffect(() => {
    const initial = guardedTab(pathToTab(window.location.pathname));
    setActiveTab(initial);
    const canonicalPath = tabToPath(initial);
    if (window.location.pathname !== canonicalPath) {
      window.history.replaceState({}, '', canonicalPath);
    }
    setCurrentPath(canonicalPath);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Browser back/forward handling
  useEffect(() => {
    const handlePopState = () => {
      const tab = guardedTab(pathToTab(window.location.pathname));
      setActiveTab(tab);
      setCurrentPath(tabToPath(tab));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setActiveTab]);

  // Keep URL in sync when activeTab changes programmatically (e.g. from Header)
  useEffect(() => {
    const guarded = guardedTab(activeTab);
    if (guarded !== activeTab) {
      setActiveTab(guarded);
      return;
    }
    const path = tabToPath(activeTab);
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
  }, [activeTab, setActiveTab]);

  // Auth pages use their own full-screen AuthLayout (no header/footer)
  const isAuthPage = activeTab === 'login' || activeTab === 'register';

  if (isAuthPage) {
    return (
      <div className="min-h-screen flex flex-col relative text-slate-900 overflow-x-hidden">
        <AppBackground />
        <AuthLayout>
          {activeTab === 'login' && <LoginView />}
          {activeTab === 'register' && <RegisterView />}
        </AuthLayout>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative text-slate-900 overflow-x-hidden">
      <AppBackground />
      <Header />

      <main className="w-full pt-16 min-h-[calc(100vh-140px)] flex flex-col relative z-10">
        {(activeTab === 'home' || currentPath === '/') && <HomeView />}
        {(activeTab === 'track-complaint' || currentPath === '/track-complaint') && <Suspense fallback={<div>Loading...</div>}><TrackView /></Suspense>}
        {(activeTab === 'submit-complaint' || currentPath === '/submit-complaint') && <Suspense fallback={<div>Loading...</div>}><SubmitComplaintView /></Suspense>}
        {(activeTab === 'departments' || currentPath === '/departments') && <Suspense fallback={<div>Loading...</div>}><DepartmentsView /></Suspense>}
        {(activeTab === 'how-it-works' || currentPath === '/how-it-works') && <Suspense fallback={<div>Loading...</div>}><HowItWorksView /></Suspense>}
        {(activeTab === 'profile' || currentPath === '/dashboard') && <Suspense fallback={<div>Loading...</div>}><CitizenProfileView /></Suspense>}
        {(activeTab === 'admin' || currentPath === '/admin' || currentPath === '/officer-info') && <Suspense fallback={<div>Loading...</div>}><AdminView /></Suspense>}
        <NotificationsModal />
      </main>

      <Footer />
    </div>
  );
};

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [showIntro, setShowIntro] = useState(() => {
    // Show intro only if not seen in this tab session
    return !sessionStorage.getItem('introSeen');
  });

  const handleIntroComplete = () => {
    sessionStorage.setItem('introSeen', 'true');
    setShowIntro(false);
  };

  if (showIntro) {
    return <SplitFlapIntro onComplete={handleIntroComplete} />;
  }

  if (isEnvMissing) {
    return <EnvErrorScreen missing={missingEnvVars} />;
  }

  // The main return is now handled above after intro completes.
  return (
    <AnimationProvider>
      <GrievanceProvider>
        <MainAppContent />
      </GrievanceProvider>
    </AnimationProvider>
  );
}
