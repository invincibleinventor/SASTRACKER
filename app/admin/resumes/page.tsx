"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import {
    ShieldCheck, Loader2, LayoutDashboard, FileText, Users,
    MessageSquare, BarChart3, Database, CheckCircle, XCircle,
    Clock, Eye, Search, Trash2, Edit2, ExternalLink, Filter, ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import type { Resume } from '@/utils/resumeTypes';

const supabase = createPagesBrowserClient();

const SASTRA_DOMAINS = ["sastra.ac.in", "sastra.edu"];

function isSastraEmail(email: string): boolean {
    return SASTRA_DOMAINS.some((d) => email.toLowerCase().trim().endsWith(d));
}

function ResumesManagementContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const statusFilter = searchParams.get('status') || 'all';

    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [resumes, setResumes] = useState<Resume[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [editingResume, setEditingResume] = useState<Resume | null>(null);
    const [editForm, setEditForm] = useState({ company_name: '', role_title: '', tips: '', remarks: '' });
    const [visiblecount, setVisiblecount] = useState(30);
    const itemsperpage = 30;

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                router.push('/resumes');
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
            await fetchResumes();
            setLoading(false);
        };

        init();
    }, [router]);

    const fetchResumes = async () => {
        const { data } = await supabase
            .from('resumes')
            .select('*')
            .order('created_at', { ascending: false });
        setResumes(data || []);
    };

    const filteredResumes = resumes.filter(r => {
        const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
        const matchesSearch =
            r.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.role_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.user_email.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const handleApprove = async (id: string) => {
        setActionLoading(id);
        await supabase.from('resumes').update({
            status: 'approved',
            approved_by: user?.id,
            approved_at: new Date().toISOString()
        }).eq('id', id);
        await fetchResumes();
        setActionLoading(null);
    };

    const handleReject = async (id: string) => {
        if (!confirm('Reject this resume?')) return;
        setActionLoading(id);
        await supabase.from('resumes').update({ status: 'rejected' }).eq('id', id);
        await fetchResumes();
        setActionLoading(null);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Permanently delete this resume? This cannot be undone.')) return;
        setActionLoading(id);
        await supabase.from('resumes').delete().eq('id', id);
        await fetchResumes();
        setActionLoading(null);
    };

    const handleEdit = (resume: Resume) => {
        setEditingResume(resume);
        setEditForm({
            company_name: resume.company_name,
            role_title: resume.role_title,
            tips: resume.tips || '',
            remarks: resume.remarks || ''
        });
    };

    const handleSaveEdit = async () => {
        if (!editingResume) return;
        setActionLoading(editingResume.id);
        await supabase.from('resumes').update({
            company_name: editForm.company_name,
            role_title: editForm.role_title,
            tips: editForm.tips || null,
            remarks: editForm.remarks || null
        }).eq('id', editingResume.id);
        await fetchResumes();
        setEditingResume(null);
        setActionLoading(null);
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
        { href: '/admin/resumes', icon: FileText, label: 'Resumes', active: true },
        { href: '/admin/users', icon: Users, label: 'Users' },
        { href: '/admin/pyqs', icon: Database, label: 'PyQs' },
        { href: '/admin/comments', icon: MessageSquare, label: 'Comments' },
        { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    ];

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
                                    ? 'bg-zinc-900 text-white border-l-2 border-green-500'
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
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Resume Management</h2>
                        <p className="text-zinc-500">Approve, edit, and manage all resumes</p>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-4 mb-6">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-3 text-zinc-500" size={16} />
                            <input
                                type="text"
                                placeholder="Search by name, email, company..."
                                className="w-full bg-zinc-900 border border-zinc-700 p-3 pl-10 text-white text-sm placeholder-zinc-500 focus:border-green-600 outline-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            {['all', 'pending', 'approved', 'rejected'].map((status) => (
                                <Link
                                    key={status}
                                    href={`/admin/resumes?status=${status}`}
                                    className={`px-4 py-2 text-xs font-bold uppercase ${statusFilter === status
                                        ? 'bg-green-600 text-white'
                                        : 'bg-zinc-900 text-zinc-400 border border-zinc-700 hover:text-white'
                                        }`}
                                >
                                    {status}
                                </Link>
                            ))}
                        </div>
                    </div>

                    <p className="text-zinc-500 text-sm mb-4">{filteredResumes.length} resumes</p>

                    <div className="space-y-3">
                        {filteredResumes.slice(0, visiblecount).map((resume) => (
                            <div key={resume.id} className="bg-black border border-zinc-800 p-4 hover:border-zinc-700">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <StatusBadge status={resume.status} />
                                            <span className="text-zinc-600 text-xs">
                                                {new Date(resume.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-white font-bold">{resume.user_name}</p>
                                        <p className="text-zinc-500 text-sm">{resume.user_email}</p>
                                        <p className="text-purple-400 text-sm mt-1">{resume.company_name} - {resume.role_title}</p>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-600">
                                            <span><Eye size={12} className="inline mr-1" />{resume.views_count}</span>
                                            <span>Votes: {resume.votes_count || 0}</span>
                                            <span>Comments: {resume.comments_count || 0}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <a
                                            href={resume.pdf_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white"
                                        >
                                            <ExternalLink size={14} />
                                        </a>
                                        <button
                                            onClick={() => handleEdit(resume)}
                                            className="p-2 bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        {resume.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => handleApprove(resume.id)}
                                                    disabled={actionLoading === resume.id}
                                                    className="px-3 py-2 bg-green-600 text-white text-xs font-bold uppercase hover:bg-green-700 disabled:opacity-50"
                                                >
                                                    {actionLoading === resume.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                                </button>
                                                <button
                                                    onClick={() => handleReject(resume.id)}
                                                    disabled={actionLoading === resume.id}
                                                    className="px-3 py-2 bg-red-600 text-white text-xs font-bold uppercase hover:bg-red-700 disabled:opacity-50"
                                                >
                                                    <XCircle size={14} />
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => handleDelete(resume.id)}
                                            disabled={actionLoading === resume.id}
                                            className="p-2 bg-zinc-900 border border-red-900/50 text-red-500 hover:bg-red-900/20"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {filteredResumes.length > visiblecount && (
                        <div className="text-center mt-6">
                            <button
                                onClick={() => setVisiblecount(prev => prev + itemsperpage)}
                                className="bg-zinc-900 border border-zinc-700 text-white px-6 py-2 text-sm font-bold uppercase hover:border-green-600 transition-colors flex items-center gap-2 mx-auto"
                            >
                                <ChevronDown size={16} />
                                Load More ({filteredResumes.length - visiblecount} remaining)
                            </button>
                        </div>
                    )}
                </main>
            </div>

            {editingResume && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6">
                    <div className="bg-zinc-900 border border-zinc-700 max-w-lg w-full p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Edit Resume</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-zinc-500 text-xs uppercase font-bold block mb-1">Company</label>
                                <input
                                    type="text"
                                    className="w-full bg-black border border-zinc-700 p-2 text-white text-sm"
                                    value={editForm.company_name}
                                    onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-zinc-500 text-xs uppercase font-bold block mb-1">Role</label>
                                <input
                                    type="text"
                                    className="w-full bg-black border border-zinc-700 p-2 text-white text-sm"
                                    value={editForm.role_title}
                                    onChange={(e) => setEditForm({ ...editForm, role_title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-zinc-500 text-xs uppercase font-bold block mb-1">Tips</label>
                                <textarea
                                    rows={2}
                                    className="w-full bg-black border border-zinc-700 p-2 text-white text-sm"
                                    value={editForm.tips}
                                    onChange={(e) => setEditForm({ ...editForm, tips: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-zinc-500 text-xs uppercase font-bold block mb-1">Remarks</label>
                                <textarea
                                    rows={2}
                                    className="w-full bg-black border border-zinc-700 p-2 text-white text-sm"
                                    value={editForm.remarks}
                                    onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleSaveEdit}
                                disabled={actionLoading === editingResume.id}
                                className="flex-1 bg-green-600 text-white py-2 font-bold text-sm uppercase hover:bg-green-700"
                            >
                                Save Changes
                            </button>
                            <button
                                onClick={() => setEditingResume(null)}
                                className="px-6 bg-zinc-800 text-white py-2 font-bold text-sm uppercase hover:bg-zinc-700"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        approved: 'bg-green-500/20 text-green-400 border-green-500/30',
        rejected: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return (
        <span className={`${styles[status]} border px-2 py-0.5 text-[10px] uppercase font-bold`}>
            {status}
        </span>
    );
};

export default function ResumesManagement() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-neutral-950 flex items-center justify-center"><Loader2 className="text-red-600 animate-spin" size={32} /></div>}>
            <ResumesManagementContent />
        </Suspense>
    );
}
