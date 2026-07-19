import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminUser } from '@/lib/security';
import Link from 'next/link';
import { BarChart3, Users, Monitor, Settings, LogOut } from 'lucide-react';
import Logo from '@/components/Logo';

function AccessDeniedPanel({
  description,
  primaryHref,
  primaryLabel,
}: {
  description: string;
  primaryHref: string;
  primaryLabel: string;
}) {
  return (
    <main className="min-h-screen bg-gray-50 text-black flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 space-y-4 text-center">
        <div className="inline-flex px-3 py-1 bg-red-500 text-white border-2 border-black font-black uppercase text-xs tracking-wider">
          access denied
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tight">Insufficient permissions</h1>
        <p className="text-sm font-mono text-gray-600">{description}</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href={primaryHref}
            className="px-4 py-3 bg-black text-white border-2 border-black font-bold hover:bg-gray-800 transition-colors"
          >
            {primaryLabel}
          </Link>
          <Link
            href="/"
            className="px-4 py-3 bg-white text-black border-2 border-black font-bold hover:bg-gray-100 transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    </main>
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <AccessDeniedPanel
        description="Sign in with an admin account to open the CinePurr control panel."
        primaryHref="/login"
        primaryLabel="Sign In"
      />
    );
  }

  if (!isAdminUser(session.user.role)) {
    return (
      <AccessDeniedPanel
        description="You are signed in, but your account does not have admin access to the CinePurr control panel."
        primaryHref="/login"
        primaryLabel="Switch Account"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row text-black font-sans selection:bg-purple-300">
      
      {/* Mobile Header (Hidden on Desktop) */}
      <div className="md:hidden bg-white border-b-4 border-black p-4 flex justify-between items-center sticky top-0 z-50">
        <Logo size="sm" />
        <span className="font-black bg-purple-500 text-white px-2 py-1 text-xs">ADMIN</span>
      </div>

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-r-4 md:border-b-0 border-b-4 border-black flex flex-col shrink-0 flex-none sticky top-0 md:h-screen z-40">
        
        {/* Sidebar Header (Hidden on Mobile) */}
        <div className="hidden md:block p-6 border-b-4 border-black">
          <Logo size="md" />
          <div className="mt-4 bg-black text-white p-2 font-mono text-xs shadow-[2px_2px_0px_0px_rgba(139,92,246,1)]">
            <span className="text-purple-400">root@cinepurr:~#</span> ./admin
            <br />
            <span className="text-green-400">ACCESS GRANTED</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto pixel-scrollbar flex md:flex-col gap-2 md:gap-0 overflow-x-auto md:overflow-x-visible">
          
          <div className="text-xs font-black text-gray-500 mb-2 uppercase hidden md:block tracking-widest">Dashboard</div>
          
          <Link 
            href="/admin" 
            className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-purple-100 border-2 border-transparent hover:border-black font-bold transition-all whitespace-nowrap"
          >
            <BarChart3 size={18} className="text-purple-600" />
            Overview
          </Link>
          
          <Link 
            href="/admin/users" 
            className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-blue-100 border-2 border-transparent hover:border-black font-bold transition-all whitespace-nowrap"
          >
            <Users size={18} className="text-blue-600" />
            Manage Users
          </Link>
          
          <Link 
            href="/admin/rooms" 
            className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-green-100 border-2 border-transparent hover:border-black font-bold transition-all whitespace-nowrap"
          >
            <Monitor size={18} className="text-green-600" />
            Active Rooms
          </Link>

          <Link 
            href="/admin/system" 
            className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-orange-100 border-2 border-transparent hover:border-black font-bold transition-all whitespace-nowrap"
          >
            <Settings size={18} className="text-orange-600" />
            System Health
          </Link>

          <div className="hidden md:block mt-8 mb-2 border-t-2 border-gray-200 pt-4" />

          {/* Return home link */}
          <Link 
            href="/" 
            className="flex items-center gap-3 px-4 py-3 bg-black text-white hover:bg-gray-800 border-2 border-black font-bold transition-all shadow-[4px_4px_0px_0px_rgba(255,107,107,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(255,107,107,1)] whitespace-nowrap"
          >
            <LogOut size={18} />
            Exit Panel
          </Link>

        </nav>

        {/* Sidebar Footer */}
        <div className="hidden md:flex p-4 border-t-4 border-black items-center gap-3 bg-gray-50">
          <div className="w-10 h-10 bg-purple-500 border-2 border-black flex items-center justify-center font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            {(session.user?.name || '?')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{session.user?.name}</p>
            <p className="text-xs font-mono text-purple-600 font-bold truncate">{session.user.role}</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden min-w-0 bg-[#f8f9fa] relative z-0">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative z-10 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>

    </div>
  );
}
