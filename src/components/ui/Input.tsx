import type { LucideIcon } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon: LucideIcon;
  togglePassword?: boolean;   // ← new prop
}

function Input({ icon: Icon, togglePassword = false, className = '', type, ...props }: InputProps) {
  const [showPassword, setShowPassword] = useState(false);

  // ✅ Determine the actual type
  const inputType = togglePassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="relative mb-6">
      {/* Left icon */}
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <Icon className="size-5 text-gray-500" />
      </div>

      {/* Input */}
      <input
        {...props}
        type={inputType}
        className={`w-full pl-10 ${togglePassword ? 'pr-10' : 'pr-3'} py-2 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400 transition duration-200 ${className}`}
      />

      {/* ✅ Eye toggle (only for password) */}
      {togglePassword && (
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-200"
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="size-5" />
          ) : (
            <Eye className="size-5" />
          )}
        </button>
      )}
    </div>
  );
}

export default Input;