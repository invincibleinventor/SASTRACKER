"use client";

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import {
    ArrowLeft, ExternalLink, Github, Play, Eye, Heart,
    MessageSquare, Send, Trash2, Loader2, User, Share2,
    Code, Calendar, Users, ChevronLeft, ChevronRight, Edit2, Flag, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import ReportModal from '@/components/ReportModal';

const supabase = createPagesBrowserClient();

interface Project {
    id: string;
    created_at: string;
    user_id: string;
    user_name: string;
    user_email: string;
    user_avatar?: string;
    title: string;
    tagline?: string;
    description: string;
    tech_stack: string[];
    tags: string[];
    live_url?: string;
    github_url?: string;
    demo_video_url?: string;
    thumbnail_url?: string;
    images: string[];
    views_count: number;
    likes_count: number;
    comments_count: number;
    category: string;
    status?: string;
}

interface Comment {
    id: string;
    user_name: string;
    user_avatar?: string;
    content: string;
    created_at: string;
    user_id: string;
}

interface Collaborator {
    id: string;
    user_name: string;
    user_email: string;
    role?: string;
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [user, setUser] = useState<any>(null);
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [userLiked, setUserLiked] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [newComment, setNewComment] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    const [isOwner, setIsOwner] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showVideo, setShowVideo] = useState(false);
    const [showreport, setShowreport] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [reportingcommentid, setReportingcommentid] = useState<string | null>(null);

    useEffect(() => {
        fetchProject();
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });
    }, [id]);

    useEffect(() => {
        if (user && project) {
            setIsOwner(user.id === project.user_id);
            fetchUserLike();
        }
    }, [user, project]);

    const fetchProject = async () => {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            router.push('/projects');
            return;
        }

        setProject(data);
        await supabase.from('projects').update({ views_count: (data.views_count || 0) + 1 }).eq('id', id);
        await fetchComments();
        await fetchCollaborators();
        setLoading(false);
    };

    const fetchUserLike = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('project_likes')
            .select('id')
            .eq('project_id', id)
            .eq('user_id', user.id)
            .single();
        setUserLiked(!!data);
    };

    const fetchComments = async () => {
        const { data } = await supabase
            .from('project_comments')
            .select('*')
            .eq('project_id', id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });
        setComments(data || []);
    };

    const fetchCollaborators = async () => {
        const { data } = await supabase
            .from('project_collaborators')
            .select('*')
            .eq('project_id', id);
        setCollaborators(data || []);
    };

    const handleLike = async () => {
        if (!user) {
            router.push('/auth?redirect_to=/projects/' + id + '&public=1');
            return;
        }

        if (userLiked) {
            await supabase.from('project_likes').delete().eq('project_id', id).eq('user_id', user.id);
            setUserLiked(false);
            setProject(prev => prev ? { ...prev, likes_count: prev.likes_count - 1 } : prev);
        } else {
            await supabase.from('project_likes').insert({ project_id: id, user_id: user.id });
            setUserLiked(true);
            setProject(prev => prev ? { ...prev, likes_count: prev.likes_count + 1 } : prev);
        }
    };

    const handleComment = async () => {
        if (!user || !newComment.trim()) return;

        setSubmittingComment(true);
        await supabase.from('project_comments').insert({
            project_id: id,
            user_id: user.id,
            user_email: user.email,
            user_name: user.user_metadata?.full_name || user.email?.split('@')[0],
            user_avatar: user.user_metadata?.avatar_url,
            content: newComment.trim()
        });

        setNewComment('');
        await fetchComments();
        setProject(prev => prev ? { ...prev, comments_count: prev.comments_count + 1 } : prev);
        setSubmittingComment(false);
    };

    const handleDeleteComment = async (commentId: string) => {
        await supabase.from('project_comments').update({ is_deleted: true }).eq('id', commentId);
        await fetchComments();
        setProject(prev => prev ? { ...prev, comments_count: prev.comments_count - 1 } : prev);
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({ title: project?.title, url: window.location.href });
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied!');
        }
    };

    const handledelete = async () => {
        if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return;
        setDeleting(true);
        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (error) {
            alert(`Failed to delete: ${error.message}`);
            setDeleting(false);
            return;
        }
        router.push('/projects');
    };

    if (loading || !project) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <Loader2 className="text-red-600 animate-spin" size={32} />
            </div>
        );
    }

    const allImages = [project.thumbnail_url, ...(project.images || [])].filter(Boolean) as string[];

    return (
        <div className="min-h-screen bg-neutral-950 text-gray-100">
            <div className="max-w-6xl mx-auto p-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center text-zinc-500 hover:text-red-500 mb-6 transition-colors"
                >
                    <ArrowLeft size={20} className="mr-2" /> Back
                </button>

                <ReportModal
                    isopen={showreport}
                    onclose={() => setShowreport(false)}
                    contenttype="project"
                    contentid={id}
                />

                {reportingcommentid && (
                    <ReportModal
                        isopen={true}
                        onclose={() => setReportingcommentid(null)}
                        contenttype="comment"
                        contentid={reportingcommentid}
                    />
                )}

                {project.status === 'pending' && (
                    <div className="bg-amber-500/10 border border-amber-500/30 p-4 mb-6 flex items-center gap-3">
                        <AlertTriangle size={20} className="text-amber-500" />
                        <div>
                            <p className="text-amber-400 font-bold">Pending Approval</p>
                            <p className="text-zinc-400 text-sm">This project is awaiting admin review</p>
                        </div>
                    </div>
                )}

                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        {showVideo && project.demo_video_url ? (
                            <div className="aspect-video bg-black mb-6">
                                <iframe
                                    src={project.demo_video_url}
                                    className="w-full h-full"
                                    allowFullScreen
                                />
                            </div>
                        ) : allImages.length > 0 ? (
                            <div className="relative aspect-video bg-zinc-900 mb-6 group">
                                <img
                                    src={allImages[currentImageIndex]}
                                    alt={project.title}
                                    className="w-full h-full object-cover"
                                />
                                {allImages.length > 1 && (
                                    <>
                                        <button
                                            onClick={() => setCurrentImageIndex(i => i > 0 ? i - 1 : allImages.length - 1)}
                                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/80 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <ChevronLeft size={20} />
                                        </button>
                                        <button
                                            onClick={() => setCurrentImageIndex(i => i < allImages.length - 1 ? i + 1 : 0)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/80 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                            {allImages.map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setCurrentImageIndex(i)}
                                                    className={`w-2 h-2 rounded-full ${i === currentImageIndex ? 'bg-red-500' : 'bg-zinc-600'}`}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                                {project.demo_video_url && (
                                    <button
                                        onClick={() => setShowVideo(true)}
                                        className="absolute top-4 right-4 bg-black/80 px-3 py-2 flex items-center gap-2 text-xs font-bold uppercase"
                                    >
                                        <Play size={14} /> Watch Demo
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="aspect-video bg-zinc-900 mb-6 flex items-center justify-center">
                                <Code size={64} className="text-zinc-800" />
                            </div>
                        )}

                        <div className="bg-black border border-zinc-800 p-6 mb-6">
                            <span className="text-red-500 text-[10px] uppercase font-bold mb-2 block">
                                {project.category}
                            </span>
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">
                                {project.title}
                            </h1>
                            {project.tagline && (
                                <p className="text-zinc-400 text-lg mb-4">{project.tagline}</p>
                            )}

                            <div className="flex flex-wrap gap-2 mb-6">
                                {(project.tech_stack || []).map((tech, i) => (
                                    <span key={i} className="bg-zinc-900 border border-zinc-700 px-3 py-1 text-sm text-red-400">
                                        {tech}
                                    </span>
                                ))}
                            </div>

                            <div className="prose prose-invert max-w-none mb-6">
                                <p className="text-zinc-300 whitespace-pre-wrap">{project.description}</p>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                {project.live_url && (
                                    <a
                                        href={project.live_url}
                                        target="_blank"
                                        className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-3 font-bold text-sm uppercase flex items-center gap-2"
                                    >
                                        <ExternalLink size={16} /> Live Demo
                                    </a>
                                )}
                                {project.github_url && (
                                    <a
                                        href={project.github_url}
                                        target="_blank"
                                        className="bg-zinc-900 border border-zinc-700 text-white px-6 py-3 font-bold text-sm uppercase flex items-center gap-2 hover:border-zinc-500"
                                    >
                                        <Github size={16} /> Source Code
                                    </a>
                                )}
                            </div>
                        </div>

                        <div className="bg-black border border-zinc-800 p-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                                <MessageSquare size={14} /> Comments ({project.comments_count || 0})
                            </h3>

                            {user ? (
                                <div className="flex gap-3 mb-6">
                                    <input
                                        type="text"
                                        placeholder="Add a comment..."
                                        className="flex-1 bg-zinc-900 border border-zinc-700 p-3 text-white text-sm placeholder-zinc-500 focus:border-red-600 outline-none"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                                    />
                                    <button
                                        onClick={handleComment}
                                        disabled={submittingComment || !newComment.trim()}
                                        className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-4 disabled:opacity-50"
                                    >
                                        {submittingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    </button>
                                </div>
                            ) : (
                                <p className="text-zinc-500 text-sm mb-6">
                                    <button onClick={() => router.push('/auth?redirect_to=/projects/' + id + '&public=1')} className="text-red-500 hover:underline">
                                        Login
                                    </button> to comment
                                </p>
                            )}

                            <div className="space-y-4">
                                {comments.map((comment) => (
                                    <div key={comment.id} className="border-b border-zinc-900 pb-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2 mb-2">
                                                {comment.user_avatar ? (
                                                    <img src={comment.user_avatar} alt="" className="w-6 h-6 rounded-full" />
                                                ) : (
                                                    <div className="w-6 h-6 bg-zinc-800 rounded-full flex items-center justify-center">
                                                        <User size={12} className="text-zinc-500" />
                                                    </div>
                                                )}
                                                <span className="text-white font-medium text-sm">{comment.user_name}</span>
                                                <span className="text-zinc-600 text-xs">
                                                    {new Date(comment.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            {user?.id === comment.user_id ? (
                                                <button
                                                    onClick={() => handleDeleteComment(comment.id)}
                                                    className="text-zinc-600 hover:text-red-500"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            ) : user && (
                                                <button
                                                    onClick={() => setReportingcommentid(comment.id)}
                                                    className="text-zinc-600 hover:text-red-400"
                                                    title="Report comment"
                                                >
                                                    <Flag size={12} />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-zinc-300 text-sm pl-8">{comment.content}</p>
                                    </div>
                                ))}

                                {comments.length === 0 && (
                                    <p className="text-zinc-600 text-sm text-center py-4">No comments yet. Be the first!</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-black border border-zinc-800 p-6 mb-6 sticky top-6">
                            <div className="flex items-center gap-4 mb-6">
                                <button
                                    onClick={handleLike}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 border transition-colors ${userLiked
                                        ? 'border-pink-500 bg-pink-500/10 text-pink-400'
                                        : 'border-zinc-700 text-zinc-400 hover:text-white'
                                        }`}
                                >
                                    <Heart size={18} fill={userLiked ? 'currentColor' : 'none'} />
                                    <span className="font-bold">{project.likes_count}</span>
                                </button>
                                <button
                                    onClick={handleShare}
                                    className="p-3 border border-zinc-700 text-zinc-400 hover:text-white"
                                >
                                    <Share2 size={18} />
                                </button>
                                {isOwner ? (
                                    <>
                                        <button
                                            onClick={() => router.push(`/projects/submit?edit=${id}`)}
                                            className="p-3 border border-zinc-700 text-zinc-400 hover:text-white"
                                            title="Edit"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={handledelete}
                                            disabled={deleting}
                                            className="p-3 border border-red-900/50 text-red-500 hover:bg-red-900/20"
                                            title="Delete"
                                        >
                                            {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setShowreport(true)}
                                        className="p-3 border border-zinc-700 text-zinc-400 hover:text-red-400"
                                        title="Report"
                                    >
                                        <Flag size={18} />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-6 text-zinc-500 text-sm mb-6 justify-center">
                                <span className="flex items-center gap-1"><Eye size={14} /> {project.views_count} views</span>
                            </div>

                            <div className="border-t border-zinc-800 pt-6">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Created by</h4>
                                <div className="flex items-center gap-3">
                                    {project.user_avatar && (
                                        <img src={project.user_avatar} alt="" className="w-10 h-10 rounded-full" />
                                    )}
                                    <div>
                                        <p className="text-white font-medium">{project.user_name}</p>
                                        <p className="text-zinc-500 text-xs">{new Date(project.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>

                            {collaborators.length > 0 && (
                                <div className="border-t border-zinc-800 pt-6 mt-6">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
                                        <Users size={12} /> Collaborators
                                    </h4>
                                    <div className="space-y-2">
                                        {collaborators.map((collab) => (
                                            <div key={collab.id} className="text-sm">
                                                <p className="text-white">{collab.user_name}</p>
                                                {collab.role && <p className="text-zinc-500 text-xs">{collab.role}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(project.tags || []).length > 0 && (
                                <div className="border-t border-zinc-800 pt-6 mt-6">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Tags</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {project.tags.map((tag, i) => (
                                            <span key={i} className="bg-zinc-900 px-2 py-1 text-xs text-zinc-400">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
