"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import {
    ShieldCheck, Loader2, LayoutDashboard, FileText, Users,
    MessageSquare, BarChart3, Database, Search, Trash2, Eye, ExternalLink
} from 'lucide-react';
import Link from 'next/link';

const supabase = createPagesBrowserClient();

interface Comment {
    id: string;
    resume_id: string;
    user_email: string;
    user_name: string;
    content: string;
    created_at: string;
    is_deleted: boolean;
}

export default function CommentsModeration() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [comments, setComments] = useState<Comment[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showDeleted, setShowDeleted] = useState(false);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                router.push('/auth?redirect_to=/admin/comments&admin=1');
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

            await fetchComments();
            setLoading(false);
        };

        init();
    }, [router]);

    const fetchComments = async () => {
        const { data } = await supabase
            .from('resume_comments')
            .select('*')
            .order('created_at', { ascending: false });
        setComments(data || []);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this comment?')) return;
        setActionLoading(id);
        await supabase.from('resume_comments').update({ is_deleted: true }).eq('id', id);
        await fetchComments();
        setActionLoading(null);
    };

    const handleRestore = async (id: string) => {
        setActionLoading(id);
        await supabase.from('resume_comments').update({ is_deleted: false }).eq('id', id);
        await fetchComments();
        setActionLoading(null);
    };

    const handlePermanentDelete = async (id: string) => {
        if (!confirm('Permanently delete this comment? This cannot be undone.')) return;
        setActionLoading(id);
        await supabase.from('resume_comments').delete().eq('id', id);
        await fetchComments();
        setActionLoading(null);
    };

    const filteredComments = comments.filter(c => {
        const matchesSearch =
            c.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.user_email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDeleted = showDeleted ? c.is_deleted : !c.is_deleted;
        return matchesSearch && matchesDeleted;
    });

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
        { href: '/admin/comments', icon: MessageSquare, label: 'Comments', active: true },
        { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    ];

    const activeCount = comments.filter(c => !c.is_deleted).length;
    const deletedCount = comments.filter(c => c.is_deleted).length;

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
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Comments Moderation</h2>
                        <p className="text-zinc-500">Review and moderate resume comments</p>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-4 mb-6">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-3 text-zinc-500" size={16} />
                            <input
                                type="text"
                                placeholder="Search comments..."
                                className="w-full bg-zinc-900 border border-zinc-700 p-3 pl-10 text-white text-sm placeholder-zinc-500 focus:border-green-600 outline-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowDeleted(false)}
                                className={`px-4 py-2 text-xs font-bold uppercase ${!showDeleted ? 'bg-green-600 text-white' : 'bg-zinc-900 text-zinc-400 border border-zinc-700'
                                    }`}
                            >
                                Active ({activeCount})
                            </button>
                            <button
                                onClick={() => setShowDeleted(true)}
                                className={`px-4 py-2 text-xs font-bold uppercase ${showDeleted ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-400 border border-zinc-700'
                                    }`}
                            >
                                Deleted ({deletedCount})
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {filteredComments.length === 0 ? (
                            <p className="text-zinc-600 text-center py-12">No comments found</p>
                        ) : (
                            filteredComments.map((comment) => (
                                <div
                                    key={comment.id}
                                    className={`bg-black border p-4 ${comment.is_deleted ? 'border-red-900/30 opacity-60' : 'border-zinc-800'}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <p className="text-white font-medium">{comment.user_name}</p>
                                                <span className="text-zinc-600 text-xs">{comment.user_email}</span>
                                                <span className="text-zinc-700 text-xs">
                                                    {new Date(comment.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-zinc-300">{comment.content}</p>
                                        </div>

                                        <div className="flex items-center gap-2 ml-4">
                                            <Link
                                                href={`/resumes/${comment.resume_id}`}
                                                className="p-2 bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white"
                                            >
                                                <ExternalLink size={14} />
                                            </Link>

                                            {comment.is_deleted ? (
                                                <>
                                                    <button
                                                        onClick={() => handleRestore(comment.id)}
                                                        disabled={actionLoading === comment.id}
                                                        className="px-3 py-2 bg-green-600 text-white text-xs font-bold uppercase"
                                                    >
                                                        Restore
                                                    </button>
                                                    <button
                                                        onClick={() => handlePermanentDelete(comment.id)}
                                                        disabled={actionLoading === comment.id}
                                                        className="p-2 bg-zinc-900 border border-red-900/50 text-red-500"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => handleDelete(comment.id)}
                                                    disabled={actionLoading === comment.id}
                                                    className="p-2 bg-zinc-900 border border-red-900/50 text-red-500 hover:bg-red-900/20"
                                                >
                                                    {actionLoading === comment.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                </button>
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
