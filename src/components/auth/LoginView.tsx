import React, { useState, useEffect, useRef } from 'react';
import { useAnimation } from '../../context/AnimationContext.tsx';
import { useGrievance } from '../../context/GrievanceContext.tsx';
import { apiFetch, ApiError } from '../../lib/api.ts';

interface LoginResponse {
  access_token: string;
  token_type?: string;
  role: string;
  name?: string;
}

export const LoginView: React.FC = () => {
  const { prefersReducedMotion } = useAnimation();
  const { setActiveTab } = useGrievance();

  // Mode: 'login' | 'forgot_password'
  const [viewMode, setViewMode] = useState<'login' | 'forgot_password'>(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/forgot-password') {
      return 'forgot_password';
    }
    return 'login';
  });

  // Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [is401, setIs401] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);

  // Forgot Password Multi-Step States:
  // 1 = Enter registered email to send OTP
  // 2 = Enter & verify 6-digit OTP code using six input boxes
  // 3 = Enter new password & confirm password
  // 4 = Password reset successful confirmation
  const [recoveryStep, setRecoveryStep] = useState<1 | 2 | 3 | 4>(1);
  const [recoveryMethod, setRecoveryMethod] = useState<'email' | 'phone'>('email');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryPhoneDigits, setRecoveryPhoneDigits] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [supabaseAccessToken, setSupabaseAccessToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoadingRecovery, setIsLoadingRecovery] = useState(false);
  const [recoveryErrorMessage, setRecoveryErrorMessage] = useState<string | null>(null);
  const [recoverySuccessNotice, setRecoverySuccessNotice] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState<number>(0);
  const [redirectCountdown, setRedirectCountdown] = useState<number>(3);

  const countdownTimerRef = useRef<number | null>(null);
  const resendTimerRef = useRef<number | null>(null);
  const redirectTimerRef = useRef<number | null>(null);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const navigateTo = (path: string, tabName?: string) => {
    if (tabName) {
      setActiveTab(tabName);
    } else if (path === '/dashboard') {
      setActiveTab('profile');
    } else if (path === '/admin') {
      setActiveTab('admin');
    } else if (path === '/officer-info') {
      setActiveTab('officer-info');
    } else if (path === '/track-complaint') {
      setActiveTab('track-complaint');
    } else {
      setActiveTab('home');
    }
    try {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const redirectByRole = (role: string) => {
    const normalizedRole = (role || '').toLowerCase();
    if (normalizedRole.includes('admin')) {
      navigateTo('/admin', 'admin');
    } else if (normalizedRole.includes('officer')) {
      navigateTo('/officer-info', 'officer-info');
    } else {
      navigateTo('/dashboard', 'profile');
    }
  };

  // Sync viewMode on browser Back/Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        if (window.location.pathname === '/forgot-password') {
          setViewMode('forgot_password');
        } else if (window.location.pathname === '/login') {
          setViewMode('login');
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Check for session flash messages or valid existing token on mount
  useEffect(() => {
    let isMounted = true;
    try {
      const sessionNotice = sessionStorage.getItem('auth_notice');
      if (sessionNotice) {
        setErrorMessage(sessionNotice);
        sessionStorage.removeItem('auth_notice');
      }

      const existingToken = localStorage.getItem('access_token');
      if (existingToken) {
        apiFetch<{ role?: string; name?: string }>('/auth/me', { auth: true })
          .then((data) => {
            if (!isMounted) return;
            const role = data?.role || localStorage.getItem('role') || 'citizen';
            redirectByRole(role);
          })
          .catch(() => {
            // apiFetch with auth: true already clears storage on 401
          });
      }
    } catch {}

    return () => {
      isMounted = false;
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (resendTimerRef.current) clearInterval(resendTimerRef.current);
      if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
    };
  }, []);

  // Login Rate limit 429 countdown timer
  useEffect(() => {
    if (retryCountdown !== null && retryCountdown > 0) {
      countdownTimerRef.current = window.setInterval(() => {
        setRetryCountdown((prev) => {
          if (prev === null || prev <= 1) {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [retryCountdown]);

  // Resend OTP Countdown Timer (60s)
  useEffect(() => {
    if (resendCountdown > 0) {
      resendTimerRef.current = window.setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            if (resendTimerRef.current) clearInterval(resendTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    };
  }, [resendCountdown]);

  // Auto-focus the first OTP box when entering Step 2
  useEffect(() => {
    if (viewMode === 'forgot_password' && recoveryStep === 2) {
      const timer = window.setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [viewMode, recoveryStep]);

  // Success Step Auto-Redirect Timer
  useEffect(() => {
    if (viewMode === 'forgot_password' && recoveryStep === 4) {
      setRedirectCountdown(3);
      redirectTimerRef.current = window.setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev <= 1) {
            if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
            switchToLogin();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
    };
  }, [viewMode, recoveryStep]);

  // Masking helpers for secure UI display
  const getMaskedEmail = (raw: string) => {
    const clean = raw.trim();
    const parts = clean.split('@');
    if (parts.length === 2 && parts[0].length >= 2) {
      const user = parts[0];
      return `${user.slice(0, 1)}•••••${user.slice(-1)}@${parts[1]}`;
    }
    return clean;
  };

  const getMaskedPhone = (digits: string) => {
    const clean = digits.replace(/\D/g, '');
    if (clean.length === 10) {
      return `+91 ${clean.slice(0, 2)}•••••${clean.slice(-3)}`;
    }
    return `+91 ${clean}`;
  };

  // Switchers between Login and Forgot Password
  const switchToForgotPassword = () => {
    setErrorMessage(null);
    setRecoveryErrorMessage(null);
    setRecoverySuccessNotice(null);
    setRecoveryStep(1);
    setOtpDigits(['', '', '', '', '', '']);
    setNewPassword('');
    setConfirmPassword('');
    if (email.trim() && !recoveryEmail) {
      setRecoveryEmail(email.trim());
    }
    setViewMode('forgot_password');
    try {
      window.history.pushState({}, '', '/forgot-password');
    } catch {}
  };

  const switchToLogin = () => {
    setErrorMessage(null);
    setRecoveryErrorMessage(null);
    setRecoverySuccessNotice(null);
    setRecoveryStep(1);
    setOtpDigits(['', '', '', '', '', '']);
    if (recoveryEmail.trim() && !email) {
      setEmail(recoveryEmail.trim());
    }
    setViewMode('login');
    try {
      window.history.pushState({}, '', '/login');
    } catch {}
  };

  // ============================================================================
  // Login Submission Handler
  // ============================================================================
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIs401(false);

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email format (e.g., name@example.com).');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      const data = await apiFetch<LoginResponse>('/auth/login/json', {
        method: 'POST',
        body: { email: trimmedEmail, password },
      });

      if (data?.access_token) localStorage.setItem('access_token', data.access_token);
      if (data?.role) localStorage.setItem('role', data.role);
      if (data?.name) localStorage.setItem('name', data.name);

      redirectByRole(data?.role || 'citizen');
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setRetryCountdown(err.retryAfter || 60);
          return;
        }
        if (err.status === 401) {
          setIs401(true);
          setErrorMessage('Incorrect email or password');
          return;
        }
        setErrorMessage(err.message || 'Cannot reach the server. Check your connection.');
      } else {
        setErrorMessage(err?.message || 'Cannot reach the server. Check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // Direct Password Reset (No OTP / SMS required)
  // ============================================================================
  const handleDirectResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryErrorMessage(null);
    setRecoverySuccessNotice(null);

    const trimmedEmail = recoveryEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setRecoveryErrorMessage('Please enter a valid email format (e.g. citizen@example.com).');
      return;
    }

    if (newPassword.length < 8) {
      setRecoveryErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setRecoveryErrorMessage('New passwords do not match. Please re-enter.');
      return;
    }

    setIsLoadingRecovery(true);

    try {
      const data = await apiFetch<{ status?: string; message?: string }>(
        '/auth/forgot-password/direct',
        {
          method: 'POST',
          body: {
            email: trimmedEmail,
            new_password: newPassword,
            confirm_password: confirmPassword,
          },
        }
      );

      setRecoverySuccessNotice(
        data?.message || 'Password updated successfully! You can now sign in with your new password.'
      );
      setRecoveryStep(4);
      setRedirectCountdown(3);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setRecoveryErrorMessage(err.message || 'Unable to update password. Please check your email.');
      } else {
        setRecoveryErrorMessage(err?.message || 'Cannot reach the server. Check your connection.');
      }
    } finally {
      setIsLoadingRecovery(false);
    }
  };

  // ============================================================================
  // Step 1: Send OTP for Password Recovery
  // ============================================================================
  const handleSendRecoveryOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setRecoveryErrorMessage(null);
    setRecoverySuccessNotice(null);

    let payload: { method: 'email' | 'phone'; email?: string; phone?: string };

    if (recoveryMethod === 'email') {
      const trimmedEmail = recoveryEmail.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!trimmedEmail) {
        setRecoveryErrorMessage('Please enter your registered email address.');
        return;
      }
      if (!emailRegex.test(trimmedEmail)) {
        setRecoveryErrorMessage('Please enter a valid email format (e.g. citizen@example.com).');
        return;
      }
      payload = { method: 'email', email: trimmedEmail };
    } else {
      const cleanPhone = recoveryPhoneDigits.replace(/\D/g, '');
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
        setRecoveryErrorMessage('Please enter a valid 10-digit Indian phone number starting with 6, 7, 8, or 9.');
        return;
      }
      payload = { method: 'phone', phone: `+91${cleanPhone}` };
    }

    setIsLoadingRecovery(true);

    try {
      const data = await apiFetch<{ status?: string; message?: string }>(
        '/auth/forgot-password/send-otp',
        {
          method: 'POST',
          body: payload,
        }
      );

      setRecoverySuccessNotice(
        data?.message || 'A 6-digit recovery OTP has been sent to your registered email.'
      );
      setRecoveryStep(2);
      setOtpDigits(['', '', '', '', '', '']);
      setResendCountdown(60);
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setRecoveryErrorMessage(`Too many attempts. Please try again in ${err.retryAfter || 60}s.`);
          return;
        }
        setRecoveryErrorMessage(err.message || 'Unable to send recovery code. Please check your contact information.');
      } else {
        setRecoveryErrorMessage(err?.message || 'Cannot reach the server. Check your connection.');
      }
    } finally {
      setIsLoadingRecovery(false);
    }
  };

  // ============================================================================
  // Step 2: 6-Box OTP Input Event Handlers
  // ============================================================================
  const handleOtpBoxChange = (index: number, value: string) => {
    const numericChar = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = numericChar;
    setOtpDigits(newDigits);
    setRecoveryErrorMessage(null);

    // Auto-advance cursor to next box if character was entered
    if (numericChar && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpBoxKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        // Current box is empty, jump to previous box and clear it
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        otpInputsRef.current[index - 1]?.focus();
      } else if (otpDigits[index]) {
        // Clear current box
        const newDigits = [...otpDigits];
        newDigits[index] = '';
        setOtpDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpBoxPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedNumbers = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedNumbers) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedNumbers[i] || '';
    }
    setOtpDigits(newDigits);
    setRecoveryErrorMessage(null);

    // Focus on the next empty box or the last box
    const nextEmpty = newDigits.findIndex((d) => !d);
    const focusTarget = nextEmpty !== -1 ? nextEmpty : 5;
    otpInputsRef.current[focusTarget]?.focus();
  };

  // ============================================================================
  // Step 2: Verify 6-Digit OTP Code
  // ============================================================================
  const handleVerifyRecoveryOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryErrorMessage(null);
    setRecoverySuccessNotice(null);

    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6 || !/^\d{6}$/.test(fullOtp)) {
      setRecoveryErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsLoadingRecovery(true);

    const payload = {
      method: recoveryMethod,
      email: recoveryMethod === 'email' ? recoveryEmail.trim() : undefined,
      phone: recoveryMethod === 'phone' ? `+91${recoveryPhoneDigits.replace(/\D/g, '')}` : undefined,
      otp: fullOtp,
    };

    try {
      const data = await apiFetch<{ status: string; supabase_access_token: string; message: string }>(
        '/auth/forgot-password/verify-otp',
        {
          method: 'POST',
          body: payload,
        }
      );

      if (!data?.supabase_access_token) {
        setRecoveryErrorMessage('Invalid or expired OTP code. Please request a new code.');
        return;
      }

      setSupabaseAccessToken(data.supabase_access_token);
      setRecoveryStep(3);
      setRecoverySuccessNotice('OTP code verified successfully! Now set your new password.');
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setRecoveryErrorMessage(`Too many failed attempts. Try again in ${err.retryAfter || 60}s.`);
          return;
        }
        setRecoveryErrorMessage(err.message || 'Invalid or expired verification code.');
      } else {
        setRecoveryErrorMessage(err?.message || 'Cannot reach the server. Check your connection.');
      }
    } finally {
      setIsLoadingRecovery(false);
    }
  };

  // ============================================================================
  // Step 3: Reset Password
  // ============================================================================
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryErrorMessage(null);
    setRecoverySuccessNotice(null);

    if (newPassword.length < 8) {
      setRecoveryErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setRecoveryErrorMessage('New passwords do not match. Please re-enter.');
      return;
    }

    if (!supabaseAccessToken) {
      setRecoveryErrorMessage('Session expired. Please verify your OTP code again.');
      setRecoveryStep(1);
      return;
    }

    setIsLoadingRecovery(true);

    try {
      const data = await apiFetch<{ status: string; message: string }>(
        '/auth/reset-password',
        {
          method: 'POST',
          body: {
            new_password: newPassword,
            confirm_password: confirmPassword,
            supabase_access_token: supabaseAccessToken,
          },
        }
      );

      setRecoverySuccessNotice(
        data?.message || 'Password reset successful!'
      );
      setRecoveryStep(4);
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setRecoveryErrorMessage('Recovery session expired. Please verify your OTP again.');
          setRecoveryStep(2);
          return;
        }
        setRecoveryErrorMessage(err.message || 'Unable to reset password. Please try again.');
      } else {
        setRecoveryErrorMessage(err?.message || 'Cannot reach the server. Check your connection.');
      }
    } finally {
      setIsLoadingRecovery(false);
    }
  };

  const isLoginButtonDisabled = isLoading || (retryCountdown !== null && retryCountdown > 0);
  const isOtpComplete = otpDigits.every((d) => d.length === 1);

  return (
    <div
      className={`w-full max-w-md mx-auto ${
        prefersReducedMotion ? '' : 'transition-all duration-300 ease-out transform'
      }`}
    >
      {/* Dark Navy Glass Card */}
      <div className="bg-slate-950/75 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl p-6 sm:p-8 text-white relative">
        {/* ==================================================================== */}
        {/* LOGIN VIEW MODE */}
        {/* ==================================================================== */}
        {viewMode === 'login' ? (
          <>
            {/* Header Zone: Shield Icon & Titles */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/25 border border-blue-400/30 flex items-center justify-center text-blue-400 mb-3.5 shadow-inner">
                <span className="material-symbols-outlined text-[30px]" aria-hidden="true">
                  shield
                </span>
              </div>
              <h1 className="text-2xl sm:text-[26px] font-bold text-white tracking-tight">
                Welcome back
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                Sign in to track your grievances and civic reports
              </p>
            </div>

            {/* Accessible Aria-Live Error Region */}
            <div aria-live="assertive" role="region" className="mb-4">
              {errorMessage && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs sm:text-sm flex flex-col gap-2 animate-in fade-in"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[18px] text-red-400 shrink-0 mt-0.5">
                      error
                    </span>
                    <span>{errorMessage}</span>
                  </div>
                  {is401 && (
                    <div className="pl-7">
                      <span className="text-slate-300 text-xs">No account yet? </span>
                      <a
                        href="/register"
                        onClick={(e) => {
                          e.preventDefault();
                          navigateTo('/register', 'register');
                        }}
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold underline text-xs cursor-pointer"
                      >
                        Create one →
                      </a>
                    </div>
                  )}
                </div>
              )}

              {retryCountdown !== null && retryCountdown > 0 && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-200 text-xs sm:text-sm flex items-start gap-2.5"
                >
                  <span className="material-symbols-outlined text-[18px] text-amber-400 shrink-0 mt-0.5">
                    schedule
                  </span>
                  <span>Too many attempts. Try again in {retryCountdown}s</span>
                </div>
              )}
            </div>

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} noValidate className="flex flex-col gap-4">
              {/* Email Field */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="login-email"
                  className="text-xs font-semibold text-slate-200 tracking-wide"
                >
                  Email address
                </label>
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-11 px-3.5 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent transition-all min-h-[44px]"
                />
              </div>

              {/* Password Field with Show/Hide toggle */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="login-password"
                  className="text-xs font-semibold text-slate-200 tracking-wide"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 pl-3.5 pr-11 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent transition-all min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-900 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-[19px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Forgot Password? Link: Directly below password field */}
              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  id="forgot-password-link"
                  onClick={switchToForgotPassword}
                  className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors cursor-pointer py-1 px-1 focus:outline-none focus:underline"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                id="sign-in-submit-button"
                disabled={isLoginButtonDisabled}
                className={`w-full h-11 mt-1 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 min-h-[44px] cursor-pointer ${
                  isLoginButtonDisabled
                    ? 'bg-slate-700/80 text-slate-400 cursor-not-allowed border border-white/5'
                    : 'bg-[#1D4ED8] hover:bg-[#1E40AF] active:scale-[0.99] border border-blue-400/30'
                }`}
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      ></path>
                    </svg>
                    <span>Signing in...</span>
                  </>
                ) : retryCountdown !== null && retryCountdown > 0 ? (
                  <span>Too many attempts. Try again in {retryCountdown}s</span>
                ) : (
                  <span>Sign in</span>
                )}
              </button>
            </form>

            {/* Footer Navigation Links */}
            <div className="mt-6 pt-5 border-t border-white/10 flex flex-col items-center gap-3 text-center text-xs sm:text-sm">
              <a
                href="/register"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/register', 'register');
                }}
                className="text-blue-300 hover:text-white font-medium transition-colors cursor-pointer min-h-[44px] flex items-center justify-center focus:outline-none focus:underline"
              >
                Create an account
              </a>

              <a
                href="/track-complaint"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/track-complaint', 'track-complaint');
                }}
                className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer min-h-[44px] flex items-center justify-center focus:outline-none focus:underline"
              >
                Track a complaint without login
              </a>
            </div>
          </>
        ) : (
          /* ==================================================================== */
          /* FORGOT PASSWORD MULTI-STEP RECOVERY MODE */
          /* ==================================================================== */
          <>
            {/* Header: Shield Icon & Title */}
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/25 border border-blue-400/30 flex items-center justify-center text-blue-400 mb-3 shadow-inner">
                <span className="material-symbols-outlined text-[30px]" aria-hidden="true">
                  {recoveryStep === 4 ? 'verified_user' : 'lock_reset'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-[24px] font-bold text-white tracking-tight">
                {recoveryStep === 4 ? 'Password Reset Successful' : 'Reset Your Password'}
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xs">
                {recoveryStep === 4
                  ? 'Your password has been securely updated. Redirecting to sign in...'
                  : 'Enter your registered email and choose a new password.'}
              </p>
            </div>

            {/* Status & Error Alerts */}
            <div aria-live="assertive" role="region" className="mb-4">
              {recoveryErrorMessage && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in"
                >
                  <span className="material-symbols-outlined text-[18px] text-red-400 shrink-0 mt-0.5">
                    error
                  </span>
                  <span>{recoveryErrorMessage}</span>
                </div>
              )}

              {recoverySuccessNotice && recoveryStep !== 4 && (
                <div
                  role="status"
                  className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in"
                >
                  <span className="material-symbols-outlined text-[18px] text-emerald-400 shrink-0 mt-0.5">
                    check_circle
                  </span>
                  <span>{recoverySuccessNotice}</span>
                </div>
              )}
            </div>

            {/* DIRECT PASSWORD RESET FORM */}
            {recoveryStep !== 4 ? (
              <form onSubmit={handleDirectResetPassword} noValidate className="flex flex-col gap-3.5">
                {/* Email Input */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="recovery-email-input"
                    className="text-xs font-semibold text-slate-200 tracking-wide"
                  >
                    Registered Email Address
                  </label>
                  <input
                    id="recovery-email-input"
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="citizen@example.com"
                    disabled={isLoadingRecovery}
                    className="w-full h-11 px-3.5 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent transition-all min-h-[44px]"
                  />
                </div>

                {/* New Password */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="reset-new-password"
                    className="text-xs font-semibold text-slate-200 tracking-wide"
                  >
                    New Password (min. 8 characters)
                  </label>
                  <div className="relative">
                    <input
                      id="reset-new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={isLoadingRecovery}
                      className="w-full h-11 pl-3.5 pr-11 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent transition-all min-h-[44px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-900 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined text-[19px]">
                        {showNewPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="reset-confirm-password"
                    className="text-xs font-semibold text-slate-200 tracking-wide"
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      id="reset-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={isLoadingRecovery}
                      className="w-full h-11 pl-3.5 pr-11 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent transition-all min-h-[44px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-900 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined text-[19px]">
                        {showConfirmPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Primary Action Button: Save Password */}
                <button
                  type="submit"
                  id="reset-password-final-button"
                  disabled={isLoadingRecovery || newPassword.length < 8 || newPassword !== confirmPassword}
                  className="w-full h-11 mt-2 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[44px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingRecovery ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      <span>Updating password...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center text-center py-2 animate-in fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4">
                  <span className="material-symbols-outlined text-[36px]">check_circle</span>
                </div>

                <h2 className="text-lg font-bold text-white mb-1">
                  Password Reset Successful
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mb-6">
                  Your password has been securely updated. You can now log in with your new credentials.
                  Redirecting in <span className="font-bold text-white">{redirectCountdown}s</span>...
                </p>

                <button
                  type="button"
                  id="return-to-login-button"
                  onClick={switchToLogin}
                  className="w-full h-11 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  <span>Return to Login</span>
                </button>
              </div>
            )}

            {/* Back to Sign In Link */}
            {recoveryStep !== 4 && (
              <div className="mt-4 flex items-center justify-center">
                <button
                  type="button"
                  id="back-to-sign-in-button"
                  onClick={switchToLogin}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors cursor-pointer min-h-[44px] py-1 px-2 focus:outline-none focus:underline"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    arrow_back
                  </span>
                  <span>Back to Sign In</span>
                </button>
              </div>
            )}

            {/* Secondary Footer Links */}
            <div className="mt-6 pt-5 border-t border-white/10 flex flex-col items-center gap-3 text-center text-xs sm:text-sm">
              <a
                href="/register"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/register', 'register');
                }}
                className="text-blue-300 hover:text-white font-medium transition-colors cursor-pointer min-h-[44px] flex items-center justify-center focus:outline-none focus:underline"
              >
                Create an account
              </a>

              <a
                href="/track-complaint"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/track-complaint', 'track-complaint');
                }}
                className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer min-h-[44px] flex items-center justify-center focus:outline-none focus:underline"
              >
                Track a complaint without login
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginView;
