'use client'

import { useEffect } from 'react'
import { RefreshCw, Home, AlertTriangle, Cat } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global Error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Animated Cat Icon */}
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center animate-pulse">
            <Cat className="w-12 h-12 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Oops! Something went wrong 😿</h1>
          <p className="text-gray-400">
            Our cats got tangled in the cables again...
          </p>
        </div>

        {/* Error Details (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="bg-black/30 rounded-xl p-4 text-left border border-white/10">
            <summary className="cursor-pointer font-medium text-pink-400 mb-2">
              🔍 Technical Details
            </summary>
            <div className="mt-2 p-3 bg-black/50 rounded-lg overflow-auto max-h-40">
              <p className="text-red-400 font-mono text-xs break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-gray-500 font-mono text-xs mt-2">
                  Digest: {error.digest}
                </p>
              )}
            </div>
          </details>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl font-bold hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-pink-500/25"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>
          <a
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 backdrop-blur rounded-xl font-bold hover:bg-white/20 transition-all border border-white/20"
          >
            <Home className="w-5 h-5" />
            Go Home
          </a>
        </div>

        {/* Fun Message */}
        <p className="text-sm text-gray-500">
          🐱 Pro tip: Have you tried turning it off and on again?
        </p>
      </div>
    </div>
  )
}
