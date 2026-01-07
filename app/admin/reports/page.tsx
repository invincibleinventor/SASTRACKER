"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import {
    ShieldCheck, Loader2, LayoutDashboard, FileText, Users,
    MessageSquare, BarChart3, Database, Flag, CheckCircle, XCircle, Eye, ExternalLink
} from 'lucide-react';
import Link from 'next/link';

const supabase = createPagesBrowserClient();

interface Report {
    id: string;
    created_at: string;
    reporter_email: string;
    content_type: string;
    content_id: string;
    reason: string;
    comment: string | null;
    status: string;
    reviewed_at: string | null;
    reviewed_by: string | null;
}

export default function ReportsDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState<Report[]>([]);
    const [filtertype, setFiltertype] = useState<string>('all');
    const [filterstatus, setFilterstatus] = useState<string>('pending');
    const [actionloading, setActionloading] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                router.push('/auth?redirect_to=/admin/reports&admin=1');
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

            await fetchReports();
            setLoading(false);
        };

        init();
    }, [router]);

    const fetchReports = async () => {
        const { data } = await supabase
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false });
        setReports(data || []);
    };

    const handleaction = async (reportid: string, action: 'reviewed' | 'dismissed' | 'action_taken') => {
        setActionloading(reportid);
        const { data: { session } } = await supabase.auth.getSession();

        await supabase.from('reports').update({
            status: action,
            reviewed_at: new Date().toISOString(),
            reviewed_by: session?.user?.email || 'admin'
        }).eq('id', reportid);

        await fetchReports();
        setActionloading(null);
    };

    const filteredreports = reports.filter(r => {
        const matchestype = filtertype === 'all' || r.content_type === filtertype;
        const matchesstatus = filterstatus === 'all' || r.status === filterstatus;
        return matchestype && matchesstatus;
    });

    const getcontentlink = (type: string, id: string) => {
        const links: Record<string, string> = {
            resume: `/resumes/${id}`,
            project: `/projects/${id}`,
            comment: '#',
            user: `/profile/${id}`,
            question: `/question/${id}`,
            paper: '#'
        };
        return links[type] || '#';
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
        { href: '/admin/reports', icon: Flag, label: 'Reports', active: true },
        { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    ];

    const statuscounts = {
        pending: reports.filter(r => r.status === 'pending').length,
        reviewed: reports.filter(r => r.status === 'reviewed').length,
        dismissed: reports.filter(r => r.status === 'dismissed').length,
        action_taken: reports.filter(r => r.status === 'action_taken').length
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-gray-100">
            <div className="flex">
                <aside className="w-64 min-h-screen bg-black border-r border-zinc-800 p-4 sticky top-0">
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
                                {item.label === 'Reports' && statuscounts.pending > 0 && (
                                    <span className="ml-auto bg-red-600 text-white text-[10px] px-1.5 py-0.5 font-bold">{statuscounts.pending}</span>
                                )}
                            </Link>
                        ))}
                    </nav>
                </aside>

                <main className="flex-1 p-8">
                    <div className="mb-8">
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Reports</h2>
                        <p className="text-zinc-500">Review user-submitted reports across all content</p>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-6">
                        <div className="bg-black border border-amber-900/30 p-4">
                            <p className="text-amber-400 text-2xl font-black">{statuscounts.pending}</p>
                            <p className="text-zinc-500 text-sm">Pending</p>
                        </div>
                        <div className="bg-black border border-blue-900/30 p-4">
                            <p className="text-blue-400 text-2xl font-black">{statuscounts.reviewed}</p>
                            <p className="text-zinc-500 text-sm">Reviewed</p>
                        </div>
                        <div className="bg-black border border-zinc-700 p-4">
                            <p className="text-zinc-400 text-2xl font-black">{statuscounts.dismissed}</p>
                            <p className="text-zinc-500 text-sm">Dismissed</p>
                        </div>
                        <div className="bg-black border border-green-900/30 p-4">
                            <p className="text-green-400 text-2xl font-black">{statuscounts.action_taken}</p>
                            <p className="text-zinc-500 text-sm">Action Taken</p>
                        </div>
                    </div>

                    <div className="flex gap-3 mb-6">
                        <select
                            value={filtertype}
                            onChange={(e) => setFiltertype(e.target.value)}
                            className="bg-zinc-900 border border-zinc-700 p-2 text-white text-sm"
                        >
                            <option value="all">All Types</option>
                            <option value="resume">Resumes</option>
                            <option value="project">Projects</option>
                            <option value="comment">Comments</option>
                            <option value="user">Users</option>
                            <option value="question">Questions</option>
                            <option value="paper">Papers</option>
                        </select>
                        <select
                            value={filterstatus}
                            onChange={(e) => setFilterstatus(e.target.value)}
                            className="bg-zinc-900 border border-zinc-700 p-2 text-white text-sm"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="dismissed">Dismissed</option>
                            <option value="action_taken">Action Taken</option>
                        </select>
                    </div>

                    <div className="space-y-3">
                        {filteredreports.length === 0 ? (
                            <p className="text-zinc-600 text-center py-12">No reports found</p>
                        ) : (
                            filteredreports.map((report) => (
                                <div key={report.id} className={`bg-black border p-4 ${report.status === 'pending' ? 'border-amber-900/50' : 'border-zinc-800'}`}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-zinc-900 text-zinc-400 border border-zinc-700">
                                                    {report.content_type}
                                                </span>
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 ${report.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                                                    report.status === 'action_taken' ? 'bg-green-500/20 text-green-400' :
                                                        report.status === 'dismissed' ? 'bg-zinc-500/20 text-zinc-400' :
                                                            'bg-blue-500/20 text-blue-400'
                                                    }`}>
                                                    {report.status.replace('_', ' ')}
                                                </span>
                                                <span className="text-zinc-600 text-xs">
                                                    {new Date(report.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-white font-medium">{report.reason}</p>
                                            {report.comment && (
                                                <p className="text-zinc-400 text-sm mt-1">"{report.comment}"</p>
                                            )}
                                            <p className="text-zinc-600 text-xs mt-2">Reported by: {report.reporter_email}</p>
                                        </div>

                                        <div className="flex items-center gap-2 ml-4">
                                            <Link
                                                href={getcontentlink(report.content_type, report.content_id)}
                                                target="_blank"
                                                className="p-2 bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white"
                                            >
                                                <ExternalLink size={14} />
                                            </Link>

                                            {report.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => handleaction(report.id, 'reviewed')}
                                                        disabled={actionloading === report.id}
                                                        className="p-2 bg-blue-600 text-white"
                                                        title="Mark Reviewed"
                                                    >
                                                        {actionloading === report.id ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleaction(report.id, 'action_taken')}
                                                        disabled={actionloading === report.id}
                                                        className="p-2 bg-green-600 text-white"
                                                        title="Action Taken"
                                                    >
                                                        <CheckCircle size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleaction(report.id, 'dismissed')}
                                                        disabled={actionloading === report.id}
                                                        className="p-2 bg-zinc-700 text-white"
                                                        title="Dismiss"
                                                    >
                                                        <XCircle size={14} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
