'use client';

import { useState, type FormEvent } from 'react';
import { KeyRound, Lock, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import { ApiException } from '@/utils/exceptions/ApiException';
import Button from './ui/Button';
import FormError from './ui/FormError';
import Input from './ui/Input';

interface ResetPasswordFormProps {
  initialEmail?: string;
  initialToken?: string;
}

export default function ResetPasswordForm({
  initialEmail = '',
  initialToken = '',
}: ResetPasswordFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.auth.verifyReset({ email, token, password });
      setSuccessMessage(response.message);
    } catch (err) {
      setError(
        err instanceof ApiException ? err.message : 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  }

  if (successMessage) {
    return (
      <div
        role="status"
        className="space-y-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center"
      >
        <p className="text-sm text-emerald-300">{successMessage}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      <label htmlFor="reset-email" className="mb-2 block text-sm text-gray-300">
        Email address
      </label>
      <Input
        id="reset-email"
        icon={Mail}
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        disabled={loading}
        required
      />

      <label htmlFor="reset-token" className="mb-2 block text-sm text-gray-300">
        Reset code
      </label>
      <Input
        id="reset-token"
        icon={KeyRound}
        type="text"
        placeholder="Enter the code from your email"
        autoComplete="one-time-code"
        inputMode="numeric"
        value={token}
        onChange={(event) => setToken(event.target.value)}
        disabled={loading}
        required
      />

      <label htmlFor="new-password" className="mb-2 block text-sm text-gray-300">
        New password
      </label>
      <Input
        id="new-password"
        icon={Lock}
        type="password"
        placeholder="At least 6 characters"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        disabled={loading}
        minLength={6}
        required
        togglePassword
      />

      <label htmlFor="confirm-password" className="mb-2 block text-sm text-gray-300">
        Confirm new password
      </label>
      <Input
        id="confirm-password"
        icon={Lock}
        type="password"
        placeholder="Re-enter your new password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        disabled={loading}
        minLength={6}
        required
        togglePassword
      />

      {error && <FormError message={error} />}

      <Button type="submit" fullWidth isLoading={loading}>
        {loading ? 'Updating password...' : 'Reset password'}
      </Button>
    </form>
  );
}