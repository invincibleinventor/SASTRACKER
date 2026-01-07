"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import {
    ShieldCheck, Loader2, LayoutDashboard, FileText, Users,
    MessageSquare, BarChart3, Database, Search, Trash2, CheckCircle, XCircle,
    Eye, Star, ExternalLink, Rocket, ChevronDown
} from 'lucide-react';
import Link from 'next/link';

const supabase = createPagesBrowserClient();

interface Project {
    id: string;
    created_at: string;
    user_name: string;
    user_email: string;
    title: string;
    tagline?: string;
    category: string;
    status: string;
    is_featured: boolean;
    views_count: number;
    likes_count: number;
    comments_count: number;
}

function ProjectsManagementContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const statusFilter = searchParams.get('status') || 'all';

    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<Project[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [visiblecount, setVisiblecount] = useState(30);
    const itemsperpage = 30;

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!session) {
                    if (event === 'SIGNED_OUT') {
                        router.push('/auth');
                    }
                    return;
                }

                const { data } = await supabase.from('admin_users').select('id').eq('email', session.user.email?.toLowerCase()).maybeSingle();
                if (!data) {
                    router.push('/projects');
                    return;
                }

                await fetchProjects();
                setLoading(false);
            }
        );

        supabase.auth.getSession();
        return () => subscription.unsubscribe();
    }, [router]);

    const fetchProjects = async () => {
        const { data } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });
        setProjects(data || []);
    };

    const handleApprove = async (id: string) => {
        setActionLoading(id);
        await supabase.from('projects').update({ status: 'published' }).eq('id', id);
        await fetchProjects();
        setActionLoading(null);
    };

    const handleReject = async (id: string) => {
        if (!confirm('Reject this project? It will be marked as rejected.')) return;
        setActionLoading(id);
        await supabase.from('projects').update({ status: 'rejected' }).eq('id', id);
        await fetchProjects();
        setActionLoading(null);
    };

    const handleFeature = async (id: string, featured: boolean) => {
        setActionLoading(id);
        await supabase.from('projects').update({
            is_featured: !featured,
            status: !featured ? 'featured' : 'published'
        }).eq('id', id);
        await fetchProjects();
        setActionLoading(null);
    };

    const handleArchive = async (id: string) => {
        if (!confirm('Archive this project?')) return;
        setActionLoading(id);
        await supabase.from('projects').update({ status: 'archived' }).eq('id', id);
        await fetchProjects();
        setActionLoading(null);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Permanently delete this project? This cannot be undone.')) return;
        setActionLoading(id);
        await supabase.from('projects').delete().eq('id', id);
        await fetchProjects();
        setActionLoading(null);
    };

    const filteredProjects = projects.filter(p => {
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.category.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <Loader2 className="text-cyan-600 animate-spin" size={32} />
            </div>
        );
    }

    const navItems = [
        { href: '/admin', icon: LayoutDashboard, label: 'Overview' },
        { href: '/admin/resumes', icon: FileText, label: 'Resumes' },
        { href: '/admin/projects', icon: Rocket, label: 'Projects', active: true },
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
                                    ? 'bg-zinc-900 text-white border-l-2 border-cyan-500'
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
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Project Management</h2>
                        <p className="text-zinc-500">Feature, archive, and manage projects</p>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                        {['all', 'pending', 'published', 'featured', 'archived', 'rejected'].map((status) => (
                            <Link
                                key={status}
                                href={`/admin/projects${status === 'all' ? '' : `?status=${status}`}`}
                                className={`px-3 py-1.5 text-xs font-bold uppercase ${statusFilter === status
                                    ? 'bg-cyan-600 text-white'
                                    : 'bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white'
                                    }`}
                            >
                                {status}
                            </Link>
                        ))}
                    </div>

                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-3 text-zinc-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            className="w-full bg-zinc-900 border border-zinc-700 p-3 pl-10 text-white text-sm placeholder-zinc-500 focus:border-cyan-600 outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <p className="text-zinc-500 text-sm mb-4">{filteredProjects.length} projects</p>

                    <div className="space-y-3">
                        {filteredProjects.slice(0, visiblecount).map((project) => (
                            <div key={project.id} className={`bg-black border p-4 hover:border-zinc-700 ${project.status === 'pending' ? 'border-amber-900/50' : 'border-zinc-800'}`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-cyan-500 text-[10px] uppercase font-bold">{project.category}</span>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 ${project.status === 'featured' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                project.status === 'published' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                                    project.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                        project.status === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                                            'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                                                }`}>
                                                {project.status}
                                            </span>
                                            {project.is_featured && (
                                                <Star size={14} className="text-amber-400 fill-current" />
                                            )}
                                        </div>
                                        <p className="text-white font-bold">{project.title}</p>
                                        <p className="text-zinc-500 text-sm">by {project.user_name} • {project.user_email}</p>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-600">
                                            <span><Eye size={12} className="inline mr-1" />{project.views_count}</span>
                                            <span>Likes: {project.likes_count}</span>
                                            <span>Comments: {project.comments_count}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {project.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => handleApprove(project.id)}
                                                    disabled={actionLoading === project.id}
                                                    className="px-3 py-2 bg-green-600 text-white text-xs font-bold uppercase hover:bg-green-500 disabled:opacity-50 flex items-center gap-1"
                                                >
                                                    <CheckCircle size={14} /> Approve
                                                </button>
                                                <button
                                                    onClick={() => handleReject(project.id)}
                                                    disabled={actionLoading === project.id}
                                                    className="px-3 py-2 bg-red-600 text-white text-xs font-bold uppercase hover:bg-red-500 disabled:opacity-50 flex items-center gap-1"
                                                >
                                                    <XCircle size={14} /> Reject
                                                </button>
                                            </>
                                        )}
                                        <Link
                                            href={`/projects/${project.id}`}
                                            className="p-2 bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white"
                                        >
                                            <ExternalLink size={14} />
                                        </Link>
                                        <button
                                            onClick={() => handleFeature(project.id, project.is_featured)}
                                            disabled={actionLoading === project.id || project.status === 'pending'}
                                            className={`p-2 border ${project.is_featured
                                                ? 'bg-amber-600 border-amber-600 text-white'
                                                : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-amber-400'
                                                } disabled:opacity-50`}
                                            title={project.is_featured ? 'Unfeature' : 'Feature'}
                                        >
                                            <Star size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleArchive(project.id)}
                                            disabled={actionLoading === project.id || project.status === 'archived'}
                                            className="px-3 py-2 bg-zinc-900 border border-zinc-700 text-zinc-400 text-xs font-bold uppercase hover:text-white disabled:opacity-50"
                                        >
                                            Archive
                                        </button>
                                        <button
                                            onClick={() => handleDelete(project.id)}
                                            disabled={actionLoading === project.id}
                                            className="p-2 bg-zinc-900 border border-red-900/50 text-red-500 hover:bg-red-900/20"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {filteredProjects.length > visiblecount && (
                        <div className="text-center mt-6">
                            <button
                                onClick={() => setVisiblecount(prev => prev + itemsperpage)}
                                className="bg-zinc-900 border border-zinc-700 text-white px-6 py-2 text-sm font-bold uppercase hover:border-cyan-600 transition-colors flex items-center gap-2 mx-auto"
                            >
                                <ChevronDown size={16} />
                                Load More ({filteredProjects.length - visiblecount} remaining)
                            </button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default function ProjectsManagement() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-neutral-950 flex items-center justify-center"><Loader2 className="text-cyan-600 animate-spin" size={32} /></div>}>
            <ProjectsManagementContent />
        </Suspense>
    );
}
