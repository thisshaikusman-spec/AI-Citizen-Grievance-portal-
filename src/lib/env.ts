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

export const env = {
  VITE_API_URL: (rawApiUrl || '').replace(/\/+$/, ''),
  VITE_SUPABASE_URL: rawSupabaseUrl || '',
  VITE_SUPABASE_PUBLISHABLE_KEY: rawSupabaseKey || '',
  VITE_VERIFICATION_METHOD: verificationMethod,
  VITE_REQUIRE_EMAIL_OTP: verificationMethod === 'email',
};

export const EnvErrorScreen: React.FC<{ missing: string[] }> = ({ missing }) => {
  const missingText = `Missing ${missing.join(', ')}. Copy .env.example to .env and fill it`;

  return React.createElement(
    'div',
    {
      role: 'alert',
      className:
        'fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950 text-white p-6 select-text',
    },
    React.createElement(
      'div',
      {
        className:
          'max-w-lg w-full bg-slate-900/95 border border-red-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center',
      },
      React.createElement(
        'div',
        {
          className:
            'w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400',
        },
        React.createElement(
          'span',
          { className: 'material-symbols-outlined text-[36px]' },
          'error'
        )
      ),
      React.createElement(
        'h1',
        { className: 'text-xl sm:text-2xl font-bold text-white mb-3 tracking-tight' },
        'Environment Configuration Error'
      ),
      React.createElement(
        'div',
        {
          className:
            'p-4 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-sm font-mono text-center my-4 break-words',
        },
        missingText
      ),
      React.createElement(
        'p',
        { className: 'text-xs text-slate-400 mt-4 leading-relaxed' },
        'Please check your ',
        React.createElement(
          'code',
          { className: 'text-blue-400 bg-slate-800 px-1.5 py-0.5 rounded' },
          '.env'
        ),
        ' file in the project root and restart the development server.'
      )
    )
  );
};
