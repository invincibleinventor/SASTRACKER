"use client"


import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { ShieldAlert, Loader2 } from 'lucide-react';
import Logo from '@/components/Logo';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
const supabase = createPagesBrowserClient();

  const allowedDomains = [
    "@sastra.ac.in",
    ".sastra.edu",
  ];
export default function AuthPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function check() {
      const invalidDomainFlag = searchParams.get('invalid_domain');

      if (invalidDomainFlag === '1') {
        setError("Your email is not from the allowed SASTRA domains. Signing you out...");
        await supabase.auth.signOut();
        return;
      }

      const { data: { session }, error: sessErr } = await supabase.auth.getSession();

      if (sessErr) {
        console.error("Session error:", sessErr);
      }

      const user = session?.user ?? null;
      if (!user) {
        return;
      }

      const email = (user.email ?? '').toLowerCase().trim();
      const isAllowed = allowedDomains.some(d => email.endsWith(d));

      if (!isAllowed) {
        setError("Your current account email is not allowed. Signing out...");
        await supabase.auth.signOut();
        return;
      }

    window.location.replace('/');
    }

    check();
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      // FIX: Changed redirectTo to point to the callback route, NOT /auth
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (oauthError) throw oauthError;
    } catch (err: any) {
      setError(err?.message || "Login failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md border border-zinc-800 bg-zinc-900/30 p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-pink-600"></div>
        
        <div className="mb-8 text-center">
          <div className='flex justify-center mb-4'><Logo /></div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
            SASTRACKER<span className="text-red-600">.</span>
          </h1>
          <p className="text-zinc-500 text-xs font-mono mt-2 uppercase tracking-widest">
           The Missing Search Engine For PyQs
          </p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-900/50 text-red-500 p-3 mb-6 text-xs font-mono">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-amber-900/10 border border-amber-900/30 p-4 flex items-start gap-3">
            <ShieldAlert className="text-amber-600 shrink-0" size={18} />
            <div>
              <h3 className="text-amber-500 text-xs font-bold uppercase mb-1">
                SASTRA Access Only
              </h3>
              <p className="text-amber-700/80 text-[10px] leading-relaxed">
                Restricted to SASTRA Deemed University. Sign in with your official email: <br/>
                <span className="block mt-1 font-mono text-amber-500">
                  @sastra.ac.in
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white text-black font-bold py-3 px-4 hover:bg-gray-200 transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}