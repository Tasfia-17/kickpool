'use client';

import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { Shield, Lock, Eye, Database, UserCheck, Mail } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function PrivacyPage() {
  const { isDarkMode, currentTheme } = usePokemonTheme();

  const sections = [
    {
      icon: Eye,
      title: 'Information We Collect',
      color: 'text-blue-500',
      items: [
        { label: 'Account Information', desc: 'Username, email address, and profile picture when you create an account.' },
        { label: 'Usage Data', desc: 'Videos watched, rooms created, and interactions to improve your experience.' },
        { label: 'Chat Messages', desc: 'Messages sent in rooms are stored temporarily for the session.' },
      ]
    },
    {
      icon: Database,
      title: 'How We Use Your Information',
      color: 'text-purple-500',
      items: [
        { label: 'Service Improvement', desc: 'Provide and improve our services' },
        { label: 'Personalization', desc: 'Personalize your experience' },
        { label: 'Communication', desc: 'Communicate with you about your account' },
        { label: 'Security', desc: 'Ensure platform security and prevent abuse' },
      ]
    },
    {
      icon: Shield,
      title: 'Third-Party Advertising & Cookies',
      color: 'text-yellow-500',
      items: [
        { label: 'Google AdSense', desc: 'We use Google AdSense to serve advertisements. Google may use cookies and web beacons to collect data about your visits to this and other websites to provide relevant ads.' },
        { label: 'Advertising Cookies', desc: 'Third-party vendors, including Google, use cookies to serve ads based on your prior visits to our website and other sites on the internet.' },
        { label: 'Opt-Out', desc: 'You may opt out of personalized advertising by visiting Google\'s Ads Settings at https://www.google.com/settings/ads or by visiting aboutads.info.' },
        { label: 'Cookie Control', desc: 'You can disable cookies in your browser settings. Note that disabling cookies may affect the functionality of some features.' },
      ]
    },
    {
      icon: UserCheck,
      title: 'Your Rights',
      color: 'text-green-500',
      items: [
        { label: 'Access', desc: 'Access your personal data anytime' },
        { label: 'Deletion', desc: 'Request deletion of your account and data' },
        { label: 'Opt-out', desc: 'Opt-out of certain data collection' },
        { label: 'Update', desc: 'Update your account information' },
      ]
    },
  ];

  return (
    <div className="min-h-screen p-4 sm:p-8">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div 
        className="max-w-4xl mx-auto"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Hero */}
        <motion.div variants={item} className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-6 shadow-lg">
            <Shield size={40} className="text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-4 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </motion.div>

        {/* Intro */}
        <motion.div variants={item} className="mb-12">
          <div className={`p-6 rounded-2xl border-2 ${isDarkMode ? 'border-white/20 bg-white/5' : 'border-black/10 bg-black/5'}`}>
            <div className="flex items-center gap-3 mb-3">
              <Lock size={24} className="text-pink-500" />
              <h2 className="text-xl font-bold">Your Privacy Matters</h2>
            </div>
            <p className={`leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              At CinePurr, we take your privacy seriously. This policy explains how we collect, use, and protect your information.
            </p>
          </div>
        </motion.div>

        {/* Sections */}
        {sections.map((section, i) => (
          <motion.section 
            key={section.title}
            variants={item}
            className="mb-8"
          >
            <div className={`p-6 rounded-2xl border-2 ${isDarkMode ? 'border-white/20 bg-white/5' : 'border-black/10 bg-black/5'}`}>
              <div className="flex items-center gap-3 mb-4">
                <section.icon size={24} className={section.color} />
                <h2 className="text-xl font-bold">{section.title}</h2>
              </div>
              <div className="grid gap-3">
                {section.items.map((item, j) => (
                  <div 
                    key={j}
                    className={`p-3 rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}
                  >
                    <span className="font-bold">{item.label}:</span>{' '}
                    <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>
        ))}

        {/* Security Section */}
        <motion.section variants={item} className="mb-8">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-cyan-500/20 border-2 border-green-500/30">
            <div className="flex items-center gap-3 mb-3">
              <Lock size={24} className="text-green-500" />
              <h2 className="text-xl font-bold">Data Security</h2>
            </div>
            <p className={`leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              We implement industry-standard security measures to protect your data. However, no method of transmission 
              over the internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </div>
        </motion.section>

        {/* Contact */}
        <motion.section variants={item} className="mb-8">
          <div className={`p-6 rounded-2xl border-2 ${isDarkMode ? 'border-white/20 bg-white/5' : 'border-black/10 bg-black/5'}`}>
            <div className="flex items-center gap-3 mb-3">
              <Mail size={24} className="text-pink-500" />
              <h2 className="text-xl font-bold">Contact Us</h2>
            </div>
            <p className={`leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              If you have questions about this privacy policy, please{' '}
              <Link href="/contact" className="text-pink-500 hover:underline font-bold">contact us</Link>.
            </p>
          </div>
        </motion.section>

        {/* Back Button */}
        <motion.div variants={item} className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all hover:-translate-y-1"
          >
            ← Back to Home
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

