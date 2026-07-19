'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import Logo from '@/components/Logo';
import { AlertCircle, Eye, EyeOff, User, Lock, Check } from 'lucide-react';
import PixelIcon from '@/components/PixelIcon';
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
  const { currentTheme, isDarkMode } = usePokemonTheme();
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
    <main
      className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden transition-colors duration-500"
      style={{ backgroundColor: isDarkMode ? 'transparent' : currentTheme.colors.background }}
    >
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 animated-gradient-bg-slow opacity-50" />

      {/* Floating Pixel Cat Decorations */}
      <motion.div
        className="absolute top-10 left-10 opacity-60 pointer-events-none select-none"
        style={{ color: '#ff69b4' }}
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <PixelIcon name="cat" size={48} />
      </motion.div>
      <motion.div
        className="absolute bottom-10 right-10 opacity-60 pointer-events-none select-none"
        style={{ color: '#feca57' }}
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      >
        <PixelIcon name="catHappy" size={48} />
      </motion.div>
      <motion.div
        className="absolute top-20 right-20 opacity-40 pointer-events-none select-none"
        style={{ color: '#ff69b4' }}
        animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <PixelIcon name="paw" size={36} />
      </motion.div>
      <motion.div
        className="absolute bottom-20 left-20 opacity-40 pointer-events-none select-none hidden sm:block"
        style={{ color: '#a855f7' }}
        animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <PixelIcon name="heart" size={32} />
      </motion.div>

      <motion.div
        className={`w-full max-w-md bg-white dark:bg-gray-900 border-4 border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.3)] p-6 sm:p-8 relative z-10 ${shakeError ? 'animate-shake' : ''}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-center mb-4">
          <Logo size="lg" />
        </div>
        <h1
          className="text-3xl sm:text-4xl font-bold mb-6 text-center drop-shadow-[2px_2px_0_#000] transition-colors"
          style={{ color: currentTheme.colors.primary }}
        >
          {t('welcomeBack')}
        </h1>

        {/* Error Message with Animation */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border-2 border-red-500 text-red-500 font-bold text-sm text-center shadow-[2px_2px_0px_0px_rgba(239,68,68,1)] flex items-center justify-center gap-2 rounded-lg"
            >
              <AlertCircle size={20} className="shrink-0" /> {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Username Field */}
          <div className="form-group">
            <label className="form-label text-black dark:text-white">
              Username or email
            </label>
            <div className={`relative transition-all duration-200 ${focusedField === 'username' ? 'scale-[1.02]' : ''}`}>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <User size={20} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                className="w-full bg-white dark:bg-gray-800 border-4 border-black dark:border-gray-600 p-3 pl-10 text-black dark:text-white focus:outline-none focus:border-purple-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] font-mono transition-all duration-200"
                required
                disabled={isLoading}
                autoComplete="username"
                placeholder="Enter your username or email"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label className="form-label text-black dark:text-white">
              {t('password')}
            </label>
            <div className={`relative transition-all duration-200 ${focusedField === 'password' ? 'scale-[1.02]' : ''}`}>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock size={20} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                className="w-full bg-white dark:bg-gray-800 border-4 border-black dark:border-gray-600 p-3 pl-10 pr-12 text-black dark:text-white focus:outline-none focus:border-purple-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] font-mono transition-all duration-200"
                required
                disabled={isLoading}
                autoComplete="current-password"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors touch-target p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer group">
              <span
                className={`w-5 h-5 border-2 border-black dark:border-white flex items-center justify-center transition-all ${rememberMe ? 'bg-purple-500 border-purple-500' : 'bg-white dark:bg-gray-800'}`}
                onClick={() => setRememberMe(!rememberMe)}
              >
                {rememberMe && <Check size={14} className="text-white" />}
              </span>
              <span className="text-sm font-bold text-black dark:text-white group-hover:text-purple-500 transition-colors">
                Remember me
              </span>
            </label>
            <Link
              href="/forgot-password"
              className="text-sm font-bold hover:underline decoration-2 underline-offset-2 transition-colors"
              style={{ color: currentTheme.colors.secondary }}
            >
              {t('forgotPassword')}
            </Link>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: isLoading ? 1 : 1.02 }}
            whileTap={{ scale: isLoading ? 1 : 0.98 }}
            className="w-full text-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all font-bold py-3 text-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-target"
            style={{ backgroundColor: currentTheme.colors.primary }}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Lock size={20} />
                {t('signIn')}
              </>
            )}
          </motion.button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-gray-200 dark:border-gray-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white dark:bg-gray-900 text-gray-500 font-bold">or</span>
          </div>
        </div>

        {/* Sign Up Link */}
        <p className="text-center text-sm font-bold text-black dark:text-white">
          {t('dontHaveAccount')}{' '}
          <Link
            href="/register"
            className="hover:underline decoration-2 underline-offset-2 transition-colors"
            style={{ color: currentTheme.colors.primary }}
          >
            {t('signUp')}
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
