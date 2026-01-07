"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Briefcase, ShieldCheck, Rocket } from 'lucide-react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
const supabase = createPagesBrowserClient();

const SASTRA_DOMAINS = ["sastra.ac.in", "sastra.edu"];

function isSastraEmail(email: string): boolean {
  return SASTRA_DOMAINS.some((d) => email.toLowerCase().trim().endsWith(d));
}

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [isSastra, setIsSastra] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (session?.user?.email) {
        const email = session.user.email.toLowerCase();
        setIsSastra(isSastraEmail(email));

        const { data } = await supabase.from('admin_users').select('id').eq('email', email).maybeSingle();
        setIsAdmin(!!data);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user?.email) {
        const email = session.user.email.toLowerCase();
        setIsSastra(isSastraEmail(email));
        const { data } = await supabase.from('admin_users').select('id').eq('email', email).maybeSingle();
        setIsAdmin(!!data);
      } else {
        setIsSastra(false);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsSastra(false);
    setIsAdmin(false);
    router.push('/auth');
  };

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <header className="bg-black border-b border-zinc-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center p-4">
        <Link href="/" className="flex items-center space-x-3 cursor-pointer group">
          <img className="w-8 h-8 mx-3 object-fit aspect-square no-shrink" src="/logo.png"></img>

          <span className="text-xl hidden lg:inline-block font-black tracking-tighter text-white uppercase italic">
            SASTRACKER<span className="text-red-600">.</span>
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <nav className="flex space-x-6 text-xs font-bold uppercase tracking-widest text-zinc-400">
            {isSastra && (
              <>
                <Link
                  href="/"
                  className={`${isActive('/') && !isActive('/resumes') && !isActive('/projects') && !isActive('/upload') && !isActive('/admin') && !isActive('/profile') ? 'text-red-500' : 'hover:text-red-500'} transition-colors`}
                >
                  Bank
                </Link>
                <Link
                  href="/upload"
                  className={`${isActive('/upload') ? 'text-red-500' : 'hover:text-red-500'} transition-colors`}
                >
                  Upload
                </Link>
              </>
            )}
            <Link
              href="/resumes"
              className={`${isActive('/resumes') ? 'text-red-500' : 'hover:text-red-500'} transition-colors flex items-center gap-1`}
            >
              <Briefcase size={12} /> Resumes
            </Link>
            <Link
              href="/projects"
              className={`${isActive('/projects') ? 'text-cyan-500' : 'hover:text-cyan-500'} transition-colors flex items-center gap-1`}
            >
              <Rocket size={12} /> Projects
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className={`${isActive('/admin') ? 'text-green-500' : 'hover:text-green-500'} transition-colors flex items-center gap-1`}
              >
                <ShieldCheck size={12} /> Admin
              </Link>
            )}
          </nav>

          <div className="h-4 w-px bg-zinc-800"></div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link href={'/profile'} className='flex flex-row items-center content-center gap-2'>
                  <img className='w-5 h-5 rounded-full shrink-0 aspect-square' src={user.user_metadata?.avatar_url}></img>
                  <span className="text-zinc-400 text-xs font-medium hover:cursor-pointer font-mono hidden md:block">{user.email.substring(0, user.email.indexOf("@"))}</span>
                </Link>
                <div className="h-4 ml-3 w-px bg-zinc-800"></div>

                <button onClick={handleLogout} className="text-zinc-500 hover:text-red-500 transition-colors" title="Logout">
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <Link href="/auth" className="text-zinc-300 hover:text-white text-xs font-bold uppercase">Login</Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}