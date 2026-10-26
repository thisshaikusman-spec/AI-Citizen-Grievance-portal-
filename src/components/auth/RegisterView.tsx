import React, { useState, useEffect, useRef } from 'react';
import { useAnimation } from '../../context/AnimationContext.tsx';
import { useGrievance } from '../../context/GrievanceContext.tsx';
import { env, VerificationMethod } from '../../lib/env.ts';
import { supabase } from '../../lib/supabase.ts';
import { apiFetch, ApiError } from '../../lib/api.ts';

export const RegisterView: React.FC = () => {
  const { prefersReducedMotion } = useAnimation();
  const { setActiveTab } = useGrievance();

  // Verification method: 'none' | 'email' | 'phone'
  const [method, setMethod] = useState<VerificationMethod>(env.VITE_VERIFICATION_METHOD);

  // Steps:
  // - In phone mode: 1 (details), 2 (SMS OTP), 3 (completing)
  // - In email mode: 'details' (1), 'code' (2)
  const [phoneStep, setPhoneStep] = useState<1 | 2 | 3>(1);
  const [emailStep, setEmailStep] = useState<'details' | 'code'>('details');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [consentAgreed, setConsentAgreed] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [otp, setOtp] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isRegisteredError, setIsRegisteredError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);

  const countdownTimerRef = useRef<number | null>(null);

  const navigateToLogin = () => {
    setActiveTab('login');
    try {
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToDashboard = () => {
    setActiveTab('profile');
    try {
      window.history.pushState({}, '', '/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Resend countdown timer for verification code steps
  useEffect(() => {
    let isMounted = true;
    apiFetch<{ verification_method?: VerificationMethod }>('/auth/config')
      .then((cfg) => {
        if (!isMounted || !cfg?.verification_method) return;
        const m = cfg.verification_method.toLowerCase() as VerificationMethod;
        if (m === 'none' || m === 'email' || m === 'phone') {
          setMethod(m);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const isCodeStep = (method === 'phone' && phoneStep === 2) || (method === 'email' && emailStep === 'code');
    if (isCodeStep && resendCountdown > 0) {
      countdownTimerRef.current = window.setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [method, phoneStep, emailStep, resendCountdown]);

  // Mask phone for UI presentation (+91 98••••210)
  const getMaskedPhone = (digits: string) => {
    const clean = digits.replace(/\D/g, '');
    if (clean.length === 10) {
      return `+91 ${clean.slice(0, 2)}••••${clean.slice(-3)}`;
    }
    return `+91 ${clean}`;
  };

  // ============================================================================
  // Development Mode (method === 'none'): POST /auth/register then /auth/login/json
  // ============================================================================
  const handleDirectRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsRegisteredError(false);
    setSuccessNotice(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await apiFetch<{ id: number }>('/auth/register', {
        method: 'POST',
        body: {
          name: trimmedName,
          email: trimmedEmail,
          password,
        },
      });

      const loginRes = await apiFetch<{
        access_token: string;
        token_type?: string;
        role: string;
        name?: string;
      }>('/auth/login/json', {
        method: 'POST',
        body: {
          email: trimmedEmail,
          password,
        },
      });

      if (loginRes?.access_token) localStorage.setItem('access_token', loginRes.access_token);
      if (loginRes?.role) localStorage.setItem('role', loginRes.role);
      if (loginRes?.name) localStorage.setItem('name', loginRes.name);

      navigateToDashboard();
    } catch (backendError: any) {
      if (backendError instanceof ApiError) {
        if (backendError.status === 403) {
          // Switch to verified mode
          setMethod(env.VITE_VERIFICATION_METHOD !== 'none' ? env.VITE_VERIFICATION_METHOD : 'email');
          setErrorMessage('Verification is required. Use the verification code.');
        } else if (backendError.status === 409) {
          setIsRegisteredError(true);
          setErrorMessage('This email is already registered. Please log in.');
        } else if (backendError.status === 422) {
          setErrorMessage(backendError.message || 'Invalid registration details.');
        } else if (backendError.status === 503) {
          setErrorMessage('Service unavailable');
        } else {
          setErrorMessage(backendError.message || 'Cannot reach the server. Check your connection.');
        }
      } else {
        setErrorMessage(backendError?.message || 'Cannot reach the server. Check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // Phone OTP Flow (method === 'phone')
  // ============================================================================

  // Step 1: Send SMS OTP
  const handleSendPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsRegisteredError(false);
    setSuccessNotice(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const cleanPhone = phoneDigits.replace(/\D/g, '');

    if (!trimmedName) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    // Fixed +91, 10 digits starting with 6 to 9
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
      setErrorMessage('Please enter a valid 10-digit Indian phone number starting with 6, 7, 8, or 9.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (!consentAgreed) {
      setErrorMessage('Please agree to the phone verification consent to continue.');
      return;
    }

    setIsLoading(true);

    const formattedPhone = `+91${cleanPhone}`;

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        const isRateLimit =
          error.status === 429 ||
          /rate|too many|limit/i.test(error.message || '');
        if (isRateLimit) {
          setErrorMessage('Too many requests. Wait a minute and try again');
        } else {
          setErrorMessage('SMS could not be sent. Check the phone number.');
        }
        return;
      }

      setPhoneStep(2);
      setOtp('');
      setResendCountdown(60);
    } catch {
      setErrorMessage('SMS could not be sent. Check the phone number.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Resend Phone SMS Code
  const handleResendPhoneCode = async () => {
    if (resendCountdown > 0 || isLoading) return;
    setErrorMessage(null);
    setIsRegisteredError(false);
    setSuccessNotice(null);
    setIsLoading(true);

    const cleanPhone = phoneDigits.replace(/\D/g, '');
    const formattedPhone = `+91${cleanPhone}`;

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        const isRateLimit =
          error.status === 429 ||
          /rate|too many|limit/i.test(error.message || '');
        if (isRateLimit) {
          setErrorMessage('Too many requests. Wait a minute and try again');
        } else {
          setErrorMessage('SMS could not be sent. Check the phone number.');
        }
        return;
      }

      setResendCountdown(60);
      setSuccessNotice(`A new 6-digit verification code has been sent via SMS to ${getMaskedPhone(phoneDigits)}.`);
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch {
      setErrorMessage('SMS could not be sent. Check the phone number.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 -> 3: Verify Phone SMS OTP and Register
  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsRegisteredError(false);
    setSuccessNotice(null);

    const trimmedOtp = otp.trim();
    if (trimmedOtp.length !== 6) {
      setErrorMessage('Please enter the 6-digit code sent to your phone.');
      return;
    }

    setIsLoading(true);

    const cleanPhone = phoneDigits.replace(/\D/g, '');
    const formattedPhone = `+91${cleanPhone}`;

    try {
      const verifyRes = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: trimmedOtp,
        type: 'sms',
      });

      if (verifyRes.error || !verifyRes.data?.session?.access_token) {
        setErrorMessage('Wrong or expired code. Please try again.');
        setIsLoading(false);
        return;
      }

      const supabase_access_token = verifyRes.data.session.access_token;
      setPhoneStep(3);

      // Step 3: Register verified citizen on backend
      try {
        const regResponse = await apiFetch<{
          access_token: string;
          token_type?: string;
          role: string;
          name?: string;
        }>('/auth/register/verified', {
          method: 'POST',
          body: {
            name: fullName.trim(),
            email: email.trim().toLowerCase(),
            password,
            supabase_access_token,
          },
        });

        if (regResponse?.access_token) localStorage.setItem('access_token', regResponse.access_token);
        if (regResponse?.role) localStorage.setItem('role', regResponse.role);
        if (regResponse?.name) localStorage.setItem('name', regResponse.name);

        try {
          await supabase.auth.signOut();
        } catch {}

        navigateToDashboard();
      } catch (backendError: any) {
        try {
          await supabase.auth.signOut();
        } catch {}
        setPhoneStep(2);

        if (backendError instanceof ApiError) {
          if (backendError.status === 409) {
            setIsRegisteredError(true);
            setErrorMessage('Phone or email already registered. Please log in.');
          } else if (backendError.status === 401) {
            setErrorMessage('Wrong or expired code. Please request a new code.');
          } else if (backendError.status === 403) {
            setErrorMessage('Phone number has not been verified.');
          } else if (backendError.status === 422) {
            setErrorMessage(backendError.message || 'Invalid registration details.');
          } else if (backendError.status === 503) {
            setErrorMessage('Service unavailable');
          } else {
            setErrorMessage(backendError.message || 'Cannot reach the server. Check your connection.');
          }
        } else {
          setErrorMessage(backendError?.message || 'Cannot reach the server. Check your connection.');
        }
      }
    } catch {
      setErrorMessage('Wrong or expired code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // Email OTP Flow (method === 'email')
  // ============================================================================

  const handleSendEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsRegisteredError(false);
    setSuccessNotice(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const resp = await apiFetch<{ message: string }>('/auth/register/send-otp', {
        method: 'POST',
        body: {
          method: 'email',
          email: trimmedEmail,
        },
      });
      // Success response indicates OTP sent (or generic message)
      setEmailStep('code');
      setOtp('');
      setResendCountdown(60);
    } catch (backendError: any) {
      if (backendError instanceof ApiError) {
        if (backendError.status === 429) {
          setErrorMessage('Too many requests. Wait a minute and try again');
        } else {
          setErrorMessage(backendError.message || 'Could not send the code. Check the email address.');
        }
      } else {
        setErrorMessage('Could not send the code. Check the email address.');
      }
      return;
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmailCode = async () => {
    if (resendCountdown > 0 || isLoading) return;
    setErrorMessage(null);
    setIsRegisteredError(false);
    setSuccessNotice(null);
    setIsLoading(true);

    try {
      const resp = await apiFetch<{ message: string }>('/auth/register/send-otp', {
        method: 'POST',
        body: {
          method: 'email',
          email: email.trim(),
        },
      });
      setResendCountdown(60);
      setSuccessNotice('A new 6-digit code has been sent to your email.');
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (backendError: any) {
      if (backendError instanceof ApiError) {
        if (backendError.status === 429) {
          setErrorMessage('Too many requests. Wait a minute and try again');
        } else {
          setErrorMessage(backendError.message || 'Could not send the code. Check the email address.');
        }
      } else {
        setErrorMessage('Could not send the code. Check the email address.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsRegisteredError(false);
    setSuccessNotice(null);

    const trimmedOtp = otp.trim();
    if (trimmedOtp.length !== 6) {
      setErrorMessage('Please enter the 6-digit code sent to your email.');
      return;
    }

    setIsLoading(true);

    try {
      const trimmedEmail = email.trim();
      let verifyRes = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: trimmedOtp,
        type: 'email',
      });

      if (verifyRes.error) {
        const errMsg = (verifyRes.error.message || '').toLowerCase();
        const isInvalid =
          errMsg.includes('invalid') ||
          errMsg.includes('token') ||
          errMsg.includes('otp') ||
          errMsg.includes('expired') ||
          verifyRes.error.status === 400;

        if (isInvalid) {
          const retryRes = await supabase.auth.verifyOtp({
            email: trimmedEmail,
            token: trimmedOtp,
            type: 'signup',
          });
          if (!retryRes.error) {
            verifyRes = retryRes;
          }
        }
      }

      if (verifyRes.error || !verifyRes.data?.session?.access_token) {
        setErrorMessage(verifyRes.error?.message || 'Invalid or expired code. Please try again.');
        setIsLoading(false);
        return;
      }

      const supabase_access_token = verifyRes.data.session.access_token;

      try {
        const regResponse = await apiFetch<{
          access_token: string;
          token_type?: string;
          role: string;
          name?: string;
        }>('/auth/register/verified', {
          method: 'POST',
          body: {
            name: fullName.trim(),
            email: email.trim().toLowerCase(),
            password,
            supabase_access_token,
          },
        });

        if (regResponse?.access_token) localStorage.setItem('access_token', regResponse.access_token);
        if (regResponse?.role) localStorage.setItem('role', regResponse.role);
        if (regResponse?.name) localStorage.setItem('name', regResponse.name);

        try {
          await supabase.auth.signOut();
        } catch {}

        navigateToDashboard();
      } catch (backendError: any) {
        try {
          await supabase.auth.signOut();
        } catch {}

        if (backendError instanceof ApiError) {
          if (backendError.status === 401) {
            setErrorMessage('Verification expired. Request a new code.');
          } else if (backendError.status === 403) {
            setErrorMessage('Email is not verified.');
          } else if (backendError.status === 409) {
            setIsRegisteredError(true);
            setErrorMessage('This email is already registered. Please log in.');
          } else if (backendError.status === 422) {
            setErrorMessage(backendError.message || 'Invalid registration details.');
          } else if (backendError.status === 503) {
            setErrorMessage('Verification service unavailable');
          } else {
            setErrorMessage(backendError.message || 'Cannot reach the server. Check your connection.');
          }
        } else {
          setErrorMessage(backendError?.message || 'Cannot reach the server. Check your connection.');
        }
      }
    } catch {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasteOtp = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setOtp(pasted);
  };

  return (
    <div
      className={`w-full max-w-md mx-auto ${
        prefersReducedMotion ? '' : 'transition-all duration-300 ease-out transform'
      }`}
    >
      <div className="bg-slate-950/70 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl p-6 sm:p-8 text-white relative">

        {/* Phone Mode 3-Step Stepper */}
        {method === 'phone' && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 px-1 mb-2">
              <span className={phoneStep >= 1 ? 'text-blue-400' : 'text-slate-500'}>1. Details</span>
              <span className={phoneStep >= 2 ? 'text-blue-400' : 'text-slate-500'}>2. SMS Code</span>
              <span className={phoneStep >= 3 ? 'text-emerald-400' : 'text-slate-500'}>3. Complete</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
              <div
                className={`h-full transition-all duration-300 ${
                  phoneStep === 1
                    ? 'w-1/3 bg-blue-500'
                    : phoneStep === 2
                    ? 'w-2/3 bg-blue-500'
                    : 'w-full bg-emerald-500'
                }`}
              />
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/25 border border-blue-400/30 flex items-center justify-center text-blue-400 mb-3.5 shadow-inner">
            <span className="material-symbols-outlined text-[30px]" aria-hidden="true">
              {method === 'phone'
                ? phoneStep === 2
                  ? 'sms'
                  : phoneStep === 3
                  ? 'task_alt'
                  : 'phone_android'
                : method === 'email' && emailStep === 'code'
                ? 'mark_email_read'
                : 'person_add'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-[26px] font-bold text-white tracking-tight">
            {method === 'phone'
              ? phoneStep === 1
                ? 'Create Verified Account'
                : phoneStep === 2
                ? 'Verify Your Phone'
                : 'Finalizing Account'
              : method === 'email' && emailStep === 'code'
              ? 'Verify Your Email'
              : 'Create an Account'}
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            {method === 'phone'
              ? phoneStep === 1
                ? 'Register to report and track grievances (We verify your phone number)'
                : phoneStep === 2
                ? `We sent a 6-digit code by SMS to ${getMaskedPhone(phoneDigits)}`
                : 'Finalizing your phone-verified citizen account...'
              : method === 'email' && emailStep === 'code'
              ? `We sent a 6-digit code to ${email}`
              : 'Register to track civic grievances and election complaints'}
          </p>
        </div>

        {/* Aria live error and notice region */}
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
              {isRegisteredError && (
                <div className="pl-7">
                  <a
                    href="/login"
                    onClick={(e) => {
                      e.preventDefault();
                      navigateToLogin();
                    }}
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold underline text-xs cursor-pointer"
                  >
                    Go to Sign in →
                  </a>
                </div>
              )}
            </div>
          )}

          {successNotice && (
            <div
              role="status"
              className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in"
            >
              <span className="material-symbols-outlined text-[18px] text-emerald-400 shrink-0 mt-0.5">
                check_circle
              </span>
              <span>{successNotice}</span>
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* PHONE MODE (STEP 1: Details) */}
        {/* =================================================================== */}
        {method === 'phone' && phoneStep === 1 && (
          <form onSubmit={handleSendPhoneCode} noValidate className="flex flex-col gap-3.5">
            {/* Full Name */}
            <div className="flex flex-col gap-1">
              <label htmlFor="reg-name" className="text-xs font-semibold text-slate-200">
                Full Name
              </label>
              <input
                id="reg-name"
                type="text"
                name="name"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Arun Kumar"
                className="w-full h-11 px-3.5 rounded-xl bg-white text-slate-900 border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-[#1D4ED8] focus:outline-none min-h-[44px]"
              />
            </div>

            {/* Email Address with notice that phone is verified, not email */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label htmlFor="reg-email" className="text-xs font-semibold text-slate-200">
                  Email address
                </label>
                <span className="text-[11px] text-slate-400">Used for login</span>
              </div>
              <input
                id="reg-email"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-11 px-3.5 rounded-xl bg-white text-slate-900 border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-[#1D4ED8] focus:outline-none min-h-[44px]"
              />
            </div>

            {/* Phone Number: Fixed +91, 10 digits starting 6 to 9 */}
            <div className="flex flex-col gap-1">
              <label htmlFor="reg-phone" className="text-xs font-semibold text-slate-200">
                Mobile Number (India)
              </label>
              <div className="flex rounded-xl overflow-hidden border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-[#1D4ED8]">
                <span className="flex items-center justify-center px-3 bg-slate-100 text-slate-700 font-bold text-sm select-none border-r border-slate-300">
                  +91
                </span>
                <input
                  id="reg-phone"
                  type="tel"
                  inputMode="numeric"
                  name="tel"
                  autoComplete="tel-national"
                  required
                  maxLength={10}
                  value={phoneDigits}
                  onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                  className="w-full h-11 px-3.5 text-slate-900 text-sm font-medium focus:outline-none min-h-[44px]"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Enter your 10-digit number starting with 6, 7, 8, or 9
              </p>
            </div>

            {/* Password (min 8) */}
            <div className="flex flex-col gap-1">
              <label htmlFor="reg-password" className="text-xs font-semibold text-slate-200">
                Password (min. 8 characters)
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  name="new-password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-3.5 pr-11 rounded-xl bg-white text-slate-900 border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-[#1D4ED8] focus:outline-none min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-900 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[19px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-1">
              <label htmlFor="reg-confirm-password" className="text-xs font-semibold text-slate-200">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="reg-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirm-password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-3.5 pr-11 rounded-xl bg-white text-slate-900 border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-[#1D4ED8] focus:outline-none min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-900 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[19px]">
                    {showConfirmPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Mandatory SMS Consent Checkbox */}
            <div className="flex items-start gap-2.5 pt-1">
              <input
                id="reg-consent"
                type="checkbox"
                required
                checked={consentAgreed}
                onChange={(e) => setConsentAgreed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-400 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="reg-consent" className="text-xs text-slate-300 leading-snug cursor-pointer select-none">
                I agree my phone number is used only for verification and complaint updates
              </label>
            </div>

            {/* Submit: Send code */}
            <button
              type="submit"
              disabled={isLoading || !consentAgreed}
              className={`w-full h-11 mt-2 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[44px] cursor-pointer ${
                isLoading || !consentAgreed
                  ? 'bg-slate-700/80 text-slate-400 cursor-not-allowed border border-white/5'
                  : 'bg-[#1D4ED8] hover:bg-[#1E40AF] active:scale-[0.99] border border-blue-400/30'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Sending SMS code...</span>
                </>
              ) : (
                <span>Send code</span>
              )}
            </button>
          </form>
        )}

        {/* =================================================================== */}
        {/* PHONE MODE (STEP 2: Verify SMS OTP) */}
        {/* =================================================================== */}
        {method === 'phone' && phoneStep === 2 && (
          <form onSubmit={handleVerifyPhoneOtp} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-otp" className="text-xs font-semibold text-slate-200">
                6-Digit SMS Verification Code
              </label>
              <input
                id="reg-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onPaste={handlePasteOtp}
                placeholder="123456"
                className="w-full h-12 text-center tracking-[0.4em] font-mono text-xl rounded-xl bg-white text-slate-900 border border-slate-300 font-bold focus:ring-2 focus:ring-[#1D4ED8] focus:outline-none min-h-[44px]"
              />
              <p className="text-[11px] text-slate-400 text-center mt-0.5">
                Paste or enter the 6-digit code received via SMS
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.trim().length !== 6}
              className={`w-full h-11 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[44px] cursor-pointer ${
                isLoading || otp.trim().length !== 6
                  ? 'bg-slate-700/80 text-slate-400 cursor-not-allowed border border-white/5'
                  : 'bg-[#1D4ED8] hover:bg-[#1E40AF] active:scale-[0.99] border border-blue-400/30'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Verifying phone...</span>
                </>
              ) : (
                <span>Verify & Complete Registration</span>
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  setPhoneStep(1);
                  setErrorMessage(null);
                  setIsRegisteredError(false);
                }}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer min-h-[40px] flex items-center"
              >
                ← Change number
              </button>

              <button
                type="button"
                disabled={resendCountdown > 0 || isLoading}
                onClick={handleResendPhoneCode}
                className={`transition-colors cursor-pointer min-h-[40px] flex items-center ${
                  resendCountdown > 0 || isLoading
                    ? 'text-slate-500 cursor-not-allowed'
                    : 'text-blue-300 hover:text-blue-200 font-medium'
                }`}
              >
                {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : 'Resend code'}
              </button>
            </div>
          </form>
        )}

        {/* =================================================================== */}
        {/* PHONE MODE (STEP 3: Finalizing) */}
        {/* =================================================================== */}
        {method === 'phone' && phoneStep === 3 && (
          <div className="flex flex-col items-center justify-center py-6 text-center gap-3">
            <svg className="animate-spin h-8 w-8 text-blue-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <p className="text-sm font-semibold text-slate-200">
              Creating your phone-verified citizen account...
            </p>
          </div>
        )}

        {/* =================================================================== */}
        {/* EMAIL & DEV MODES */}
        {/* =================================================================== */}
        {method !== 'phone' && (
          <>
            {method === 'none' || emailStep === 'details' ? (
              <form
                onSubmit={method === 'email' ? handleSendEmailCode : handleDirectRegister}
                noValidate
                className="flex flex-col gap-3.5"
              >
                {/* Full Name */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="reg-name" className="text-xs font-semibold text-slate-200">
                    Full Name
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    name="name"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Arun Kumar"
                    className="w-full h-11 px-3.5 rounded-xl bg-white text-slate-900 border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-[#1D4ED8] focus:outline-none min-h-[44px]"
                  />
                </div>

                {/* Email Address */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="reg-email" className="text-xs font-semibold text-slate-200">
                    Email address
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-11 px-3.5 rounded-xl bg-white text-slate-900 border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-[#1D4ED8] focus:outline-none min-h-[44px]"
                  />
                </div>

                {/* Password (min 8) */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="reg-password" className="text-xs font-semibold text-slate-200">
                    Password (min. 8 characters)
                  </label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      name="new-password"
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-11 pl-3.5 pr-11 rounded-xl bg-white text-slate-900 border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-[#1D4ED8] focus:outline-none min-h-[44px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-900 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[19px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="reg-confirm-password" className="text-xs font-semibold text-slate-200">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="reg-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirm-password"
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-11 pl-3.5 pr-11 rounded-xl bg-white text-slate-900 border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-[#1D4ED8] focus:outline-none min-h-[44px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-900 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[19px]">
                        {showConfirmPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full h-11 mt-2 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[44px] cursor-pointer ${
                    isLoading
                      ? 'bg-slate-700/80 text-slate-400 cursor-not-allowed border border-white/5'
                      : 'bg-[#1D4ED8] hover:bg-[#1E40AF] active:scale-[0.99] border border-blue-400/30'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      <span>{method === 'email' ? 'Sending code...' : 'Registering...'}</span>
                    </>
                  ) : (
                    <span>{method === 'email' ? 'Send code' : 'Create Account'}</span>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyEmailOtp} noValidate className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reg-email-otp" className="text-xs font-semibold text-slate-200">
                    6-Digit Verification Code
                  </label>
                  <input
                    id="reg-email-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onPaste={handlePasteOtp}
                    placeholder="123456"
                    className="w-full h-12 text-center tracking-[0.4em] font-mono text-xl rounded-xl bg-white text-slate-900 border border-slate-300 font-bold focus:ring-2 focus:ring-[#1D4ED8] focus:outline-none min-h-[44px]"
                  />
                  <p className="text-[11px] text-slate-400 text-center mt-0.5">
                    Paste or enter the 6-digit code received in your inbox
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otp.trim().length !== 6}
                  className={`w-full h-11 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[44px] cursor-pointer ${
                    isLoading || otp.trim().length !== 6
                      ? 'bg-slate-700/80 text-slate-400 cursor-not-allowed border border-white/5'
                      : 'bg-[#1D4ED8] hover:bg-[#1E40AF] active:scale-[0.99] border border-blue-400/30'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Verify & Complete Registration</span>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailStep('details');
                      setErrorMessage(null);
                      setIsRegisteredError(false);
                    }}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer min-h-[40px] flex items-center"
                  >
                    ← Change email
                  </button>

                  <button
                    type="button"
                    disabled={resendCountdown > 0 || isLoading}
                    onClick={handleResendEmailCode}
                    className={`transition-colors cursor-pointer min-h-[40px] flex items-center ${
                      resendCountdown > 0 || isLoading
                        ? 'text-slate-500 cursor-not-allowed'
                        : 'text-blue-300 hover:text-blue-200 font-medium'
                    }`}
                  >
                    {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : 'Resend code'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* Footer Navigation Link */}
        <div className="mt-6 pt-5 border-t border-white/10 text-center text-xs sm:text-sm">
          <p className="text-slate-300">
            Already registered?{' '}
            <a
              href="/login"
              onClick={(e) => {
                e.preventDefault();
                navigateToLogin();
              }}
              className="text-blue-300 hover:text-white font-semibold transition-colors cursor-pointer min-h-[44px] inline-flex items-center"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterView;
