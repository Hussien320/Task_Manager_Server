import Link from 'next/link';
import ResetPasswordForm from '@/components/ResetPasswordForm';

interface ResetPasswordPageProps {
  searchParams: Promise<{
    email?: string | string[];
    token?: string | string[];
  }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const email = typeof params.email === 'string' ? params.email : '';
  const token = typeof params.token === 'string' ? params.token : '';

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-900 px-4 py-10">
      <div className="w-full max-w-md">
        <header className="mb-8 text-center">
          <h1 className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-3xl font-bold text-transparent">
            Reset password
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Enter the code sent to your email and choose a new password.
          </p>
        </header>

        <ResetPasswordForm initialEmail={email} initialToken={token} />

        <p className="mt-6 text-center text-sm text-gray-400">
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300">
            Back to login
          </Link>
        </p>
      </div>
    </main>
  );
}