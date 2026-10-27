import React from 'react';

const rawApiUrl = import.meta.env.VITE_API_URL;
const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const rawSupabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const rawVerificationMethod = import.meta.env.VITE_VERIFICATION_METHOD;
const rawRequireEmailOtp = import.meta.env.VITE_REQUIRE_EMAIL_OTP;

export type VerificationMethod = 'none' | 'email' | 'phone';

// Determine effective verification method: 'none' | 'email' | 'phone'
// If both are set, VITE_VERIFICATION_METHOD wins.
let verificationMethod: VerificationMethod = 'email';
if (rawVerificationMethod) {
  const m = String(rawVerificationMethod).trim().toLowerCase();
  if (m === 'none' || m === 'email' || m === 'phone') {
    verificationMethod = m;
  }
} else if (rawRequireEmailOtp !== undefined && rawRequireEmailOtp !== null && rawRequireEmailOtp !== '') {
  const isEmail = String(rawRequireEmailOtp).toLowerCase() !== 'false' && rawRequireEmailOtp !== '0';
  verificationMethod = isEmail ? 'email' : 'none';
}

const missing: string[] = [];
if (!rawApiUrl) missing.push('VITE_API_URL');
if (verificationMethod !== 'none') {
  if (!rawSupabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!rawSupabaseKey) missing.push('VITE_SUPABASE_PUBLISHABLE_KEY');
}

export const missingEnvVars: string[] = missing;
export const isEnvMissing = missing.length > 0;
export const envErrorMessage = isEnvMissing
  ? `Missing ${missing.join(', ')}. Copy .env.example to .env and fill it`
  : null;

// Production validation -------------------------------------------------------
export const isProduction = import.meta.env.PROD;
export const isValidApiUrl = (() => {
  if (!rawApiUrl) return false;
  const url = rawApiUrl.trim();
  // Must start with https:// and must not contain localhost or 127.0.0.1
  const lower = url.toLowerCase();
  return (
    lower.startsWith('https://') &&
    !lower.includes('localhost') &&
    !lower.includes('127.0.0.1')
  );
})();

export const env = {
  VITE_API_URL: (rawApiUrl || '').replace(/\\/+$/, ''),
  VITE_SUPABASE_URL: rawSupabaseUrl || '',
  VITE_SUPABASE_PUBLISHABLE_KEY: rawSupabaseKey || '',
  VITE_VERIFICATION_METHOD: verificationMethod,
  VITE_REQUIRE_EMAIL_OTP: verificationMethod === 'email',
};

// Full‑screen error screen for mis‑configured production builds
export const ServerConfigErrorScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950 text-white p-6">
      <div className="max-w-xl w-full bg-slate-900/95 border border-red-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center">
        <h1 className="text-2xl font-bold mb-4">Server configuration error</h1>
        <p className="mb-3">
          The application could not determine a valid API server URL. In production the{' '}
          <code className="bg-slate-800 px-1.5 py-0.5 rounded">VITE_API_URL</code>{' '}
          variable must be set to a secure HTTPS endpoint and must not contain
          <code className="bg-slate-800 px-1.5 py-0.5 rounded">localhost</code> or
          <code className="bg-slate-800 px-1.5 py-0.5 rounded">127.0.0.1</code>.
        </p>
        <p className="text-sm text-slate-400">Check your Vercel project settings → Environment Variables and redeploy.</p>
      </div>
    </div>
  );
};
