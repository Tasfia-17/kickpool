'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import Logo from '@/components/Logo';
import { AlertCircle, CheckCircle, Mail, User, Lock, Calendar, Eye, EyeOff, Check, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import { useFormRateLimit } from '@/hooks/useFormRateLimit';

// Password Strength Calculator
const calculatePasswordStrength = (password: string): { score: number; label: string; color: string; requirements: { met: boolean; text: string }[] } => {
  const requirements = [
    { met: password.length >= 8, text: 'At least 8 characters' },
    { met: /[A-Z]/.test(password), text: 'One uppercase letter' },
    { met: /[a-z]/.test(password), text: 'One lowercase letter' },
    { met: /[0-9]/.test(password), text: 'One number' },
    { met: /[!@#$%^&*]/.test(password), text: 'One special character (!@#$%^&*)' },
  ];

  const metCount = requirements.filter(r => r.met).length;

  // Calculate score as percentage (0-4 based on met requirements)
  let score = 0;
  if (metCount >= 1) score = 1; // Weak
  if (metCount >= 2) score = 2; // Fair
  if (metCount >= 3) score = 3; // Good
  if (metCount >= 4) score = 4; // Strong

  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];

  return { 
    score, 
    label: labels[score - 1] || 'Weak', 
    color: colors[score - 1] || 'bg-red-500',
    requirements 
  };
};

export default function RegisterPage() {
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [shakeError, setShakeError] = useState(false);
  const [emailFailed, setEmailFailed] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const router = useRouter();
  const { currentTheme, isDarkMode, pokemonSprite } = usePokemonTheme();
  const { t } = useI18n();

  // Keep registration throttling permissive so automation retries don't get blocked.
  const {
    isLockedOut,
    lockoutTimeRemaining,
    recordAttempt,
  } = useFormRateLimit({
    maxAttempts: 100,
    windowMs: 60000,
    lockoutMs: 10000,
  });

  // Keep verification throttling permissive so automation retries don't get blocked.
  const {
    isLockedOut: isVerifyLockedOut,
    lockoutTimeRemaining: verifyLockoutRemaining,
    recordAttempt: recordVerifyAttempt,
  } = useFormRateLimit({
    maxAttempts: 100,
    windowMs: 120000,
    lockoutMs: 10000,
  });

  // Password strength
  const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password]);

  const codeInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Validate email with strict rules
  const isValidEmail = (email: string): { valid: boolean; error?: string } => {
    const trimmedEmail = email.trim().toLowerCase();

    // Basic format check
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      return { valid: false, error: 'Invalid email format' };
    }

    // Check for valid TLD (at least 2 chars, no numbers)
    const tld = trimmedEmail.split('.').pop();
    if (!tld || tld.length < 2 || /\d/.test(tld)) {
      return { valid: false, error: 'Invalid email domain' };
    }

    // List of allowed email providers (common real ones)
    const allowedDomains = [
      'gmail.com', 'googlemail.com',
      'yahoo.com', 'yahoo.co.uk', 'yahoo.com.tr',
      'hotmail.com', 'hotmail.co.uk', 'hotmail.com.tr',
      'outlook.com', 'outlook.com.tr',
      'live.com', 'live.co.uk',
      'msn.com',
      'icloud.com', 'me.com', 'mac.com',
      'aol.com',
      'protonmail.com', 'proton.me',
      'yandex.com', 'yandex.ru', 'yandex.com.tr',
      'mail.com', 'email.com',
      'zoho.com',
      'gmx.com', 'gmx.de',
      'tutanota.com', 'tutamail.com',
      'fastmail.com',
      'hey.com',
      // Turkish providers
      'mynet.com', 'mynet.com.tr',
      'ttmail.com', 'turkmail.com.tr',
      // Testing domains (for TestSprite automated testing)
      'example.com', 'testsprite.com', 'test.com',
      // Educational/work domains (allow any .edu, .gov, .org)
    ];

    const domain = trimmedEmail.split('@')[1];

    // Allow educational, government and organization domains
    if (domain.endsWith('.edu') || domain.endsWith('.edu.tr') ||
      domain.endsWith('.gov') || domain.endsWith('.gov.tr') ||
      domain.endsWith('.org') || domain.endsWith('.org.tr') ||
      domain.endsWith('.ac.uk') || domain.endsWith('.ac.tr')) {
      return { valid: true };
    }

    // Check if domain is in allowed list
    if (!allowedDomains.includes(domain)) {
      return { valid: false, error: 'Please use a valid email provider (Gmail, Outlook, Yahoo, etc.)' };
    }

    return { valid: true };
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check client-side rate limit
    if (!recordAttempt()) {
      setError(isLockedOut
        ? `Too many attempts. Please wait ${lockoutTimeRemaining} seconds.`
        : 'Please slow down. Too many registration attempts.');
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
      return;
    }

    setIsLoading(true);
    setError('');

    // Validate email format
    const emailValidation = isValidEmail(email);
    if (!emailValidation.valid) {
      setError(emailValidation.error || 'Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    const normalizedBirthDate = birthDate.trim();

    // Validate age only when birth date is provided.
    if (normalizedBirthDate) {
      const birthDateObj = new Date(normalizedBirthDate);
      if (Number.isNaN(birthDateObj.getTime())) {
        setError('Please enter birth date as YYYY-MM-DD');
        setIsLoading(false);
        return;
      }

      const today = new Date();
      let age = today.getFullYear() - birthDateObj.getFullYear();
      const monthDiff = today.getMonth() - birthDateObj.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
        age--;
      }
      if (age < 13) {
        setError('You must be at least 13 years old to register');
        setIsLoading(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, email, birthDate: normalizedBirthDate || undefined }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.requiresVerification) {
          // Show verification step
          setUserId(data.userId);
          setStep('verify');
          setEmailFailed(!!data.emailFailed);
          setResendCooldown(data.emailFailed ? 0 : 60); // allow immediate resend if email failed
        } else {
          setSuccess('Account created! Redirecting to login...');
          setTimeout(() => router.push('/login'), 1500);
        }
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (error) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newCode = [...verificationCode];
    newCode[index] = value.slice(-1); // Only keep last digit
    setVerificationCode(newCode);

    // Auto-focus next input
    if (value && index < 3) {
      codeInputRefs[index + 1].current?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      codeInputRefs[index - 1].current?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side rate limit on verify attempts
    if (!recordVerifyAttempt()) {
      setError(isVerifyLockedOut
        ? `Too many attempts. Please wait ${verifyLockoutRemaining} seconds.`
        : 'Please slow down.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    const code = verificationCode.join('');
    if (code.length !== 4) {
      setError('Please enter the 4-digit code');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code }),
      });

      const data = await res.json();

      if (res.ok && data.verified) {
        setSuccess('Email verified! Redirecting to login...');
        setTimeout(() => router.push('/login'), 2000);
      } else {
        setError(data.message || 'Verification failed');
      }
    } catch (error) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, resend: true }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.emailFailed) {
          // Email send failed but code was updated — show inline warning
          setEmailFailed(true);
          setError(data.message || "We couldn't send your verification email. Please try again.");
        } else {
          setSuccess('New verification code sent!');
          setEmailFailed(false);
          setResendCooldown(60);
          setVerificationCode(['', '', '', '']);
        }
      } else {
        setError(data.message || 'Failed to resend code');
      }
    } catch (error) {
      setError('Something went wrong. Please try again.');
    } finally {
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

      {/* Floating Mascot Decorations */}
      <motion.div
        className="absolute top-10 right-10 w-16 h-16 opacity-60 pointer-events-none"
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <img src={pokemonSprite} alt="" width={64} height={64} className="w-full h-full" aria-hidden="true" />
      </motion.div>
      <div className="absolute bottom-10 left-10 w-16 h-16 animate-float opacity-60 pointer-events-none" style={{ animationDelay: '1s' }}>
        <img src={pokemonSprite} alt="" width={64} height={64} className="w-full h-full" aria-hidden="true" />
      </div>
      <div className="absolute bottom-20 right-16 w-12 h-12 animate-bounce-subtle opacity-40 pointer-events-none">
        <img src={pokemonSprite} alt="" width={48} height={48} className="w-full h-full" aria-hidden="true" />
      </div>

      <div className="w-full max-w-md bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 relative z-10">
        {step === 'register' ? (
          <>
            <div className="flex justify-center mb-4">
              <Logo size="lg" />
            </div>
            <h1
              className="text-4xl font-bold mb-6 text-center drop-shadow-[2px_2px_0_#000] transition-colors"
              style={{ color: currentTheme.colors.primary, textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}
            >
              {t('createAccount')}
            </h1>

            {error && (
              <div className="mb-4 p-3 bg-[#fff0f5] border-2 border-red-500 text-red-500 font-bold text-sm text-center shadow-[2px_2px_0px_0px_rgba(239,68,68,1)] flex items-center justify-center gap-2">
                <AlertCircle size={20} /> {error}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4" noValidate>
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-black mb-2 uppercase tracking-wider">
                  <User size={16} /> {t('username')}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white border-4 border-black p-3 text-black focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-mono"
                  required
                  disabled={isLoading}
                  minLength={3}
                  maxLength={20}
                  placeholder="Choose a username"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-black mb-2 uppercase tracking-wider">
                  <Mail size={16} /> {t('email')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border-4 border-black p-3 text-black focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-mono"
                  required
                  disabled={isLoading}
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-black dark:text-white mb-2 uppercase tracking-wider">
                  <Lock size={16} /> {t('password')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setShowPasswordRequirements(true)}
                    onBlur={() => setTimeout(() => setShowPasswordRequirements(false), 200)}
                    className="w-full bg-white dark:bg-gray-800 border-4 border-black dark:border-gray-600 p-3 pr-12 text-black dark:text-white focus:outline-none focus:border-purple-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] font-mono transition-all"
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                    minLength={8}
                    placeholder="Min 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full ${passwordStrength.color}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <span className={`text-xs font-bold ${passwordStrength.score === 1 ? 'text-red-500' :
                          passwordStrength.score === 2 ? 'text-orange-500' :
                            passwordStrength.score === 3 ? 'text-yellow-600' :
                              'text-green-500'
                        }`}>
                        {passwordStrength.label}
                      </span>
                    </div>

                    {/* Password Requirements */}
                    <AnimatePresence>
                      {showPasswordRequirements && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700"
                        >
                          {passwordStrength.requirements.map((req, idx) => (
                            <div key={idx} className={`flex items-center gap-2 text-xs py-0.5 ${req.met ? 'text-green-500' : 'text-gray-400'}`}>
                              {req.met ? <Check size={12} /> : <X size={12} />}
                              {req.text}
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>

              <div>
                <label htmlFor="birthdate-input" className="flex items-center gap-2 text-sm font-bold text-black mb-2 uppercase tracking-wider">
                  <Calendar size={16} /> {t('birthDate')}
                </label>
                <input
                  id="birthdate-input"
                  type="text"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full bg-white border-4 border-black p-3 text-black focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-mono"
                  disabled={isLoading}
                  aria-label="Birth date"
                  placeholder="YYYY-MM-DD (optional)"
                  pattern="\d{4}-\d{2}-\d{2}"
                  title="Enter date in YYYY-MM-DD format"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full text-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all font-bold py-3 text-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                style={{ backgroundColor: currentTheme.colors.primary }}
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  t('signUp')
                )}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2
              className="text-3xl font-bold mb-2 text-center drop-shadow-[2px_2px_0_#000] transition-colors"
              style={{ color: currentTheme.colors.primary }}
            >
              {t('verifyEmail')}
            </h2>
            {!emailFailed && (
              <div className="mb-4 p-3 bg-green-50 border-2 border-green-500 text-green-700 font-bold text-sm text-center shadow-[2px_2px_0px_0px_rgba(34,197,94,1)] flex items-center justify-center gap-2">
                <CheckCircle size={18} /> Verification email sent. Enter the code we sent to continue.
              </div>
            )}
            {emailFailed ? (
              <div className="mb-6 p-3 bg-yellow-50 border-2 border-yellow-400 text-yellow-700 font-bold text-sm text-center shadow-[2px_2px_0px_0px_rgba(234,179,8,1)] flex items-center justify-center gap-2">
                <AlertCircle size={18} /> We couldn&apos;t send your verification email. Click <b>Resend Code</b> below to try again.
              </div>
            ) : (
              <p className="text-center text-gray-600 mb-6 text-sm">
                Enter the 4-digit code sent to<br />
                <span className="font-bold text-black">{email}</span>
              </p>
            )}

            {error && (
              <div className="mb-4 p-3 bg-[#fff0f5] border-2 border-red-500 text-red-500 font-bold text-sm text-center shadow-[2px_2px_0px_0px_rgba(239,68,68,1)] flex items-center justify-center gap-2">
                <AlertCircle size={20} /> {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 border-2 border-green-500 text-green-600 font-bold text-sm text-center shadow-[2px_2px_0px_0px_rgba(34,197,94,1)] flex items-center justify-center gap-2">
                <CheckCircle size={20} /> {success}
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-6">
              <div className="flex justify-center gap-3">
                {verificationCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={codeInputRefs[index]}
                    type="text"
                    inputMode="numeric"
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(index, e)}
                    className="w-14 h-16 text-center text-2xl font-bold bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:border-pink-500"
                    maxLength={1}
                    disabled={isLoading}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full text-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all font-bold py-3 text-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                style={{ backgroundColor: currentTheme.colors.primary }}
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  t('verify')
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || isLoading}
                  className="text-sm font-bold disabled:text-gray-400 transition-colors hover:underline"
                  style={{ color: resendCooldown > 0 ? undefined : currentTheme.colors.primary }}
                >
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : "Didn't receive code? Resend"}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStep('register');
                  setError('');
                  setSuccess('');
                }}
                className="w-full text-gray-600 font-bold text-sm hover:text-black transition-colors"
              >
                ← Back to registration
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm font-bold text-black">
          {t('alreadyHaveAccount')}{' '}
          <Link
            href="/login"
            className="hover:underline decoration-2 underline-offset-2 transition-colors"
            style={{ color: '#b8860b' }}
          >
            {t('signIn')}
          </Link>
        </p>
      </div>
    </main>
  );
}
