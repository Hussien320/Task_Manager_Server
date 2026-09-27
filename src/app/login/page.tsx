import LoginForm from '@/components/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 text-transparent bg-clip-text">
            Welcome Back
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            Login to your StockPulse account
          </p>
        </div>

        {/* Form */}
        <LoginForm />
      </div>
    </div>
  );
}