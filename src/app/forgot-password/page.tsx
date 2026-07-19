'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import Logo from '@/components/Logo';
import { AlertCircle, CheckCircle, Mail } from 'lucide-react';
import PixelIcon from '@/components/PixelIcon';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { currentTheme, isDarkMode } = usePokemonTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Something went wrong');
      } else {
        setEmailSent(true);
        setSuccess(data.message);
      }
    } catch (err) {
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
      {/* Decorative Elements */}
      <div className="absolute top-10 left-10 w-16 h-16 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 blur-xl animate-pulse" />
      <div className="absolute bottom-10 right-10 w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-pink-500/20 blur-xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="w-full max-w-md bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 relative z-10">
        <div className="flex justify-center mb-4">
          <Logo size="lg" />
        </div>
        <h2 
          className="text-3xl font-bold mb-2 text-center drop-shadow-[2px_2px_0_#000] transition-colors"
          style={{ color: currentTheme.colors.primary }}
        >
          Forgot Password?
        </h2>
        <p className="text-center text-sm text-gray-600 mb-6">
          {emailSent 
            ? 'Check your email for a password reset link.' 
            : 'Enter your email and we\'ll send you a reset link.'}
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-[#fff0f5] border-2 border-red-500 text-red-500 font-bold text-sm text-center shadow-[2px_2px_0px_0px_rgba(239,68,68,1)] flex items-center justify-center gap-2">
            <AlertCircle size={20} /> {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-[#f0fff0] border-2 border-green-500 text-green-600 font-bold text-sm text-center shadow-[2px_2px_0px_0px_rgba(34,197,94,1)] flex items-center justify-center gap-2">
            <CheckCircle size={20} /> {success}
          </div>
        )}

        {emailSent ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center" style={{ color: '#ff69b4' }}><Mail size={64} /></div>
            <p className="text-gray-600">
              If an account with <span className="font-bold text-black">{email}</span> exists, 
              you will receive an email with instructions to reset your password.
            </p>
            <p className="text-sm text-gray-500">
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <button
              onClick={() => {
                setEmailSent(false);
                setSuccess('');
              }}
              className="w-full text-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all font-bold py-3 text-lg"
              style={{ backgroundColor: currentTheme.colors.primary }}
            >
              Try Again
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-black mb-2 uppercase tracking-wider">
                <Mail size={16} /> Email
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
            <button
              type="submit"
              disabled={isLoading}
              className="w-full text-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all font-bold py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ backgroundColor: currentTheme.colors.primary }}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Send Reset Link 📧</>
              )}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm font-bold text-black">
          Remember your password?{' '}
          <Link 
            href="/login" 
            className="hover:underline decoration-2 underline-offset-2 transition-colors"
            style={{ color: currentTheme.colors.primary }}
          >
            Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}
