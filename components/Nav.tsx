"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js'; 
import { FileText, LogOut, Loader2 } from 'lucide-react';
import Logo from './Logo';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
const supabase = createPagesBrowserClient();


export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/auth'); 
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
            <Link 
              href="/" 
              className={`${pathname === '/' ? 'text-red-500' : 'hover:text-red-500'} transition-colors`}
            >
              Bank
            </Link>
            <Link 
              href="/upload" 
              className={`${pathname === '/upload' ? 'text-red-500' : 'hover:text-red-500'} transition-colors`}
            >
              Upload
            </Link>
          </nav>
          
          <div className="h-4 w-px bg-zinc-800"></div>
          
          <div className="flex items-center gap-3">
            {user ? (
              <>
              <Link href={'/dashboard'} className='flex flex-row items-center content-center gap-2'>
              <img className='w-5 h-5 rounded-full shrink-0 aspect-square' src={user.user_metadata?.avatar_url}></img>
                <span className="text-zinc-400 text-xs font-medium hover:cursor-pointer font-mono hidden md:block">{user.email.substring(0, user.email.indexOf("@"))}</span>
              </Link>
                          <div className="h-4 ml-2 w-px bg-zinc-800"></div>

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