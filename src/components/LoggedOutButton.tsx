'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import Button from '@/components/ui/Button';
import FormError from '@/components/ui/FormError';
import { api } from '@/lib/api';
import { ApiException } from '@/utils/exceptions/ApiException';

interface LoggedOutButtonProps {
  redirectTo?: string;
  className?: string;
  children?: React.ReactNode;
}

export default function LoggedOutButton({
  redirectTo = '/login',
  className = 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  children = 'Logout',
}: LoggedOutButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setError(null);
    setIsLoading(true);

    try {
      await api.auth.logout();
      router.push(redirectTo);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Failed to log out. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        onClick={handleLogout}
        isLoading={isLoading}
        className={className}
      >
        {isLoading ? 'Logging out...' : children}
      </Button>

      {error && (
        <div className="mt-3">
          <FormError message={error} />
        </div>
      )}
    </>
  );
}
