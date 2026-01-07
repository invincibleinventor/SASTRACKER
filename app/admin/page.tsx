"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import {
    ShieldCheck, Loader2, LayoutDashboard, FileText, Users,
    MessageSquare, BarChart3, Database, CheckCircle, XCircle,
    Clock, TrendingUp, Eye, AlertTriangle, Menu, X, Rocket
} from 'lucide-react';
import Link from 'next/link';

const supabase = createPagesBrowserClient();

interface Stats {
    totalresumes: number;
    pendingresumes: number;
    approvedresumes: number;
    rejectedresumes: number;
    totalprojects: number;
    pendingprojects: number;
    publishedprojects: number;
    totalcomments: number;
    totalvotes: number;
    blockedusers: number;
    totalpapers: number;
    totalquestions: number;
}

export default function AdminDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Stats | null>(null);
    const [recentresumes, setRecentresumes] = useState<any[]>([]);
    const [recentprojects, setRecentprojects] = useState<any[]>([]);
    const [recentcomments, setRecentcomments] = useState<any[]>([]);
    const [sidebaropen, setSidebaropen] = useState(false);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!session) {
                    if (event === 'SIGNED_OUT') {
                        router.push('/auth?redirect_to=/admin&admin=1');
                    }
                    return;
                }

                const email = session.user.email?.toLowerCase() || '';
                const { data: admincheck } = await supabase
                    .from('admin_users')
                    .select('id')
                    .eq('email', email)
                    .maybeSingle();

                if (!admincheck) {
                    router.push('/resumes');
                    return;
                }

                setUser(session.user);
                await fetchstats();
                await fetchrecentactivity();
                setLoading(false);
            }
        );

        supabase.auth.getSession();

        return () => subscription.unsubscribe();
    }, [router]);

    const fetchstats = async () => {
        const [resumes, projects, comments, votes, blocked, papers, questions] = await Promise.all([
            supabase.from('resumes').select('status'),
            supabase.from('projects').select('status'),
            supabase.from('resume_comments').select('id', { count: 'exact', head: true }),
            supabase.from('resume_votes').select('id', { count: 'exact', head: true }),
            supabase.from('blocked_users').select('id', { count: 'exact', head: true }),
            supabase.from('papers').select('id', { count: 'exact', head: true }),
            supabase.from('questions').select('id', { count: 'exact', head: true })
        ]);

        const resumedata = resumes.data || [];
        const projectdata = projects.data || [];
        setStats({
            totalresumes: resumedata.length,
            pendingresumes: resumedata.filter(r => r.status === 'pending').length,
            approvedresumes: resumedata.filter(r => r.status === 'approved').length,
            rejectedresumes: resumedata.filter(r => r.status === 'rejected').length,
            totalprojects: projectdata.length,
            pendingprojects: projectdata.filter(p => p.status === 'pending').length,
            publishedprojects: projectdata.filter(p => p.status === 'published' || p.status === 'featured').length,
            totalcomments: comments.count || 0,
            totalvotes: votes.count || 0,
            blockedusers: blocked.count || 0,
            totalpapers: papers.count || 0,
            totalquestions: questions.count || 0
        });
    };

    const fetchrecentactivity = async () => {
        const [resumesres, projectsres, commentsres] = await Promise.all([
            supabase.from('resumes').select('*').order('created_at', { ascending: false }).limit(5),
            supabase.from('projects').select('*').order('created_at', { ascending: false }).limit(5),
            supabase.from('resume_comments').select('*').order('created_at', { ascending: false }).limit(5)
        ]);

        setRecentresumes(resumesres.data || []);
        setRecentprojects(projectsres.data || []);
        setRecentcomments(commentsres.data || []);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <Loader2 className="text-red-600 animate-spin" size={32} />
            </div>
        );
    }

    const navitems = [
        { href: '/admin', icon: LayoutDashboard, label: 'Overview', active: true },
        { href: '/admin/moderation', icon: ShieldCheck, label: 'Moderation' },
        { href: '/admin/resumes', icon: FileText, label: 'Resumes' },
        { href: '/admin/projects', icon: Rocket, label: 'Projects' },
        { href: '/admin/users', icon: Users, label: 'Users' },
        { href: '/admin/pyqs', icon: Database, label: 'PyQs' },
        { href: '/admin/comments', icon: MessageSquare, label: 'Comments' },
        { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    ];

    return (
        <div className="min-h-screen bg-neutral-950 text-gray-100">
            <button
                onClick={() => setSidebaropen(!sidebaropen)}
                className="lg:hidden fixed top-20 left-4 z-50 bg-zinc-900 border border-zinc-700 p-2"
            >
                {sidebaropen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="flex">
                <aside className={`
                    fixed lg:sticky top-0 left-0 z-40
                    w-64 min-h-screen bg-black border-r border-zinc-800 p-4
                    transform transition-transform duration-200
                    ${sidebaropen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}>
                    <div className="flex items-center gap-3 mb-8 p-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center">
                            <ShieldCheck size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-white uppercase tracking-tight">Admin</h1>
                            <p className="text-zinc-500 text-[10px] font-mono">SASTRACKER</p>
                        </div>
                    </div>

                    <nav className="space-y-1">
                        {navitems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebaropen(false)}
                                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors ${item.active
                                    ? 'bg-zinc-900 text-white border-l-2 border-green-500'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
                                    }`}
                            >
                                <item.icon size={16} />
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="absolute bottom-4 left-4 right-4">
                        <div className="border border-zinc-800 p-3 text-xs">
                            <p className="text-zinc-500 mb-1">Logged in as</p>
                            <p className="text-white font-mono truncate">{user?.email}</p>
                        </div>
                    </div>
                </aside>

                {sidebaropen && (
                    <div
                        className="lg:hidden fixed inset-0 bg-black/50 z-30"
                        onClick={() => setSidebaropen(false)}
                    />
                )}

                <main className="flex-1 p-4 lg:p-8 w-full">
                    <div className="mb-8">
                        <h2 className="text-2xl lg:text-3xl font-black text-white uppercase tracking-tighter">Dashboard</h2>
                        <p className="text-zinc-500 text-sm">Platform overview and quick actions</p>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
                        <StatCard
                            label="Total Resumes"
                            value={stats?.totalresumes || 0}
                            icon={<FileText size={18} />}
                            color="text-white"
                        />
                        <StatCard
                            label="Pending"
                            value={stats?.pendingresumes || 0}
                            icon={<Clock size={18} />}
                            color="text-amber-400"
                            highlight
                        />
                        <StatCard
                            label="Approved"
                            value={stats?.approvedresumes || 0}
                            icon={<CheckCircle size={18} />}
                            color="text-green-400"
                        />
                        <StatCard
                            label="Rejected"
                            value={stats?.rejectedresumes || 0}
                            icon={<XCircle size={18} />}
                            color="text-red-400"
                        />
                    </div>

                    <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 lg:gap-4 mb-6 lg:mb-8">
                        <StatCard
                            label="Projects"
                            value={stats?.totalprojects || 0}
                            icon={<Rocket size={14} />}
                            color="text-cyan-400"
                            small
                        />
                        <StatCard
                            label="Comments"
                            value={stats?.totalcomments || 0}
                            icon={<MessageSquare size={14} />}
                            color="text-blue-400"
                            small
                        />
                        <StatCard
                            label="Votes"
                            value={stats?.totalvotes || 0}
                            icon={<TrendingUp size={14} />}
                            color="text-purple-400"
                            small
                        />
                        <StatCard
                            label="Blocked"
                            value={stats?.blockedusers || 0}
                            icon={<AlertTriangle size={14} />}
                            color="text-red-400"
                            small
                        />
                        <StatCard
                            label="Papers"
                            value={stats?.totalpapers || 0}
                            icon={<Database size={14} />}
                            color="text-cyan-400"
                            small
                        />
                        <StatCard
                            label="Questions"
                            value={stats?.totalquestions || 0}
                            icon={<Eye size={14} />}
                            color="text-pink-400"
                            small
                        />
                    </div>

                    {(stats?.pendingresumes || 0) > 0 && (
                        <div className="bg-amber-500/10 border border-amber-500/30 p-3 lg:p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <Clock size={20} className="text-amber-500 shrink-0" />
                                <p className="text-amber-200 text-sm">
                                    <span className="font-bold">{stats?.pendingresumes}</span> resumes pending approval
                                </p>
                            </div>
                            <Link
                                href="/admin/resumes?status=pending"
                                className="bg-amber-500 text-black px-4 py-2 text-xs font-bold uppercase hover:bg-amber-400 w-full sm:w-auto text-center"
                            >
                                Review Now
                            </Link>
                        </div>
                    )}

                    {(stats?.pendingprojects || 0) > 0 && (
                        <div className="bg-cyan-500/10 border border-cyan-500/30 p-3 lg:p-4 mb-6 lg:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <Rocket size={20} className="text-cyan-500 shrink-0" />
                                <p className="text-cyan-200 text-sm">
                                    <span className="font-bold">{stats?.pendingprojects}</span> projects pending approval
                                </p>
                            </div>
                            <Link
                                href="/admin/projects?status=pending"
                                className="bg-cyan-500 text-black px-4 py-2 text-xs font-bold uppercase hover:bg-cyan-400 w-full sm:w-auto text-center"
                            >
                                Review Projects
                            </Link>
                        </div>
                    )}

                    <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
                        <div className="bg-black border border-zinc-800 p-4 lg:p-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">Recent Resumes</h3>
                            <div className="space-y-3">
                                {recentresumes.length === 0 ? (
                                    <p className="text-zinc-600 text-sm">No resumes yet</p>
                                ) : (
                                    recentresumes.map((resume) => (
                                        <div key={resume.id} className="flex items-center justify-between border-b border-zinc-900 pb-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-white font-medium text-sm truncate">{resume.user_name}</p>
                                                <p className="text-zinc-500 text-xs truncate">{resume.company_name} - {resume.role_title}</p>
                                            </div>
                                            <StatusBadge status={resume.status} />
                                        </div>
                                    ))
                                )}
                            </div>
                            <Link href="/admin/resumes" className="text-zinc-500 hover:text-white text-xs mt-4 inline-block">
                                View all →
                            </Link>
                        </div>

                        <div className="bg-black border border-zinc-800 p-4 lg:p-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">Recent Projects</h3>
                            <div className="space-y-3">
                                {recentprojects.length === 0 ? (
                                    <p className="text-zinc-600 text-sm">No projects yet</p>
                                ) : (
                                    recentprojects.map((project) => (
                                        <div key={project.id} className="flex items-center justify-between border-b border-zinc-900 pb-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-white font-medium text-sm truncate">{project.title}</p>
                                                <p className="text-zinc-500 text-xs truncate">{project.user_name} • {project.category}</p>
                                            </div>
                                            <StatusBadge status={project.status} />
                                        </div>
                                    ))
                                )}
                            </div>
                            <Link href="/admin/projects" className="text-zinc-500 hover:text-white text-xs mt-4 inline-block">
                                View all →
                            </Link>
                        </div>

                        <div className="bg-black border border-zinc-800 p-4 lg:p-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">Recent Comments</h3>
                            <div className="space-y-3">
                                {recentcomments.length === 0 ? (
                                    <p className="text-zinc-600 text-sm">No comments yet</p>
                                ) : (
                                    recentcomments.map((comment) => (
                                        <div key={comment.id} className="border-b border-zinc-900 pb-3">
                                            <p className="text-white text-sm line-clamp-2">"{comment.content}"</p>
                                            <p className="text-zinc-500 text-xs mt-1">by {comment.user_name}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                            <Link href="/admin/comments" className="text-zinc-500 hover:text-white text-xs mt-4 inline-block">
                                View all →
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 lg:gap-4 mt-6 lg:mt-8">
                        <QuickAction href="/admin/resumes?status=pending" label="Review Resumes" icon={<Clock size={16} />} />
                        <QuickAction href="/admin/projects?status=pending" label="Review Projects" icon={<Rocket size={16} />} />
                        <QuickAction href="/admin/users" label="Manage Users" icon={<Users size={16} />} />
                        <QuickAction href="/admin/pyqs" label="Edit PyQs" icon={<Database size={16} />} />
                        <QuickAction href="/admin/analytics" label="View Analytics" icon={<BarChart3 size={16} />} />
                    </div>
                </main>
            </div>
        </div>
    );
}

const StatCard = ({ label, value, icon, color, highlight, small }: any) => (
    <div className={`bg-black border ${highlight ? 'border-amber-900/50' : 'border-zinc-800'} p-3 lg:p-4`}>
        <div className={`${color} mb-2`}>{icon}</div>
        <p className={`${small ? 'text-xl lg:text-2xl' : 'text-2xl lg:text-3xl'} font-black text-white`}>{value}</p>
        <p className="text-zinc-500 text-[10px] lg:text-xs uppercase font-bold truncate">{label}</p>
    </div>
);

const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        approved: 'bg-green-500/20 text-green-400 border-green-500/30',
        rejected: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return (
        <span className={`${styles[status]} border px-2 py-0.5 text-[10px] uppercase font-bold shrink-0`}>
            {status}
        </span>
    );
};

const QuickAction = ({ href, label, icon }: any) => (
    <Link
        href={href}
        className="border border-zinc-800 bg-zinc-900/30 p-3 lg:p-4 text-center hover:border-green-900/50 transition-colors"
    >
        <div className="text-zinc-400 mb-2 flex justify-center">{icon}</div>
        <p className="text-white text-[10px] lg:text-xs font-bold uppercase">{label}</p>
    </Link>
);
