'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import PixelIcon from '@/components/PixelIcon';

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-pink-200">
          {/* Cat Icon */}
          <div className="text-center mb-6">
            <div className="mb-2 flex justify-center" style={{ color: '#ff69b4' }}><PixelIcon name="cat" size={64} /></div>
            <h1 className="text-2xl font-bold text-pink-600">Reset Password</h1>
            <p className="text-gray-500 text-sm mt-1">
              Enter your new password below
            </p>
          </div>

          {success ? (
            <div className="text-center">
              <div className="mb-4 flex justify-center" style={{ color: '#22c55e' }}><PixelIcon name="check" size={64} /></div>
              <h2 className="text-xl font-bold text-green-600 mb-2">
                Password Reset Successful!
              </h2>
              <p className="text-gray-600 mb-4">
                Redirecting you to login page...
              </p>
              <Link
                href="/login"
                className="text-pink-500 hover:text-pink-600 font-medium"
              >
                Click here if not redirected
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-pink-200 
                           focus:border-pink-400 focus:outline-none transition-colors
                           bg-white/50 text-gray-800 placeholder-gray-400"
                  placeholder="Enter new password"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-pink-200 
                           focus:border-pink-400 focus:outline-none transition-colors
                           bg-white/50 text-gray-800 placeholder-gray-400"
                  placeholder="Confirm new password"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-100 border border-red-300 text-red-600 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-pink-400 to-purple-400 
                         text-white font-semibold rounded-xl hover:from-pink-500 hover:to-purple-500
                         transition-all duration-200 shadow-lg hover:shadow-xl
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Resetting...
                  </span>
                ) : (
                  'Reset Password'
                )}
              </button>

              <div className="text-center text-sm text-gray-500">
                Remember your password?{' '}
                <Link href="/login" className="text-pink-500 hover:text-pink-600 font-medium">
                  Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
