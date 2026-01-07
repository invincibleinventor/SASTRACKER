"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import {
    ShieldCheck, Loader2, LayoutDashboard, FileText, Users,
    MessageSquare, BarChart3, Database, Search, Ban, CheckCircle,
    Mail, Calendar, Eye, Trash2, UserX, UserCheck
} from 'lucide-react';
import Link from 'next/link';

const supabase = createPagesBrowserClient();

const SASTRA_DOMAINS = ["sastra.ac.in", "sastra.edu"];

function isSastraEmail(email: string): boolean {
    return SASTRA_DOMAINS.some((d) => email.toLowerCase().trim().endsWith(d));
}

interface UserData {
    id: string;
    email: string;
    created_at: string;
    last_sign_in_at: string;
    user_metadata: any;
}

interface BlockedUser {
    id: string;
    user_email: string;
    reason: string;
    blocked_at: string;
}

export default function UsersManagement() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
    const [userStats, setUserStats] = useState<any[]>([]);
    const [showBlockModal, setShowBlockModal] = useState(false);
    const [blockEmail, setBlockEmail] = useState('');
    const [blockReason, setBlockReason] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [admins, setAdmins] = useState<any[]>([]);
    const [newAdminEmail, setNewAdminEmail] = useState('');

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                router.push('/auth?redirect_to=/admin/users&admin=1');
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
            await fetchData();
            setLoading(false);
        };

        init();
    }, [router]);

    const fetchData = async () => {
        const [blockedRes, adminsRes, statsRes] = await Promise.all([
            supabase.from('blocked_users').select('*').order('blocked_at', { ascending: false }),
            supabase.from('admin_users').select('*'),
            supabase.from('resumes').select('user_email, user_name').then(res => {
                const grouped: Record<string, { email: string, name: string, count: number }> = {};
                (res.data || []).forEach(r => {
                    if (!grouped[r.user_email]) {
                        grouped[r.user_email] = { email: r.user_email, name: r.user_name, count: 0 };
                    }
                    grouped[r.user_email].count++;
                });
                return Object.values(grouped).sort((a, b) => b.count - a.count);
            })
        ]);

        setBlockedUsers(blockedRes.data || []);
        setAdmins(adminsRes.data || []);
        setUserStats(statsRes);
    };

    const handleBlock = async () => {
        if (!blockEmail.trim()) return;
        setActionLoading('block');

        await supabase.from('blocked_users').insert({
            user_email: blockEmail.toLowerCase().trim(),
            blocked_by: user?.id,
            reason: blockReason || null
        });

        await fetchData();
        setShowBlockModal(false);
        setBlockEmail('');
        setBlockReason('');
        setActionLoading(null);
    };

    const handleUnblock = async (id: string) => {
        if (!confirm('Unblock this user?')) return;
        setActionLoading(id);
        await supabase.from('blocked_users').delete().eq('id', id);
        await fetchData();
        setActionLoading(null);
    };

    const handleAddAdmin = async () => {
        if (!newAdminEmail.trim() || !isSastraEmail(newAdminEmail)) {
            alert('Admin must have a SASTRA email');
            return;
        }
        setActionLoading('admin');
        await supabase.from('admin_users').insert({ email: newAdminEmail.toLowerCase().trim() });
        await fetchData();
        setNewAdminEmail('');
        setActionLoading(null);
    };

    const handleRemoveAdmin = async (id: string, email: string) => {
        if (email === user?.email) {
            alert("You can't remove yourself as admin");
            return;
        }
        if (!confirm(`Remove ${email} as admin?`)) return;
        setActionLoading(id);
        await supabase.from('admin_users').delete().eq('id', id);
        await fetchData();
        setActionLoading(null);
    };

    const filteredStats = userStats.filter(u =>
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
        { href: '/admin/users', icon: Users, label: 'Users', active: true },
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
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">User Management</h2>
                        <p className="text-zinc-500">Manage users, admins, and blocked accounts</p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8 mb-8">
                        <div className="bg-black border border-zinc-800 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Admin Users</h3>
                                <span className="text-xs text-zinc-600">{admins.length} admins</span>
                            </div>

                            <div className="flex gap-2 mb-4">
                                <input
                                    type="email"
                                    placeholder="Add admin email (@sastra.ac.in)"
                                    className="flex-1 bg-zinc-900 border border-zinc-700 p-2 text-white text-sm"
                                    value={newAdminEmail}
                                    onChange={(e) => setNewAdminEmail(e.target.value)}
                                />
                                <button
                                    onClick={handleAddAdmin}
                                    disabled={actionLoading === 'admin'}
                                    className="px-4 bg-green-600 text-white text-xs font-bold uppercase"
                                >
                                    Add
                                </button>
                            </div>

                            <div className="space-y-2 max-h-48 overflow-auto">
                                {admins.map((admin) => (
                                    <div key={admin.id} className="flex items-center justify-between p-2 bg-zinc-900/50 border border-zinc-800">
                                        <span className="text-white text-sm font-mono">{admin.email}</span>
                                        <button
                                            onClick={() => handleRemoveAdmin(admin.id, admin.email)}
                                            className="text-red-500 hover:text-red-400"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-black border border-red-900/30 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-red-500">Blocked Users</h3>
                                <button
                                    onClick={() => setShowBlockModal(true)}
                                    className="px-3 py-1 bg-red-600 text-white text-xs font-bold uppercase"
                                >
                                    <Ban size={12} className="inline mr-1" /> Block User
                                </button>
                            </div>

                            <div className="space-y-2 max-h-48 overflow-auto">
                                {blockedUsers.length === 0 ? (
                                    <p className="text-zinc-600 text-sm">No blocked users</p>
                                ) : (
                                    blockedUsers.map((blocked) => (
                                        <div key={blocked.id} className="flex items-center justify-between p-2 bg-zinc-900/50 border border-zinc-800">
                                            <div>
                                                <p className="text-white text-sm font-mono">{blocked.user_email}</p>
                                                {blocked.reason && <p className="text-zinc-500 text-xs">{blocked.reason}</p>}
                                            </div>
                                            <button
                                                onClick={() => handleUnblock(blocked.id)}
                                                className="text-green-500 hover:text-green-400 text-xs font-bold uppercase"
                                            >
                                                <UserCheck size={14} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-black border border-zinc-800 p-6">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">Users by Resume Submissions</h3>

                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-2.5 text-zinc-500" size={16} />
                            <input
                                type="text"
                                placeholder="Search users..."
                                className="w-full bg-zinc-900 border border-zinc-700 p-2 pl-10 text-white text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2 max-h-96 overflow-auto">
                            {filteredStats.map((u, i) => (
                                <div key={u.email} className="flex items-center justify-between p-3 bg-zinc-900/30 border border-zinc-800">
                                    <div className="flex items-center gap-3">
                                        <span className="text-zinc-600 text-xs w-6">#{i + 1}</span>
                                        <div>
                                            <p className="text-white font-medium">{u.name}</p>
                                            <p className="text-zinc-500 text-xs">{u.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-purple-400 text-sm font-bold">{u.count} resumes</span>
                                        <button
                                            onClick={() => { setBlockEmail(u.email); setShowBlockModal(true); }}
                                            className="text-red-500/50 hover:text-red-500"
                                        >
                                            <UserX size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>

            {showBlockModal && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6">
                    <div className="bg-zinc-900 border border-zinc-700 max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Ban className="text-red-500" size={20} /> Block User
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-zinc-500 text-xs uppercase font-bold block mb-1">Email to Block</label>
                                <input
                                    type="email"
                                    className="w-full bg-black border border-zinc-700 p-2 text-white text-sm"
                                    value={blockEmail}
                                    onChange={(e) => setBlockEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-zinc-500 text-xs uppercase font-bold block mb-1">Reason (Optional)</label>
                                <input
                                    type="text"
                                    className="w-full bg-black border border-zinc-700 p-2 text-white text-sm"
                                    value={blockReason}
                                    onChange={(e) => setBlockReason(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleBlock}
                                disabled={actionLoading === 'block'}
                                className="flex-1 bg-red-600 text-white py-2 font-bold text-sm uppercase hover:bg-red-700"
                            >
                                Block User
                            </button>
                            <button
                                onClick={() => { setShowBlockModal(false); setBlockEmail(''); setBlockReason(''); }}
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
