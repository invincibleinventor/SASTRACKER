"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import {
    Search, Briefcase, Eye, Sparkles, GitFork,
    ArrowRight, Plus, Building2, TrendingUp, FileText, Users,
    ArrowDown, GraduationCap, Database, LogOut, Loader2, ChevronDown
} from 'lucide-react';
import gsap from 'gsap';
import Link from 'next/link';
import type { Resume } from '@/utils/resumeTypes';

const supabase = createPagesBrowserClient();

const SASTRA_DOMAINS = ["sastra.ac.in", "sastra.edu"];

function isSastraEmail(email: string): boolean {
    return SASTRA_DOMAINS.some((d) => email.toLowerCase().trim().endsWith(d));
}

export default function ResumesPage() {
    const router = useRouter();
    const [resumes, setResumes] = useState<Resume[]>([]);
    const [loading, setLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('');
    const [user, setUser] = useState<any>(null);
    const [isSastra, setIsSastra] = useState(false);
    const [visiblecount, setVisiblecount] = useState(12);
    const itemsperpage = 12;

    const heroRef = useRef(null);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/auth');
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user?.email) {
                setIsSastra(isSastraEmail(session.user.email));
            }
            setAuthLoading(false);
        });
    }, []);

    useEffect(() => {
        if (!authLoading && user) {
            fetchResumes();
        } else if (!authLoading && !user) {
            setLoading(false);
        }
    }, [authLoading, user]);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo(".hero-fade",
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: "power2.out" }
            );
        }, heroRef);
        return () => ctx.revert();
    }, [authLoading]);

    const fetchResumes = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('resumes')
            .select('*')
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setResumes(data);
        }
        setLoading(false);
    };

    const filteredResumes = resumes.filter(r => {
        const matchesSearch =
            r.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.role_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.user_name.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesFilter = !filterType || r.achievement_type === filterType;

        return matchesSearch && matchesFilter;
    });

    const getAchievementBadge = (type: string) => {
        switch (type) {
            case 'internship':
                return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 text-[10px] uppercase font-bold">Internship</span>;
            case 'job':
                return <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 text-[10px] uppercase font-bold">Full-time</span>;
            case 'both':
                return <span className="bg-pink-500/20 text-pink-400 border border-pink-500/30 px-2 py-0.5 text-[10px] uppercase font-bold">Intern → FT</span>;
            default:
                return null;
        }
    };

    const scrollToGallery = () => {
        document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-gray-100">

            {user && isSastra && (
                <div className="bg-gradient-to-r from-red-600/20 to-pink-600/20 border-b border-red-900/30 py-3 px-6">
                    <div className="max-w-6xl mx-auto flex items-center justify-between">
                        <p className="text-zinc-300 text-sm flex items-center gap-2">
                            <Database size={16} className="text-red-400" />
                            You have access to the PyQ Database!
                        </p>
                        <Link href="/" className="text-red-400 font-bold text-sm hover:underline flex items-center gap-1">
                            Go to Question Bank <ArrowRight size={14} />
                        </Link>
                    </div>
                </div>
            )}

            {user && !isSastra && (
                <div className="bg-zinc-900 border-b border-zinc-800 py-3 px-6">
                    <div className="max-w-6xl mx-auto flex items-center justify-between">
                        <p className="text-zinc-400 text-sm flex items-center gap-2">
                            <GraduationCap size={16} />
                            Need PyQ access? Login with your SASTRA email
                        </p>
                        <button onClick={handleSignOut} className="text-zinc-300 font-bold text-sm hover:text-white flex items-center gap-1">
                            <LogOut size={14} /> Switch Account
                        </button>
                    </div>
                </div>
            )}

            <section ref={heroRef} className="relative min-h-[85vh] flex flex-col justify-center p-6 border-b border-zinc-800 overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/5 rounded-full blur-3xl pointer-events-none"></div>

                <div className="max-w-6xl mx-auto w-full relative z-10">
                    <div className="text-center mb-12">
                        <div className="hero-fade inline-flex items-center gap-2 border border-red-500/50 bg-red-500/10 px-4 py-1.5 text-red-400 text-xs font-mono uppercase tracking-widest mb-8">
                            <Briefcase size={14} /> Resume Hub
                        </div>

                        <h1 className="hero-fade text-5xl md:text-7xl font-black text-white leading-[0.95] tracking-tighter mb-6">
                            RESUMES THAT <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-500">LANDED JOBS</span>
                        </h1>

                        <p className="hero-fade text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed mb-10">
                            Real resumes from real people who got real offers.
                            Learn from success, fork templates, and compare your way to your dream job.
                        </p>

                        <div className="hero-fade flex flex-wrap gap-4 justify-center mb-12">
                            <button
                                onClick={scrollToGallery}
                                className="px-8 py-4 bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2"
                            >
                                Browse Resumes <ArrowDown size={16} />
                            </button>
                            <button
                                onClick={() => router.push('/resumes/submit')}
                                className="px-8 py-4 border border-zinc-700 text-white font-bold text-sm uppercase tracking-widest hover:border-red-600 transition-colors flex items-center gap-2"
                            >
                                <Plus size={16} /> Submit Yours
                            </button>
                        </div>
                    </div>

                    <div className="hero-fade grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                        <div className="bg-black/50 border border-zinc-800 p-6 text-center hover:border-red-900/50 transition-colors">
                            <FileText size={28} className="text-red-500 mx-auto mb-4" />
                            <h3 className="text-white font-bold uppercase mb-2">Browse & Download</h3>
                            <p className="text-zinc-500 text-sm">View successful resumes and download them as reference</p>
                        </div>
                        <div className="bg-black/50 border border-zinc-800 p-6 text-center hover:border-red-900/50 transition-colors">
                            <Sparkles size={28} className="text-pink-500 mx-auto mb-4" />
                            <h3 className="text-white font-bold uppercase mb-2">Fork Templates</h3>
                            <p className="text-zinc-500 text-sm">AI rewrites your resume matching any template's style</p>
                        </div>
                        <div className="bg-black/50 border border-zinc-800 p-6 text-center hover:border-red-900/50 transition-colors">
                            <TrendingUp size={28} className="text-red-400 mx-auto mb-4" />
                            <h3 className="text-white font-bold uppercase mb-2">Diff Viewer</h3>
                            <p className="text-zinc-500 text-sm">See what you lack vs top resumes and get suggestions</p>
                        </div>
                    </div>
                </div>
            </section>

            <section id="gallery" className="py-16 border-b border-zinc-800">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col lg:flex-row gap-4 mb-8">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-3.5 text-zinc-500" size={18} />
                            <input
                                type="text"
                                placeholder="Search by company, role, or name..."
                                className="w-full bg-zinc-900 border border-zinc-700 p-3 pl-12 text-white placeholder-zinc-500 focus:border-red-600 outline-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-2">
                            <select
                                className="bg-zinc-900 border border-zinc-700 p-3 text-white text-sm outline-none focus:border-red-600"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="">All Types</option>
                                <option value="internship">Internships</option>
                                <option value="job">Full-time Jobs</option>
                                <option value="both">Intern to FT</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-4 mb-8">
                        <button
                            onClick={() => router.push('/resumes/diff')}
                            className="border border-zinc-700 bg-zinc-900/50 text-zinc-300 px-4 py-2 text-xs uppercase font-bold hover:border-red-600 hover:text-white transition-colors flex items-center gap-2"
                        >
                            <TrendingUp size={14} /> Diff Viewer
                        </button>
                        <button
                            onClick={() => router.push('/resumes/fork')}
                            className="border border-zinc-700 bg-zinc-900/50 text-zinc-300 px-4 py-2 text-xs uppercase font-bold hover:border-red-600 hover:text-white transition-colors flex items-center gap-2"
                        >
                            <Sparkles size={14} /> Fork a Template
                        </button>
                        {user && (
                            <Link
                                href="/profile?section=resumes"
                                className="border border-zinc-700 bg-zinc-900/50 text-zinc-300 px-4 py-2 text-xs uppercase font-bold hover:border-red-600 hover:text-white transition-colors flex items-center gap-2 ml-auto"
                            >
                                <Users size={14} /> My Profile
                            </Link>
                        )}
                    </div>

                    {authLoading || loading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="text-red-600 animate-spin" size={32} />
                        </div>
                    ) : !user ? (
                        <div className="text-center py-20 border border-dashed border-zinc-800">
                            <GraduationCap size={40} className="text-zinc-600 mx-auto mb-4" />
                            <p className="text-zinc-400 mb-2">Login to browse approved resumes</p>
                            <p className="text-zinc-600 text-sm mb-6">See real resumes that landed jobs and internships</p>
                            <Link
                                href="/auth?redirect_to=/resumes&public=1"
                                className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold px-6 py-3 text-sm uppercase tracking-widest hover:opacity-90"
                            >
                                Login to Browse <ArrowRight size={16} />
                            </Link>
                        </div>
                    ) : filteredResumes.length === 0 ? (
                        <div className="text-center py-20 border border-dashed border-zinc-800">
                            <p className="text-zinc-500 mb-4">No resumes found</p>
                            <button
                                onClick={() => router.push('/resumes/submit')}
                                className="text-red-500 font-bold hover:underline"
                            >
                                Be the first to submit
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredResumes.slice(0, visiblecount).map((resume) => (
                                    <div
                                        key={resume.id}
                                        onClick={() => router.push(`/resumes/${resume.id}`)}
                                        className="bg-black border border-zinc-800 p-6 hover:border-red-900/50 cursor-pointer transition-all group"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                {getAchievementBadge(resume.achievement_type)}
                                            </div>
                                            <div className="flex items-center gap-3 text-zinc-600 text-xs">
                                                <span className="flex items-center gap-1"><Eye size={12} /> {resume.views_count}</span>
                                                <span className="flex items-center gap-1"><GitFork size={12} /> {resume.fork_count || 0}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 text-red-500 text-xs font-bold uppercase tracking-widest mb-2">
                                            <Building2 size={14} />
                                            {resume.company_name}
                                        </div>

                                        <h3 className="text-lg font-black text-white mb-2 line-clamp-1">
                                            {resume.role_title}
                                        </h3>

                                        <p className="text-zinc-500 text-sm mb-4">
                                            by <Link href={`/profile/${resume.user_id}`} onClick={(e) => e.stopPropagation()} className="text-zinc-300 hover:text-red-400">{resume.user_name}</Link>
                                            {resume.year_graduated && <span> • Class of {resume.year_graduated}</span>}
                                        </p>

                                        {resume.tips && (
                                            <p className="text-zinc-600 text-xs line-clamp-2 border-t border-zinc-900 pt-4 italic">
                                                "{resume.tips}"
                                            </p>
                                        )}

                                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-900">
                                            <span className="text-zinc-500 group-hover:text-red-500 flex items-center gap-2 text-xs uppercase font-bold transition-colors">
                                                View Resume <ArrowRight size={14} />
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {filteredResumes.length > visiblecount && (
                                <div className="text-center mt-8">
                                    <button
                                        onClick={() => setVisiblecount(prev => prev + itemsperpage)}
                                        className="bg-zinc-900 border border-zinc-700 text-white px-8 py-3 text-sm font-bold uppercase hover:border-red-600 transition-colors flex items-center gap-2 mx-auto"
                                    >
                                        <ChevronDown size={16} />
                                        Load More ({filteredResumes.length - visiblecount} remaining)
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>

            <section className="py-16 bg-black border-b border-zinc-800">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">
                        Have a Resume That Worked?
                    </h2>
                    <p className="text-zinc-500 mb-8">
                        Share your success and help others land their dream jobs.
                        SASTRA emails get auto-approved, others go through quick review.
                    </p>
                    <button
                        onClick={() => router.push('/resumes/submit')}
                        className="bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold px-8 py-4 text-sm uppercase tracking-wider hover:opacity-90 flex items-center gap-2 mx-auto"
                    >
                        <Plus size={16} /> Submit Your Resume
                    </button>
                </div>
            </section>

            <footer className="py-8 bg-neutral-950 text-zinc-600 text-xs text-center">
                <p>Part of <Link href="/auth" className="text-red-500 hover:underline">SASTRACKER</Link> • Resume Hub</p>
            </footer>
        </div>
    );
}
