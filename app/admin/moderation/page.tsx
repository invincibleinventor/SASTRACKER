"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import {
    ShieldCheck, Loader2, FileText, Rocket, MessageSquare,
    CheckCircle, XCircle, Eye, Building2, Clock, User, Trash2
} from 'lucide-react';
import Link from 'next/link';

const supabase = createPagesBrowserClient();

export default function ModerationPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'resumes' | 'projects' | 'comments'>('resumes');
    const [pendingresumes, setPendingresumes] = useState<any[]>([]);
    const [pendingprojects, setPendingprojects] = useState<any[]>([]);
    const [flaggedcomments, setFlaggedcomments] = useState<any[]>([]);
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/auth?redirect_to=/admin/moderation&admin=1');
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

            await fetchcontent();
            setLoading(false);
        };

        init();
    }, [router]);

    const fetchcontent = async () => {
        const [resumes, projects, comments] = await Promise.all([
            supabase.from('resumes').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
            supabase.from('projects').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
            supabase.from('resume_comments').select('*, resumes(company_name, role_title)').eq('is_deleted', false).order('created_at', { ascending: false }).limit(50)
        ]);

        setPendingresumes(resumes.data || []);
        setPendingprojects(projects.data || []);
        setFlaggedcomments(comments.data || []);
    };

    const handleresumeaction = async (id: string, action: 'approved' | 'rejected') => {
        setProcessing(id);
        await supabase.from('resumes').update({ status: action }).eq('id', id);
        setPendingresumes(prev => prev.filter(r => r.id !== id));
        setProcessing(null);
    };

    const handleprojectaction = async (id: string, action: 'published' | 'rejected') => {
        setProcessing(id);
        await supabase.from('projects').update({ status: action }).eq('id', id);
        setPendingprojects(prev => prev.filter(p => p.id !== id));
        setProcessing(null);
    };

    const handledeletecomment = async (id: string) => {
        setProcessing(id);
        await supabase.from('resume_comments').update({ is_deleted: true }).eq('id', id);
        setFlaggedcomments(prev => prev.filter(c => c.id !== id));
        setProcessing(null);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <Loader2 className="text-red-600 animate-spin" size={32} />
            </div>
        );
    }

    const tabs = [
        { id: 'resumes' as const, label: 'Resumes', count: pendingresumes.length, icon: FileText },
        { id: 'projects' as const, label: 'Projects', count: pendingprojects.length, icon: Rocket },
        { id: 'comments' as const, label: 'Comments', count: flaggedcomments.length, icon: MessageSquare }
    ];

    return (
        <div className="min-h-screen bg-neutral-950 text-gray-100 py-8">
            <div className="max-w-6xl mx-auto px-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                            <ShieldCheck className="text-red-500" size={28} />
                            Content Moderation
                        </h1>
                        <p className="text-zinc-500">Review and approve all pending content</p>
                    </div>
                    <Link href="/admin" className="text-zinc-500 hover:text-white text-sm">← Back to Dashboard</Link>
                </div>

                <div className="flex gap-4 mb-6">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 px-4 py-2 font-bold text-sm uppercase ${tab === t.id
                                ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white'
                                : 'bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white'
                                }`}
                        >
                            <t.icon size={16} />
                            {t.label}
                            {t.count > 0 && (
                                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{t.count}</span>
                            )}
                        </button>
                    ))}
                </div>

                {tab === 'resumes' && (
                    <div className="space-y-4">
                        {pendingresumes.length === 0 ? (
                            <div className="text-center py-12 bg-black border border-zinc-800">
                                <CheckCircle className="text-green-500 mx-auto mb-2" size={32} />
                                <p className="text-zinc-500">All resumes reviewed!</p>
                            </div>
                        ) : (
                            pendingresumes.map(resume => (
                                <div key={resume.id} className="bg-black border border-zinc-800 p-4 flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="text-white font-bold">{resume.role_title}</p>
                                        <p className="text-red-400 text-sm flex items-center gap-1">
                                            <Building2 size={12} /> {resume.company_name}
                                        </p>
                                        <p className="text-zinc-600 text-xs flex items-center gap-3 mt-1">
                                            <span className="flex items-center gap-1"><User size={10} /> {resume.user_name}</span>
                                            <span className="flex items-center gap-1"><Clock size={10} /> {new Date(resume.created_at).toLocaleDateString()}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <a href={resume.pdf_url} target="_blank" className="p-2 bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white">
                                            <Eye size={16} />
                                        </a>
                                        <button
                                            onClick={() => handleresumeaction(resume.id, 'approved')}
                                            disabled={processing === resume.id}
                                            className="p-2 bg-green-900/30 border border-green-900 text-green-400 hover:bg-green-900/50"
                                        >
                                            <CheckCircle size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleresumeaction(resume.id, 'rejected')}
                                            disabled={processing === resume.id}
                                            className="p-2 bg-red-900/30 border border-red-900 text-red-400 hover:bg-red-900/50"
                                        >
                                            <XCircle size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {tab === 'projects' && (
                    <div className="space-y-4">
                        {pendingprojects.length === 0 ? (
                            <div className="text-center py-12 bg-black border border-zinc-800">
                                <CheckCircle className="text-green-500 mx-auto mb-2" size={32} />
                                <p className="text-zinc-500">All projects reviewed!</p>
                            </div>
                        ) : (
                            pendingprojects.map(project => (
                                <div key={project.id} className="bg-black border border-zinc-800 p-4 flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="text-white font-bold">{project.title}</p>
                                        <p className="text-zinc-500 text-sm line-clamp-2">{project.description}</p>
                                        <p className="text-zinc-600 text-xs mt-1">
                                            by {project.user_name} • {new Date(project.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {project.demo_url && (
                                            <a href={project.demo_url} target="_blank" className="p-2 bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white">
                                                <Eye size={16} />
                                            </a>
                                        )}
                                        <button
                                            onClick={() => handleprojectaction(project.id, 'published')}
                                            disabled={processing === project.id}
                                            className="p-2 bg-green-900/30 border border-green-900 text-green-400 hover:bg-green-900/50"
                                        >
                                            <CheckCircle size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleprojectaction(project.id, 'rejected')}
                                            disabled={processing === project.id}
                                            className="p-2 bg-red-900/30 border border-red-900 text-red-400 hover:bg-red-900/50"
                                        >
                                            <XCircle size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {tab === 'comments' && (
                    <div className="space-y-4">
                        {flaggedcomments.length === 0 ? (
                            <div className="text-center py-12 bg-black border border-zinc-800">
                                <CheckCircle className="text-green-500 mx-auto mb-2" size={32} />
                                <p className="text-zinc-500">No comments to review</p>
                            </div>
                        ) : (
                            flaggedcomments.map(comment => (
                                <div key={comment.id} className="bg-black border border-zinc-800 p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <p className="text-white">{comment.content}</p>
                                            <p className="text-zinc-600 text-xs mt-2">
                                                by {comment.user_name} on {comment.resumes?.company_name} - {comment.resumes?.role_title}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handledeletecomment(comment.id)}
                                            disabled={processing === comment.id}
                                            className="p-2 bg-red-900/30 border border-red-900 text-red-400 hover:bg-red-900/50"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
