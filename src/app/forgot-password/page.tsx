import Link from 'next/link';
import ForgetPass from '@/components/ForgetPass';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 text-transparent bg-clip-text">
            Forgot Password
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            Enter your email and we will send you a password reset code.
          </p>
        </div>

        <ForgetPass />

        <p className="text-center text-sm text-gray-400 mt-6">
          Remember your password?{' '}
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}