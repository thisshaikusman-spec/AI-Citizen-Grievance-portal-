import React, { useState } from 'react';
import { useGrievance } from '../context/GrievanceContext.tsx';

export const Header: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    unreadCount,
    setIsNotificationsOpen,
    isNotificationsOpen,
    currentUser,
    logout,
  } = useGrievance();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const role = (currentUser?.role || (typeof window !== 'undefined' ? localStorage.getItem('role') : null) || 'citizen').toLowerCase();
  const userName = currentUser?.name || (typeof window !== 'undefined' ? localStorage.getItem('name') : null) || 'Citizen';
  const isAdmin = role === 'admin' || role.includes('admin');

  const handleNavClick = (tab: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setActiveTab(tab);
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);

    let path = '/';
    if (tab === 'track-complaint') path = '/track-complaint';
    else if (tab === 'submit-complaint') path = '/submit-complaint';
    else if (tab === 'departments') path = '/departments';
    else if (tab === 'how-it-works') path = '/how-it-works';
    else if (tab === 'profile') path = '/dashboard';
    else if (tab === 'admin') path = '/admin';
    else if (tab === 'login') path = '/login';
    else if (tab === 'register') path = '/register';

    try {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-slate-950/70 backdrop-blur-xl shadow-lg border-b border-white/10 text-white">
      <div className="h-16 max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-3">
          <a
            onClick={(e) => handleNavClick('home', e)}
            href="#home"
            className="flex items-center gap-2.5 group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[20px]">shield</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-[16px] text-white tracking-tight leading-none group-hover:text-blue-300 transition-colors">
                Citizen Grievance Portal
              </span>
              <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider mt-0.5 leading-none">
                Civic Redressal System
              </span>
            </div>
          </a>
        </div>

        {/* Center Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => handleNavClick('home', e)}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
              activeTab === 'home'
                ? 'bg-blue-600/30 text-blue-200 border border-blue-400/30'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={(e) => handleNavClick('track-complaint', e)}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
              activeTab === 'track-complaint'
                ? 'bg-blue-600/30 text-blue-200 border border-blue-400/30'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Track Complaint
          </button>
          <button
            type="button"
            onClick={(e) => handleNavClick('departments', e)}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
              activeTab === 'departments'
                ? 'bg-blue-600/30 text-blue-200 border border-blue-400/30'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Departments
          </button>
          <button
            type="button"
            onClick={(e) => handleNavClick('how-it-works', e)}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
              activeTab === 'how-it-works'
                ? 'bg-blue-600/30 text-blue-200 border border-blue-400/30'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            How It Works
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={(e) => handleNavClick('admin', e)}
              className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-amber-600/30 text-amber-200 border border-amber-400/30'
                  : 'text-amber-300 hover:text-white hover:bg-white/10'
              }`}
            >
              Admin Console
            </button>
          )}
        </nav>

        {/* Right CTA and Profile Zone */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* ── Logged-in actions ── */}
          {token && (
            <>
              {/* Submit Complaint */}
              <button
                type="button"
                onClick={(e) => handleNavClick('submit-complaint', e)}
                className="hidden sm:inline-flex items-center justify-center h-9 px-3.5 bg-[#1d4ed8] text-white text-[13px] font-semibold rounded-lg hover:bg-[#1e40af] transition-colors shadow-sm cursor-pointer border border-blue-400/30 min-h-[36px]"
              >
                <span className="material-symbols-outlined text-[17px] mr-1">add_circle</span>
                <span>Submit Complaint</span>
              </button>

              {/* Notifications */}
              <button
                aria-label="Notifications"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 relative transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px] leading-none">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-slate-950"></span>
                )}
              </button>

              <div className="h-6 w-px bg-white/20 hidden md:block"></div>
            </>
          )}

          {/* ── Logged-out: Login + Sign Up ── */}
          {!token ? (
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                id="header-login-btn"
                onClick={(e) => handleNavClick('login', e)}
                className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold text-slate-200 hover:text-white bg-white/10 hover:bg-white/15 rounded-lg border border-white/15 transition-all cursor-pointer min-h-[36px]"
              >
                <span className="material-symbols-outlined text-[16px]">login</span>
                <span>Login</span>
              </button>
              <button
                type="button"
                id="header-signup-btn"
                onClick={(e) => handleNavClick('register', e)}
                className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold text-white bg-[#1d4ed8] hover:bg-[#1e40af] rounded-lg border border-blue-400/30 transition-all cursor-pointer shadow-sm min-h-[36px]"
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                <span>Sign Up</span>
              </button>
            </div>
          ) : (
            /* Logged In User Pill with Dropdown */
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer group"
                type="button"
                aria-label="User Profile Menu"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 font-bold text-xs ring-1 ring-white/20">
                  {userName.slice(0, 1).toUpperCase()}
                </div>
                <div className="hidden xl:flex flex-col text-left">
                  <span className="text-[12px] font-semibold text-slate-200 group-hover:text-white transition-colors leading-none truncate max-w-[120px]">
                    {userName}
                  </span>
                  <span className="text-[10px] text-blue-300 capitalize leading-none mt-0.5">
                    {role}
                  </span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-white hidden xl:block">
                  expand_more
                </span>
              </button>

              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-950/95 backdrop-blur-2xl rounded-xl shadow-2xl border border-white/15 p-3 z-50 text-white">
                  <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                    <div className="w-10 h-10 rounded-full bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 font-bold text-base shrink-0">
                      {userName.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-semibold text-[13px] text-white truncate">{userName}</span>
                      <span className="text-[11px] text-slate-400 truncate">{currentUser?.email || ''}</span>
                      <span className="text-[10px] text-blue-300 font-semibold uppercase tracking-wider capitalize mt-0.5">
                        Role: {role}
                      </span>
                    </div>
                  </div>

                  <div className="py-2 flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleNavClick('profile', e)}
                      className="w-full text-left px-3 py-2 text-[12px] font-medium text-slate-200 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[17px] text-blue-400">dashboard</span>
                      <span>My Dashboard</span>
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={(e) => handleNavClick('admin', e)}
                        className="w-full text-left px-3 py-2 text-[12px] font-medium text-amber-200 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[17px] text-amber-400">admin_panel_settings</span>
                        <span>Admin Console</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleNavClick('track-complaint', e)}
                      className="w-full text-left px-3 py-2 text-[12px] font-medium text-slate-200 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[17px] text-blue-400">search</span>
                      <span>Track Grievance</span>
                    </button>

                    <div className="my-1 border-t border-white/10" />

                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-2 text-[12px] font-medium text-red-300 hover:bg-red-950/40 hover:text-red-200 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[17px] text-red-400">logout</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <span className="material-symbols-outlined text-[24px]">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-950 border-b border-white/10 p-4 flex flex-col gap-2 animate-in slide-in-from-top-2">
          <button
            type="button"
            onClick={(e) => handleNavClick('home', e)}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-slate-200 hover:bg-white/10"
          >
            Home
          </button>
          <button
            type="button"
            onClick={(e) => handleNavClick('track-complaint', e)}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-slate-200 hover:bg-white/10"
          >
            Track Complaint
          </button>
          <button
            type="button"
            onClick={(e) => handleNavClick('departments', e)}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-slate-200 hover:bg-white/10"
          >
            Departments
          </button>
          <button
            type="button"
            onClick={(e) => handleNavClick('how-it-works', e)}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-slate-200 hover:bg-white/10"
          >
            How It Works
          </button>
          {token && (
            <button
              type="button"
              onClick={(e) => handleNavClick('profile', e)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-slate-200 hover:bg-white/10"
            >
              My Dashboard
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={(e) => handleNavClick('admin', e)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-amber-300 hover:bg-white/10"
            >
              Admin Console
            </button>
          )}
          {token ? (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-red-400 hover:bg-red-950/40"
            >
              Sign Out
            </button>
          ) : (
            <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
              <button
                type="button"
                onClick={(e) => handleNavClick('login', e)}
                className="w-full py-2 text-center rounded-lg text-sm font-semibold bg-white/10 text-white"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={(e) => handleNavClick('register', e)}
                className="w-full py-2 text-center rounded-lg text-sm font-semibold bg-blue-600 text-white"
              >
                Register
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
