'use client';

import { Shield, Lock, Eye, UserCheck, Database } from 'lucide-react';

export function PrivacyWindow() {
  return (
    <div className="h-full overflow-y-auto p-4 text-sm">
      <div className="space-y-5">
        <p className="text-xs opacity-60">Last updated: {new Date().toLocaleDateString()}</p>

        <section>
          <h2 className="text-base font-black mb-2 flex items-center gap-2">
            <Lock size={18} />
            Your Privacy Matters
          </h2>
          <p className="opacity-80 leading-relaxed">
            At CinePurr, we take your privacy seriously. This policy explains how we collect, use, and protect your information.
          </p>
        </section>

        <section>
          <h2 className="text-base font-black mb-2 flex items-center gap-2">
            <Database size={18} />
            Information We Collect
          </h2>
          <ul className="space-y-2 opacity-80">
            <li className="flex items-start gap-2">
              <span className="text-pink-500 font-black">•</span>
              <span><strong>Account Info:</strong> Username, email, profile picture</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pink-500 font-black">•</span>
              <span><strong>Usage Data:</strong> Videos watched, rooms created</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pink-500 font-black">•</span>
              <span><strong>Chat Messages:</strong> Stored temporarily for sessions</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-black mb-2 flex items-center gap-2">
            <Eye size={18} />
            How We Use Your Info
          </h2>
          <ul className="space-y-1 opacity-80 text-xs">
            <li>• Provide and improve our services</li>
            <li>• Personalize your experience</li>
            <li>• Communicate about your account</li>
            <li>• Ensure platform security</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-black mb-2 flex items-center gap-2">
            <Shield size={18} />
            Data Security
          </h2>
          <p className="opacity-80 leading-relaxed text-xs">
            We implement industry-standard security measures to protect your data. However, no method of transmission 
            over the internet is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-base font-black mb-2 flex items-center gap-2">
            <UserCheck size={18} />
            Your Rights
          </h2>
          <ul className="space-y-1 opacity-80 text-xs">
            <li>• Access your personal data</li>
            <li>• Request deletion of your account</li>
            <li>• Opt-out of certain data collection</li>
            <li>• Update your account information</li>
          </ul>
        </section>

        <div className="pt-3 border-t border-black/10 dark:border-white/10">
          <h3 className="font-black text-sm mb-2">Terms of Service</h3>
          <p className="opacity-80 text-xs leading-relaxed">
            By using CinePurr, you agree to use the platform responsibly, respect other users, and not share 
            copyrighted content without permission. We reserve the right to terminate accounts that violate these terms.
          </p>
        </div>
      </div>
    </div>
  );
}
