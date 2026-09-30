'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import LoginForm from '@/components/LoginForm';

function MessageBanner() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message');

  if (!message) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
      {message}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 text-transparent bg-clip-text">
            Welcome Back
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            Login to your StockPulse account
          </p>
        </div>

        <Suspense fallback={null}>
          <MessageBanner />
        </Suspense>

        <LoginForm />

        <p className="text-center text-sm text-gray-400 mt-6">
          <Link href="/forgot-password" className="text-cyan-400 hover:text-cyan-300">
            Forgot your password?
          </Link>
        </p>
      </div>
    </div>
  );
}