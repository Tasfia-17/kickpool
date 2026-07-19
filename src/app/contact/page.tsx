'use client';

import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { Mail, MessageCircle, Github, Send, HelpCircle, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function ContactPage() {
  const { isDarkMode, currentTheme } = usePokemonTheme();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const contactMethods = [
    {
      icon: Mail,
      title: 'Email',
      desc: 'Send us an email',
      link: 'mailto:support@cinepurr.com',
      linkText: 'support@cinepurr.com',
      color: 'from-pink-500 to-rose-500',
      hoverBg: 'hover:bg-pink-500/10'
    },
    {
      icon: MessageCircle,
      title: 'Discord',
      desc: 'Join our community',
      link: 'https://discord.gg',
      linkText: 'Join Discord',
      color: 'from-indigo-500 to-purple-500',
      hoverBg: 'hover:bg-indigo-500/10'
    },
    {
      icon: Github,
      title: 'GitHub',
      desc: 'Report issues',
      link: 'https://github.com',
      linkText: 'View on GitHub',
      color: 'from-gray-600 to-gray-800',
      hoverBg: 'hover:bg-gray-500/10'
    },
  ];

  const faqs = [
    { q: 'How do I create a room?', a: 'Click "Create Room" on the home page, give it a name, and share the room link with friends!' },
    { q: 'Why isn\'t sync working for movies?', a: 'Automatic sync only works for YouTube videos. For movies/TV, everyone needs to manually press play/pause together.' },
    { q: 'How do I report a bug?', a: 'Please report bugs on our GitHub page or contact us via email.' },
    { q: 'Can I customize my profile?', a: 'Yes! VIP members can customize their name color, badges, and profile card styles.' },
  ];

  return (
    <div className="min-h-screen p-4 sm:p-8">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 left-1/4 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        className="max-w-4xl mx-auto"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Hero */}
        <motion.div variants={item} className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 mb-6 shadow-lg">
            <Send size={36} className="text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-4 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            Contact Us
          </h1>
          <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            We&apos;d love to hear from you! 💌
          </p>
        </motion.div>

        {/* Contact Methods */}
        <motion.section variants={item} className="mb-12">
          <h2 className="text-2xl font-black mb-6 text-center">Get in Touch</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {contactMethods.map((method, i) => (
              <motion.a
                key={method.title}
                href={method.link}
                target={method.link.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.98 }}
                className={`p-6 rounded-xl border-2 text-center transition-all ${isDarkMode ? 'border-white/20 bg-white/5' : 'border-black/10 bg-black/5'} ${method.hoverBg}`}
              >
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${method.color} mb-4`}>
                  <method.icon size={28} className="text-white" />
                </div>
                <h3 className="font-bold text-lg mb-1">{method.title}</h3>
                <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{method.desc}</p>
                <span className="text-sm font-bold text-pink-500">{method.linkText}</span>
              </motion.a>
            ))}
          </div>
        </motion.section>

        {/* FAQ Accordion */}
        <motion.section variants={item} className="mb-12">
          <h2 className="text-2xl font-black mb-6 text-center flex items-center justify-center gap-2">
            <HelpCircle size={24} className="text-purple-500" />
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-xl border-2 overflow-hidden ${isDarkMode ? 'border-white/20' : 'border-black/10'}`}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className={`w-full p-4 text-left font-bold flex items-center justify-between transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
                >
                  {faq.q}
                  <ChevronDown
                    size={20}
                    className={`transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                  />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`px-4 pb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Back Button */}
        <motion.div variants={item} className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-pink-500/25 transition-all hover:-translate-y-1"
          >
            ← Back to Home
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

