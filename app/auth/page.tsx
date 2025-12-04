'use client'
import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  ShieldAlert, Loader2, FileText, Search, Bot, 
  Database, Zap, Heart, Mail, Github, Linkedin, 
  ArrowRight, BookOpen, Sparkles, GraduationCap, 
  Cpu, Network, FileJson, ScanLine, Share2, HelpCircle,
  Upload
} from 'lucide-react';
import Logo from '@/components/Logo';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const supabase = createClientComponentClient();

const allowedDomains = [
  "@sastra.ac.in",
  ".sastra.edu",
];

export default function AuthPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  
  // Refs
  const containerRef = useRef(null);
  const heroRef = useRef(null);

  // --- ANIMATIONS ---
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero Fade In
      gsap.fromTo(".hero-element", 
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: "power2.out" }
      );

      // Pipeline Animation
      gsap.fromTo(".pipeline-step", 
        { opacity: 0, x: -20 },
        {
          opacity: 1, 
          x: 0, 
          duration: 0.5, 
          stagger: 0.2,
          scrollTrigger: {
            trigger: "#pipeline",
            start: "top 70%",
          }
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // --- AUTH LOGIC ---
  useEffect(() => {
    async function check() {
      const invalidDomainFlag = searchParams.get('invalid_domain');

      if (invalidDomainFlag === '1') {
        setError("Access Restricted. Use your SASTRA email.");
        await supabase.auth.signOut();
        return;
      }

      const { data: { session }, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) console.error(sessErr);

      const user = session?.user ?? null;
      if (!user) return;

      const email = (user.email ?? '').toLowerCase().trim();
      const isAllowed = allowedDomains.some(d => email.endsWith(d));

      if (!isAllowed) {
        setError("Authorized personnel only. Signing out...");
        await supabase.auth.signOut();
        return;
      }

      window.location.replace('/');
    }
    check();
  }, [searchParams]);

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
    <div ref={containerRef} className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-red-900 selection:text-white overflow-x-hidden">
      
      {/* --- HERO SECTION --- */}
      <section className="relative min-h-screen flex flex-col justify-center p-6 border-b border-zinc-800">
        {/* Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* Left: Value Prop */}
          <div className="lg:col-span-7 space-y-8">
            <div className="hero-element inline-flex items-center gap-3 border border-pink-500/50 bg-pink-500/10 px-3 py-1 text-pink-500 text-xs font-mono uppercase tracking-widest">
              <span className="w-2 h-2 bg-pink-500 animate-pulse"></span>
              v1 Stable
            </div>
            
            <div className="hero-element">
              <h1 className="text-5xl md:text-7xl font-black text-white leading-[0.9] tracking-tighter mb-6">
                SASTRA'S <br />
                KNOWLEDGE <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-pink-500">REPOSITORY</span>
              </h1>
              <p className="text-zinc-400 text-lg max-w-xl leading-relaxed border-l-2 border-red-600 pl-6">
                A centralized, intelligent database for Previous Year Questions. 
                Stop searching through scattered WhatsApp groups. Come SASTRACKER - Your modern PyQDB
              </p>
            </div>

            <div className="hero-element flex flex-wrap gap-4">
              <button 
                onClick={() => document.getElementById('pipeline')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-white text-black font-bold text-sm uppercase tracking-widest hover:bg-zinc-200 transition-colors flex items-center gap-2 rounded-none"
              >
                How it works <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Right: Auth Interface */}
          <div className="lg:col-span-5 w-full">
            <div className="hero-element w-full border border-zinc-800 bg-zinc-900/50 p-8 backdrop-blur-sm rounded-none">
              <div className="mb-8">
                <div className='mb-4 text-red-600'><Logo /></div>
                <h2 className="text-xl text-center font-bold text-white uppercase tracking-wider mb-2">
                 WELCOME ABOARD
                </h2>
                <p className="text-zinc-500 text-center my-1 text-xs font-mono">
                  Login with an official mail to enter SASTRACKER.
                </p>
              </div>

              {error && (
                <div className="bg-red-950/50 border-l-2 border-red-500 text-red-200 p-4 mb-6 text-xs font-mono">
                  {error}
                </div>
              )}

              <div className="space-y-6">
                <div className="p-4 border border-dashed border-zinc-700 bg-black/50 rounded-none">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="text-zinc-400 shrink-0" size={16} />
                    <div>
                      <h3 className="text-zinc-300 text-xs font-bold uppercase mb-1">
                        Restricted Access
                      </h3>
                      <p className="text-zinc-500 text-[10px] leading-relaxed font-mono">
                        Ensure your email ends with @sastra.ac.in or @*.sastra.edu to access SASTRACKER
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold py-4 px-4 hover:bg-red-700 transition-colors flex items-center justify-center gap-3 disabled:opacity-50 rounded-none group"
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
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- THE PROBLEM STATEMENT --- */}
      <section className="py-24 border-b border-zinc-900 bg-neutral-950">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16">
          <div>
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-800  to-zinc-400  uppercase tracking-tighter mb-6">
              The Problem
            </h2>
            <p className="text-zinc-400 text-lg leading-relaxed mb-6">
              Academic resources are often fragmented. Valuable Question Papers (PyQs) are stored as images, shared on messaging apps, and eventually lost in the digital void.
            </p>
          </div>
          <div>
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-600  to-zinc-400 uppercase tracking-tighter mb-6">
              Our Solution
            </h2>
            <p className="text-zinc-400 text-lg leading-relaxed mb-6">
              Sastracker creates a permanent, structured archive. We don't just store files - we extract the content, making every question searchable, sortable, and solvable.
            </p>
          </div>
        </div>
      </section>

      {/* --- PROCESSING PIPELINE (TIMELINE) --- */}
      <section id="pipeline" className="py-32 border-b border-zinc-900 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-20">
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">
              Simplified Processing Flow
            </h2>
            <p className="text-zinc-500 font-mono">How SASTRACKER Operates - <a href="https://youtu.be/6SMkg1Ec2xk?si=5IHOjQOelUw-n1nt" className="underline hover:text-white transition-colors">More on our YouTube video</a></p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <ProcessStep 
              step="01"
              icon={<Upload size={24}/>}
              title="Ingestion"
              description="Raw PDF upload via secure portal. Supports scanned documents and digital exports."
            />
            <ProcessStep 
              step="02"
              icon={<ScanLine size={24}/>}
              title="Extraction"
              description="Vision algorithms parse visual data. OCR extracts text while preserving mathematical notation."
            />
            <ProcessStep 
              step="03"
              icon={<Cpu size={24}/>}
              title="Analysis"
              description="Intelligent models identify metadata: Year, Subject, Exam Type, and Marks allocation."
            />
            <ProcessStep 
              step="04"
              icon={<Database size={24}/>}
              title="Indexing"
              description="Structured data is pushed to the database. Vector search ready for instant retrieval."
            />
          </div>
        </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section className="py-32 bg-neutral-950 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-6">
                  <h1 className='text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-700 mb-10 pl-1 to-zinc-900 font-black uppercase text-3xl'>Our Features</h1>

          <div className="grid md:grid-cols-3 gap-3">
            <FeatureBox 
              icon={<Search className="text-white" size={24} />}
              title="Granular Search"
              desc="Filter by Year (I-IV), Subject Name, Exam Category (CIA/End Sem), or specific marks."
            />
            <FeatureBox 
              icon={<Bot className="text-white" size={24} />}
              title="AI Tutor"
              desc="Generate step-by-step solutions for any question using our integrated smart solver."
            />
            <FeatureBox 
              icon={<FileJson className="text-white" size={24} />}
              title="LaTeX Rendering"
              desc="Complex mathematical equations are rendered natively in the browser for perfect clarity."
            />
            <FeatureBox 
              icon={<Share2 className="text-white" size={24} />}
              title="Contribution"
              desc="Upload your own papers or contribute answers to existing questions to help the community."
            />
            <FeatureBox 
              icon={<Network className="text-white" size={24} />}
              title="Peer Review"
              desc="Community voting system ensures the best and most accurate answers appear at the top."
            />
            
            <FeatureBox 
              icon={<Zap className="text-white" size={24} />}
              title="Real-time Updates"
              desc="New uploads appear instantly in the global feed. No processing lag."
            />
          </div>
        </div>
      </section>

      {/* --- FAQ SECTION --- */}
      <section className="py-32 border-b border-zinc-900">
        <div className="max-w-4xl mx-auto px-6">
           <div className="mb-16">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-zinc-500 font-mono">Common questions regarding SASTRACKER and using it.</p>
          </div>
          <div className="space-y-4">
            <FaqItem question="Who can access this platform?" answer="Access is strictly limited to students and faculty with a valid @sastra.ac.in or associated institutional email address." />
            <FaqItem question="How do I upload a question paper?" answer="Once logged in, navigate to the Upload section. You can drag and drop PDF files, and the system will automatically extract the questions individually." />
            <FaqItem question="Can I edit questions if the AI makes a mistake?" answer="Yes. Our review interface allows you to edit text, fix mathematical formulas, and adjust images before the paper is published to the live database." />
            <FaqItem question="Is this an official university portal?" answer="No, this is a student-run initiative designed to help the community organize and preserve academic resources effectively." />
                      <FaqItem question="How do I contribute to SASTRACKER?" answer="You can contribute to us by 4 ways. You can upload any PyQs you find. You can contribute community answers to various questions. You can join us in developing SASTRACKER. And alas, the most important way to support us is to spread the word amongst your friends :)" />
            <FaqItem question="How do I join to develop SASTRACKER?" answer="Firstly, appreciate the curiosity to join us! We aren't having a super structured hiring or recruitment process yet. We find you ammusing, we take you in! As simple as that. And no we do not require people only for coding stuff. We want people to help us proof read, moderate and promote as well. Do join us by sending in a mail. Scroll to the bottom to find the contact button! Happy to see you on the other side!" />

          </div>
        </div>
      </section>

      {/* --- CTA --- */}
      <section className="py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
           <p className="font-sans text-zinc-300 text-base bg-white/10 border border-zinc-800 rounded-none border-dashed py-2 mb-10 ">
            We are completely student-run and community-driven. Your participation keeps the archive growing.
          </p>
          <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-8">
            START EXPLORING AND CONTRIBUTING
          </h2>
          <p className="text-zinc-500 text-lg mb-12">
            Join SASTRACKER. Access PyQs. Contribute to the archive. Let the community thrive.
          </p>
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-gradient-to-r from-red-600 to-pink-600 text-white text-sm font-black px-12 py-4 uppercase tracking-widest hover:bg-red-700 transition-all rounded-none"
          >
            Access SASTRACKER
          </button>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-12 border-t border-zinc-900 bg-black text-zinc-500 font-mono text-xs">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
               <div className="w-4 h-4 bg-gradient-to-br from-red-600 to-pink-600"></div>
               <span className="font-bold text-white tracking-tight uppercase">SASTRACKER</span>
            </div>
            <a href="https://baladev.in" className="hover:text-white transition-colors">
              &copy; {new Date().getFullYear()} Invincible Inventor.
            </a>
          </div>

          <div className="flex gap-8 uppercase tracking-wider font-bold">
            <a href="mailto:128003034@sastra.ac.in" className="hover:text-white transition-colors">Contact</a>
            <a href="https://baladev.in" className="hover:text-white transition-colors">Author</a>
          </div>

          <div className="flex items-center gap-2">
            <span>NOT OFFICIALLY RECOGNIZED BY:</span>
            <Link href="https://sastra.edu" className="text-green-500">SASTRA ©</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}

