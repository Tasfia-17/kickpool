'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Eye, EyeOff, User, Lock, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import { useFormRateLimit } from '@/hooks/useFormRateLimit';

function getRememberedIdentifier() {
  if (typeof window === 'undefined') {
    return '';
  }

  return localStorage.getItem('rememberedUsername') ?? '';
}

export default function LoginPage() {
  const [username, setUsername] = useState(() => getRememberedIdentifier());
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => getRememberedIdentifier().length > 0);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shakeError, setShakeError] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useI18n();

  // Keep client-side throttling permissive so automation retries don't get blocked.
  const {
    canSubmit,
    isLockedOut,
    lockoutTimeRemaining,
    recordAttempt,
  } = useFormRateLimit({
    maxAttempts: 200,
    windowMs: 60000,
    lockoutMs: 10000,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();

    // Check client-side rate limit
    if (!canSubmit || !recordAttempt()) {
      setError(isLockedOut
        ? `Too many attempts. Please wait ${lockoutTimeRemaining} seconds.`
        : 'Please slow down. Too many login attempts.');
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
      return;
    }

    setIsLoading(true);
    setError('');

    // Save or remove remembered username
    if (rememberMe) {
      localStorage.setItem('rememberedUsername', trimmedUsername);
    } else {
      localStorage.removeItem('rememberedUsername');
    }

    try {
      const result = await signIn('credentials', {
        username: trimmedUsername,
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result?.error?.toLowerCase().includes('verify your email')) {
          setError('Please verify your email before logging in. Check your inbox for the verification code.');
        } else {
          setError(t('invalidCredentials'));
        }
        setShakeError(true);
        setTimeout(() => setShakeError(false), 500);
        setIsLoading(false);
      } else if (result?.ok) {
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
          const redirectUrl = sessionStorage.getItem('redirect_url') || '/';
          sessionStorage.removeItem('redirect_url');

          if (redirectUrl.startsWith('http')) {
            window.location.href = redirectUrl;
          } else {
            router.push(redirectUrl);
            setTimeout(() => {
              if (window.location.pathname === '/login') {
                window.location.href = redirectUrl;
              }
            }, 500);
          }
        } catch (redirectErr) {
          console.error('Redirect error:', redirectErr);
          window.location.href = '/';
        }
      } else {
        setError(t('somethingWentWrong'));
        setShakeError(true);
        setTimeout(() => setShakeError(false), 500);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(t('somethingWentWrong'));
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden bg-gray-950">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/30 via-gray-950 to-gray-950 pointer-events-none" />

      {/* Floating football decorations */}
      <motion.div
        className="absolute top-10 left-10 opacity-40 pointer-events-none select-none text-5xl"
        animate={{ y: [0, -15, 0], rotate: [0, 15, -15, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >⚽</motion.div>
      <motion.div
        className="absolute bottom-10 right-10 opacity-40 pointer-events-none select-none text-5xl"
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      >🏆</motion.div>
      <motion.div
        className="absolute top-20 right-20 opacity-30 pointer-events-none select-none text-4xl"
        animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >🎯</motion.div>
      <motion.div
        className="absolute bottom-20 left-20 opacity-30 pointer-events-none select-none text-3xl hidden sm:block"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >⚡</motion.div>

      <motion.div
        className={`w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 sm:p-8 relative z-10 ${shakeError ? 'animate-shake' : ''}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-3xl">⚽</span>
            <span className="font-black text-white text-2xl">KickPool</span>
          </Link>
        </div>

        <h1 className="text-2xl font-black mb-6 text-center text-white">
          Welcome Back 👋
        </h1>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="mb-4 p-3 bg-red-950/60 border border-red-800 text-red-400 font-semibold text-sm text-center rounded-xl flex items-center justify-center gap-2"
            >
              <AlertCircle size={16} className="shrink-0" /> {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Username */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1.5">
              Username or email
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                <User size={18} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                className={`w-full bg-gray-800 border rounded-xl p-3 pl-10 text-white placeholder-gray-500 focus:outline-none transition-colors ${focusedField === 'username' ? 'border-purple-500' : 'border-gray-700'}`}
                required
                disabled={isLoading}
                autoComplete="username"
                placeholder="Enter your username or email"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1.5">
              {t('password')}
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                className={`w-full bg-gray-800 border rounded-xl p-3 pl-10 pr-12 text-white placeholder-gray-500 focus:outline-none transition-colors ${focusedField === 'password' ? 'border-purple-500' : 'border-gray-700'}`}
                required
                disabled={isLoading}
                autoComplete="current-password"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <span
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${rememberMe ? 'bg-purple-600 border-purple-600' : 'bg-gray-800 border-gray-600'}`}
                onClick={() => setRememberMe(!rememberMe)}
              >
                {rememberMe && <Check size={12} className="text-white" />}
              </span>
              <span className="text-sm text-gray-400">Remember me</span>
            </label>
            <Link href="/forgot-password" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
              {t('forgotPassword')}
            </Link>
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: isLoading ? 1 : 1.02 }}
            whileTap={{ scale: isLoading ? 1 : 0.98 }}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black py-3 rounded-xl text-base transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>{t('signIn')} ⚽</>
            )}
          </motion.button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-800" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-gray-900 text-gray-600">or</span>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500">
          {t('dontHaveAccount')}{' '}
          <Link href="/register" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">
            {t('signUp')}
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
