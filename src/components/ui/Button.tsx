import type { ButtonHTMLAttributes } from 'react';
import { Loader } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  fullWidth?: boolean;
}

function Button({
  isLoading = false,
  fullWidth = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center justify-center gap-2
        py-3 px-4
        bg-gradient-to-r from-blue-600 to-cyan-500
        text-white font-semibold
        rounded-lg shadow-lg
        transition duration-200
        hover:from-blue-700 hover:to-cyan-600
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {isLoading && <Loader className="size-5 animate-spin" />}
      {children}
    </button>
  );
}

export default Button;