// --- Subcomponents ---

const ProcessStep = ({ step, icon, title, description }: any) => (
  <div className="pipeline-step border border-zinc-800 bg-zinc-900/20 p-6 relative group hover:border-zinc-600 transition-colors rounded-none">
    <div className="absolute top-4 right-4 text-4xl font-black text-zinc-800/50 select-none group-hover:text-zinc-800 transition-colors">{step}</div>
    <div className="mb-6 text-red-600">{icon}</div>
    <h3 className="text-lg font-bold text-white uppercase mb-3 tracking-wide">{title}</h3>
    <p className="text-zinc-500 text-sm leading-relaxed font-mono">{description}</p>
  </div>
);

const FeatureBox = ({ icon, title, desc }: any) => (
  <div className="bg-black border-dashed border border-zinc-800 p-8 hover:bg-zinc-900/50 transition-colors group">
    <div className="mb-6 opacity-50 group-hover:opacity-100 transition-opacity">{icon}</div>
    <h3 className="text-lg font-bold text-white uppercase mb-2">{title}</h3>
    <p className="text-zinc-500 text-sm leading-relaxed">{desc}</p>
  </div>
);

const FaqItem = ({ question, answer }: any) => (
  <div className="border border-zinc-800 bg-zinc-900/10 p-6 hover:bg-zinc-900/30 transition-colors rounded-none">
    <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
      <HelpCircle size={16} className="text-zinc-500" /> {question}
    </h3>
    <p className="text-zinc-400 text-sm leading-relaxed pl-6 border-l border-zinc-800">{answer}</p>
  </div>
);