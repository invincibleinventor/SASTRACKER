"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import {
    ShieldCheck, Loader2, LayoutDashboard, FileText, Users,
    MessageSquare, BarChart3, Database, TrendingUp, Eye, Sparkles, Award, Rocket, BookOpen,
    GitFork, ArrowLeftRight
} from 'lucide-react';
import Link from 'next/link';

const supabase = createPagesBrowserClient();

export default function AnalyticsDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [topResumes, setTopResumes] = useState<any[]>([]);
    const [topContributors, setTopContributors] = useState<any[]>([]);
    const [companyCounts, setCompanyCounts] = useState<any[]>([]);
    const [monthlyStats, setMonthlyStats] = useState<any[]>([]);
    const [projectStats, setProjectStats] = useState<any>({ total: 0, byCategory: [], topProjects: [] });
    const [pyqStats, setPyqStats] = useState<any>({ papers: 0, questions: 0, bySubject: [] });
    const [forkStats, setForkStats] = useState<any>({ total: 0, topForked: [] });
    const [diffStats, setDiffStats] = useState<any>({ total: 0, positiveRate: 0 });

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!session) {
                    if (event === 'SIGNED_OUT') {
                        router.push('/auth?redirect_to=/admin/analytics&admin=1');
                    }
                    return;
                }

                const email = session.user.email?.toLowerCase() || '';
                const { data: admincheck } = await supabase
                    .from('admin_users')
                    .select('id')
                    .eq('email', email)
                    .single();

                if (!admincheck) {
                    router.push('/resumes');
                    return;
                }

                await fetchAnalytics();
                setLoading(false);
            }
        );

        supabase.auth.getSession();
        return () => subscription.unsubscribe();
    }, [router]);

    const fetchAnalytics = async () => {
        const [resumesRes, projectsRes, papersRes, questionsRes] = await Promise.all([
            supabase.from('resumes').select('*').eq('status', 'approved').order('views_count', { ascending: false }),
            supabase.from('projects').select('*').in('status', ['published', 'featured']).order('views_count', { ascending: false }),
            supabase.from('papers').select('*'),
            supabase.from('questions').select('id', { count: 'exact', head: true })
        ]);

        const resumes = resumesRes.data || [];
        if (resumes.length) {
            setTopResumes(resumes.slice(0, 10));

            const contributors: Record<string, { name: string, email: string, count: number, views: number }> = {};
            resumes.forEach(r => {
                if (!contributors[r.user_email]) {
                    contributors[r.user_email] = { name: r.user_name, email: r.user_email, count: 0, views: 0 };
                }
                contributors[r.user_email].count++;
                contributors[r.user_email].views += r.views_count || 0;
            });
            setTopContributors(Object.values(contributors).sort((a, b) => b.count - a.count).slice(0, 10));

            const companies: Record<string, number> = {};
            resumes.forEach(r => {
                const company = r.company_name.trim();
                companies[company] = (companies[company] || 0) + 1;
            });
            setCompanyCounts(
                Object.entries(companies)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 15)
            );

            const monthly: Record<string, number> = {};
            resumes.forEach(r => {
                const month = new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                monthly[month] = (monthly[month] || 0) + 1;
            });
            setMonthlyStats(Object.entries(monthly).map(([month, count]) => ({ month, count })));
        }

        const projects = projectsRes.data || [];
        if (projects.length) {
            const byCategory: Record<string, number> = {};
            projects.forEach(p => {
                byCategory[p.category] = (byCategory[p.category] || 0) + 1;
            });
            setProjectStats({
                total: projects.length,
                byCategory: Object.entries(byCategory).map(([cat, count]) => ({ category: cat, count })).sort((a, b) => b.count - a.count),
                topProjects: projects.slice(0, 5)
            });
        }

        const papers = papersRes.data || [];
        const bySubject: Record<string, number> = {};
        papers.forEach(p => {
            bySubject[p.subject_name] = (bySubject[p.subject_name] || 0) + 1;
        });
        setPyqStats({
            papers: papers.length,
            questions: questionsRes.count || 0,
            bySubject: Object.entries(bySubject).map(([subject, count]) => ({ subject, count })).sort((a, b) => b.count - a.count).slice(0, 10)
        });

        const [forksRes, diffsRes, feedbackRes] = await Promise.all([
            supabase.from('resume_forks').select('id', { count: 'exact', head: true }),
            supabase.from('diff_cache').select('id', { count: 'exact', head: true }),
            supabase.from('diff_feedback').select('is_positive')
        ]);

        const topForkedRes = await supabase
            .from('resumes')
            .select('id, company_name, role_title, fork_count')
            .gt('fork_count', 0)
            .order('fork_count', { ascending: false })
            .limit(5);

        setForkStats({
            total: forksRes.count || 0,
            topForked: topForkedRes.data || []
        });

        const feedback = feedbackRes.data || [];
        const positive = feedback.filter(f => f.is_positive).length;
        setDiffStats({
            total: diffsRes.count || 0,
            positiveRate: feedback.length > 0 ? Math.round((positive / feedback.length) * 100) : 0
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <Loader2 className="text-red-600 animate-spin" size={32} />
            </div>
        );
    }

    const navItems = [
        { href: '/admin', icon: LayoutDashboard, label: 'Overview' },
        { href: '/admin/resumes', icon: FileText, label: 'Resumes' },
        { href: '/admin/users', icon: Users, label: 'Users' },
        { href: '/admin/pyqs', icon: Database, label: 'PyQs' },
        { href: '/admin/comments', icon: MessageSquare, label: 'Comments' },
        { href: '/admin/analytics', icon: BarChart3, label: 'Analytics', active: true },
    ];

    return (
        <div className="min-h-screen bg-neutral-950 text-gray-100">
            <div className="flex">
                <aside className="w-64 min-h-screen bg-black border-r border-zinc-800 p-4 sticky top-0">
                    <div className="flex items-center gap-3 mb-8 p-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center">
                            <ShieldCheck size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-white uppercase tracking-tight">Admin</h1>
                            <p className="text-zinc-500 text-[10px] font-mono">SASTRACKER</p>
                        </div>
                    </div>

                    <nav className="space-y-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors ${item.active
                                    ? 'bg-zinc-900 text-white border-l-2 border-red-500'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
                                    }`}
                            >
                                <item.icon size={16} />
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </aside>

                <main className="flex-1 p-8">
                    <div className="mb-8">
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Analytics</h2>
                        <p className="text-zinc-500">Platform insights and trends</p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8 mb-8">
                        <div className="bg-black border border-zinc-800 p-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                                <Eye size={14} /> Top Resumes by Views
                            </h3>
                            <div className="space-y-3">
                                {topResumes.map((resume, i) => (
                                    <div key={resume.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-zinc-600 text-xs w-6">#{i + 1}</span>
                                            <div>
                                                <p className="text-white text-sm font-medium">{resume.user_name}</p>
                                                <p className="text-zinc-500 text-xs">{resume.company_name}</p>
                                            </div>
                                        </div>
                                        <span className="text-red-400 font-bold">{resume.views_count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-black border border-zinc-800 p-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                                <Award size={14} /> Top Contributors
                            </h3>
                            <div className="space-y-3">
                                {topContributors.map((user, i) => (
                                    <div key={user.email} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-zinc-600 text-xs w-6">#{i + 1}</span>
                                            <div>
                                                <p className="text-white text-sm font-medium">{user.name}</p>
                                                <p className="text-zinc-500 text-xs">{user.email}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-red-400 font-bold">{user.count} resumes</p>
                                            <p className="text-zinc-600 text-xs">{user.views} views</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-black border border-zinc-800 p-6 mb-8">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                            <TrendingUp size={14} /> Companies Represented
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {companyCounts.map((company) => (
                                <div
                                    key={company.name}
                                    className="bg-zinc-900 border border-zinc-800 px-3 py-2"
                                >
                                    <span className="text-white text-sm">{company.name}</span>
                                    <span className="text-red-400 text-xs ml-2 font-bold">{company.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-black border border-zinc-800 p-6">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">
                            Monthly Submissions
                        </h3>
                        <div className="flex items-end gap-2 h-32">
                            {monthlyStats.map((stat, i) => {
                                const maxCount = Math.max(...monthlyStats.map(s => s.count));
                                const height = (stat.count / maxCount) * 100;
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center">
                                        <div
                                            className="w-full bg-gradient-to-t from-red-600 to-pink-600 rounded-t"
                                            style={{ height: `${height}%` }}
                                        />
                                        <p className="text-zinc-500 text-[10px] mt-2 rotate-45 origin-left">{stat.month}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8 mt-8">
                        <div className="bg-black border border-cyan-900/30 p-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-500 mb-4 flex items-center gap-2">
                                <Rocket size={14} /> Projects Analytics
                            </h3>
                            <p className="text-3xl font-black text-white mb-4">{projectStats.total} <span className="text-zinc-500 text-sm font-normal">published projects</span></p>
                            <div className="mb-4">
                                <p className="text-zinc-500 text-xs mb-2">By Category:</p>
                                <div className="flex flex-wrap gap-2">
                                    {projectStats.byCategory.map((cat: any) => (
                                        <div key={cat.category} className="bg-zinc-900 border border-zinc-800 px-2 py-1">
                                            <span className="text-white text-xs">{cat.category}</span>
                                            <span className="text-cyan-400 text-xs ml-2 font-bold">{cat.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {projectStats.topProjects.length > 0 && (
                                <div>
                                    <p className="text-zinc-500 text-xs mb-2">Top Projects:</p>
                                    <div className="space-y-2">
                                        {projectStats.topProjects.map((p: any, i: number) => (
                                            <div key={p.id} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-zinc-600 text-xs">#{i + 1}</span>
                                                    <span className="text-white text-sm">{p.title}</span>
                                                </div>
                                                <span className="text-cyan-400 text-xs">{p.views_count} views</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-black border border-purple-900/30 p-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-purple-500 mb-4 flex items-center gap-2">
                                <BookOpen size={14} /> PyQ Database
                            </h3>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <p className="text-3xl font-black text-white">{pyqStats.papers}</p>
                                    <p className="text-zinc-500 text-xs">Papers</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-black text-white">{pyqStats.questions}</p>
                                    <p className="text-zinc-500 text-xs">Questions</p>
                                </div>
                            </div>
                            {pyqStats.bySubject.length > 0 && (
                                <div>
                                    <p className="text-zinc-500 text-xs mb-2">Papers by Subject:</p>
                                    <div className="space-y-2">
                                        {pyqStats.bySubject.map((s: any) => (
                                            <div key={s.subject} className="flex items-center justify-between">
                                                <span className="text-white text-sm truncate mr-2">{s.subject}</span>
                                                <span className="text-purple-400 text-xs font-bold shrink-0">{s.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8 mt-8">
                        <div className="bg-black border border-orange-900/30 p-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-orange-500 mb-4 flex items-center gap-2">
                                <GitFork size={14} /> Fork Analytics
                            </h3>
                            <p className="text-3xl font-black text-white mb-4">{forkStats.total} <span className="text-zinc-500 text-sm font-normal">total forks</span></p>
                            {forkStats.topForked.length > 0 && (
                                <div>
                                    <p className="text-zinc-500 text-xs mb-2">Most Forked Resumes:</p>
                                    <div className="space-y-2">
                                        {forkStats.topForked.map((r: any, i: number) => (
                                            <div key={r.id} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-zinc-600 text-xs">#{i + 1}</span>
                                                    <span className="text-white text-sm">{r.company_name} - {r.role_title}</span>
                                                </div>
                                                <span className="text-orange-400 text-xs font-bold">{r.fork_count} forks</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-black border border-pink-900/30 p-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-pink-500 mb-4 flex items-center gap-2">
                                <ArrowLeftRight size={14} /> Diff Comparisons
                            </h3>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <p className="text-3xl font-black text-white">{diffStats.total}</p>
                                    <p className="text-zinc-500 text-xs">Total Diffs</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-black text-white">{diffStats.positiveRate}%</p>
                                    <p className="text-zinc-500 text-xs">Positive Feedback</p>
                                </div>
                            </div>
                            <div className="bg-zinc-900 p-3">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-zinc-500">User Satisfaction</span>
                                    <span className="text-pink-400">{diffStats.positiveRate}%</span>
                                </div>
                                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-pink-600 to-red-500 rounded-full"
                                        style={{ width: `${diffStats.positiveRate}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
