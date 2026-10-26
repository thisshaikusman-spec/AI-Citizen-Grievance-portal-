# Citizen Grievance Portal Frontend

A modern, responsive civic grievance and election oversight web application built with **React 19**, **Vite**, and **Tailwind CSS**. Connects directly to the real FastAPI backend for AI-assisted grievance triage and status management, and uses Supabase for email OTP verification.

## Prerequisites

- **Node.js**: v18.x or higher
- **Backend**: FastAPI backend running (default: `http://127.0.0.1:8000/api/v1`)
- **Supabase Project**: With Email authentication provider enabled

## Quick Setup

### 1. Environment Configuration

Copy the example environment template:

```bash
cp .env.example .env
```

Edit `.env` and fill in your variables:

```env
# Backend API Base URL
VITE_API_URL=http://127.0.0.1:8000/api/v1

# Supabase Project URL (from Supabase Dashboard > Project Settings > API)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co

# Supabase Publishable / Anon Key (from Supabase Dashboard > Project Settings > API)
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

The portal will be accessible at:  
👉 **http://localhost:5173**

### 4. Build for Production

```bash
npm run build
npm run preview
```

## Features

- **Email OTP Verification**: Real email OTP code delivery and verification via Supabase.
- **Backend JWT Sessions**: Frontend authentication governed by backend Bearer access tokens.
- **AI-Powered Intake**: Citizens file complaints with natural language and receive immediate triage (category, department, priority, and confidence).
- **Public & Authenticated Tracking**: Search any `GRV-YYYY-NNNNNN` tracking number publicly, with full audit trail and case notes available to authenticated complaint owners.
- **Admin Control Console**: Central dashboard metrics, filtered complaint master table, "Needs Review" quick filter, officer assignment, and status transitions with confirmation guards.
