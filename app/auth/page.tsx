'use client'
import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { ShieldAlert, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import Logo from '@/components/Logo';
import Link from 'next/link';

const supabase = createClientComponentClient();

const SASTRA_DOMAINS = ["sastra.ac.in", "sastra.edu"];

function isSastraEmail(email: string): boolean {
  const lower = email.toLowerCase().trim();
  return SASTRA_DOMAINS.some((d) => lower.endsWith(d));
}

function AuthPageContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function check() {
      const publicMode = searchParams.get('public');
      const redirectTo = searchParams.get('redirect_to');

      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;

      if (!user) return;

      const email = (user.email ?? '').toLowerCase().trim();
      const isSastra = isSastraEmail(email);

      if (publicMode === '1') {
        router.push(redirectTo || '/resumes');
        return;
      }

      if (isSastra) {
        router.push(redirectTo || '/');
      } else {
        router.push('/resumes');
      }
    }
    check();
  }, [searchParams, router]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
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
    <div className="min-h-screen bg-black text-zinc-100 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <div className="border border-zinc-800 bg-zinc-900/50 p-8 backdrop-blur-sm">
          <div className="mb-8">
            <div className='mb-4 text-red-600'><Logo /></div>
            <h2 className="text-xl text-center font-bold text-white uppercase tracking-wider mb-2">
              LOGIN
            </h2>
            <p className="text-zinc-500 text-center my-1 text-xs font-mono">
              Sign in with your Google account
            </p>
          </div>

          {error && (
            <div className="bg-red-950/50 border-l-2 border-red-500 text-red-200 p-4 mb-6 text-xs font-mono">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div className="p-4 border border-dashed border-zinc-700 bg-black/50">
              <div className="flex items-start gap-3">
                <ShieldAlert className="text-zinc-400 shrink-0" size={16} />
                <div>
                  <h3 className="text-zinc-300 text-xs font-bold uppercase mb-1">
                    PyQ Access
                  </h3>
                  <p className="text-zinc-500 text-[10px] leading-relaxed font-mono">
                    Use @sastra.ac.in email for PyQ Database access. Other emails can access Resume Hub only.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold py-4 px-4 hover:opacity-90 transition-colors flex items-center justify-center gap-3 disabled:opacity-50 group"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <span>Login via Google</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="text-center border-t border-zinc-800 pt-4">
              <Link href="/resumes" className="text-zinc-500 hover:text-purple-400 text-xs font-mono transition-colors">
                Browse Resume Hub without login →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="text-red-600 animate-spin" size={32} />
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  );
}