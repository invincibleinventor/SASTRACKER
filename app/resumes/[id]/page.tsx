"use client";

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import {
    ArrowLeft, Download, Sparkles, Eye, Building2, Calendar,
    Lightbulb, MessageSquare, ThumbsUp, ThumbsDown, Send,
    Edit2, Trash2, Loader2, ExternalLink, User, Briefcase, GitFork, Flag, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import type { Resume } from '@/utils/resumeTypes';
import ReportModal from '@/components/ReportModal';

const supabase = createPagesBrowserClient();

interface Comment {
    id: string;
    user_name: string;
    user_email: string;
    user_avatar?: string;
    content: string;
    created_at: string;
    user_id: string;
}

export default function ResumeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [user, setUser] = useState<any>(null);
    const [resume, setResume] = useState<Resume | null>(null);
    const [loading, setLoading] = useState(true);
    const [userVote, setUserVote] = useState<number | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    const [isOwner, setIsOwner] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({ tips: '', remarks: '' });
    const [achievements, setAchievements] = useState<any[]>([]);
    const [parentResume, setParentResume] = useState<{ id: string; company_name: string; role_title: string; user_name: string } | null>(null);
    const [showreport, setShowreport] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [reportingcommentid, setReportingcommentid] = useState<string | null>(null);

    useEffect(() => {
        fetchResume();
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });
    }, [id]);

    useEffect(() => {
        if (user && resume) {
            setIsOwner(user.id === resume.user_id);
            fetchUserVote();
        }
    }, [user, resume]);

    const fetchResume = async () => {
        const { data, error } = await supabase
            .from('resumes')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            router.push('/resumes');
            return;
        }

        setResume(data);
        setEditForm({ tips: data.tips || '', remarks: data.remarks || '' });

        await supabase.from('resumes').update({ views_count: (data.views_count || 0) + 1 }).eq('id', id);

        await fetchComments();
        await fetchAchievements();

        if (data.forked_from) {
            const { data: parent } = await supabase
                .from('resumes')
                .select('id, company_name, role_title, user_name')
                .eq('id', data.forked_from)
                .single();
            setParentResume(parent);
        }

        setLoading(false);
    };

    const fetchUserVote = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('resume_votes')
            .select('vote_type')
            .eq('resume_id', id)
            .eq('user_id', user.id)
            .single();
        setUserVote(data?.vote_type ?? null);
    };

    const fetchComments = async () => {
        const { data } = await supabase
            .from('resume_comments')
            .select('*')
            .eq('resume_id', id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });
        setComments(data || []);
    };

    const fetchAchievements = async () => {
        const { data } = await supabase
            .from('resume_achievements')
            .select('*')
            .eq('resume_id', id)
            .order('created_at', { ascending: true });
        setAchievements(data || []);
    };

    const handleVote = async (voteType: 1 | -1) => {
        if (!user) {
            router.push('/auth?redirect_to=/resumes/' + id + '&public=1');
            return;
        }

        if (userVote === voteType) {
            await supabase.from('resume_votes').delete().eq('resume_id', id).eq('user_id', user.id);
            setUserVote(null);
            setResume(prev => prev ? { ...prev, votes_count: (prev.votes_count || 0) - voteType } : prev);
        } else {
            await supabase.from('resume_votes').upsert({
                resume_id: id,
                user_id: user.id,
                vote_type: voteType
            }, { onConflict: 'resume_id,user_id' });

            const diff = userVote ? voteType - userVote : voteType;
            setUserVote(voteType);
            setResume(prev => prev ? { ...prev, votes_count: (prev.votes_count || 0) + diff } : prev);
        }
    };

    const handleComment = async () => {
        if (!user || !newComment.trim()) return;

        setSubmittingComment(true);
        await supabase.from('resume_comments').insert({
            resume_id: id,
            user_id: user.id,
            user_email: user.email,
            user_name: user.user_metadata?.full_name || user.email?.split('@')[0],
            user_avatar: user.user_metadata?.avatar_url,
            content: newComment.trim()
        });

        setNewComment('');
        await fetchComments();
        setResume(prev => prev ? { ...prev, comments_count: (prev.comments_count || 0) + 1 } : prev);
        setSubmittingComment(false);
    };

    const handleDeleteComment = async (commentId: string) => {
        await supabase.from('resume_comments').update({ is_deleted: true }).eq('id', commentId);
        await fetchComments();
        setResume(prev => prev ? { ...prev, comments_count: (prev.comments_count || 0) - 1 } : prev);
    };

    const handleSaveEdit = async () => {
        if (!resume) return;
        await supabase.from('resumes').update({
            tips: editForm.tips || null,
            remarks: editForm.remarks || null
        }).eq('id', id);
        setResume({ ...resume, tips: editForm.tips, remarks: editForm.remarks });
        setEditing(false);
    };

    const handledelete = async () => {
        if (!confirm('Are you sure you want to delete this resume? This cannot be undone.')) return;
        setDeleting(true);
        const { error } = await supabase.from('resumes').delete().eq('id', id);
        if (error) {
            alert(`Failed to delete: ${error.message}`);
            setDeleting(false);
            return;
        }
        router.push('/resumes');
    };

    if (loading || !resume) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <Loader2 className="text-red-600 animate-spin" size={32} />
            </div>
        );
    }

    const getAchievementBadge = (type: string) => {
        const styles: Record<string, string> = {
            internship: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            job: 'bg-green-500/20 text-green-400 border-green-500/30',
            freelance: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            project: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
            both: 'bg-pink-500/20 text-pink-400 border-pink-500/30'
        };
        return styles[type] || styles.job;
    };

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
                    contenttype="resume"
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

                {resume.status === 'pending' && (
                    <div className="bg-amber-500/10 border border-amber-500/30 p-4 mb-6 flex items-center gap-3">
                        <AlertTriangle size={20} className="text-amber-500" />
                        <div>
                            <p className="text-amber-400 font-bold">Pending Approval</p>
                            <p className="text-zinc-400 text-sm">This resume is awaiting admin review</p>
                        </div>
                    </div>
                )}

                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-black border border-zinc-800 p-6 mb-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`border px-2 py-0.5 text-[10px] uppercase font-bold ${getAchievementBadge(resume.achievement_type)}`}>
                                            {resume.achievement_type}
                                        </span>
                                        {parentResume && (
                                            <Link
                                                href={`/resumes/${parentResume.id}`}
                                                className="border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] uppercase font-bold text-purple-400 flex items-center gap-1 hover:bg-purple-500/20"
                                            >
                                                <GitFork size={10} /> Forked from {parentResume.user_name}
                                            </Link>
                                        )}
                                    </div>
                                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
                                        {resume.role_title}
                                    </h1>
                                    <p className="text-red-400 font-bold flex items-center gap-2 mt-1">
                                        <Building2 size={16} /> {resume.company_name}
                                    </p>
                                </div>

                                {isOwner ? (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => router.push(`/resumes/submit?edit=${id}`)}
                                            className="p-2 bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white"
                                            title="Full Edit"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={handledelete}
                                            disabled={deleting}
                                            className="p-2 bg-zinc-900 border border-red-900/50 text-red-500 hover:bg-red-900/20"
                                            title="Delete"
                                        >
                                            {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowreport(true)}
                                        className="p-2 bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-red-400"
                                        title="Report"
                                    >
                                        <Flag size={16} />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-6 text-zinc-500 text-sm mb-6">
                                <span className="flex items-center gap-1"><User size={14} /> {resume.user_name}</span>
                                {resume.year_graduated && (
                                    <span className="flex items-center gap-1"><Calendar size={14} /> Class of {resume.year_graduated}</span>
                                )}
                                <span className="flex items-center gap-1"><Eye size={14} /> {resume.views_count} views</span>
                                {(resume.fork_count || 0) > 0 && (
                                    <Link href={`/resumes/${resume.id}/forks`} className="flex items-center gap-1 text-purple-400 hover:text-purple-300">
                                        <GitFork size={14} /> {resume.fork_count} forks
                                    </Link>
                                )}
                            </div>

                            {achievements.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
                                        <Briefcase size={12} className="inline mr-1" /> What This Resume Got
                                    </h3>
                                    <div className="space-y-2">
                                        {achievements.map((a) => (
                                            <div key={a.id} className="flex items-center gap-3 bg-zinc-900/30 border border-zinc-800 p-3">
                                                <span className={`border px-2 py-0.5 text-[10px] uppercase font-bold ${getAchievementBadge(a.achievement_type)}`}>
                                                    {a.achievement_type}
                                                </span>
                                                <div>
                                                    <p className="text-white font-medium">{a.role_title}</p>
                                                    <p className="text-zinc-500 text-xs">{a.company_name}</p>
                                                </div>
                                                {a.is_converted && (
                                                    <span className="text-green-500 text-[10px] font-bold uppercase ml-auto">Converted</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="aspect-[8.5/11] bg-zinc-900 border border-zinc-800 mb-6">
                                <iframe
                                    src={resume.pdf_url}
                                    className="w-full h-full"
                                    title="Resume PDF"
                                />
                            </div>

                            <div className="flex gap-3">
                                <a
                                    href={resume.pdf_url}
                                    download
                                    className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold py-3 text-sm uppercase tracking-wider hover:opacity-90 flex items-center justify-center gap-2"
                                >
                                    <Download size={16} /> Download PDF
                                </a>
                                <button
                                    onClick={() => router.push(`/resumes/fork?template=${resume.id}`)}
                                    className="bg-zinc-900 border border-zinc-700 text-white px-6 py-3 text-sm font-bold uppercase hover:bg-zinc-800 flex items-center gap-2"
                                >
                                    <Sparkles size={16} /> Fork Template
                                </button>
                            </div>
                        </div>

                        <div className="bg-black border border-zinc-800 p-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                                <MessageSquare size={14} /> Comments ({resume.comments_count || 0})
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
                                    <button onClick={() => router.push('/auth?redirect_to=/resumes/' + id + '&public=1')} className="text-red-500 hover:underline">
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
                                                    onClick={() => {
                                                        setReportingcommentid(comment.id);
                                                    }}
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
                            <div className="flex items-center justify-center gap-4 mb-6">
                                <button
                                    onClick={() => handleVote(1)}
                                    className={`flex items-center gap-2 px-4 py-3 border transition-colors ${userVote === 1
                                        ? 'border-green-500 bg-green-500/10 text-green-400'
                                        : 'border-zinc-700 text-zinc-400 hover:text-white'
                                        }`}
                                >
                                    <ThumbsUp size={18} />
                                </button>
                                <span className="text-2xl font-black text-white">{resume.votes_count || 0}</span>
                                <button
                                    onClick={() => handleVote(-1)}
                                    className={`flex items-center gap-2 px-4 py-3 border transition-colors ${userVote === -1
                                        ? 'border-red-500 bg-red-500/10 text-red-400'
                                        : 'border-zinc-700 text-zinc-400 hover:text-white'
                                        }`}
                                >
                                    <ThumbsDown size={18} />
                                </button>
                            </div>

                            {editing ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-zinc-500 text-xs uppercase font-bold block mb-1">Tips</label>
                                        <textarea
                                            rows={3}
                                            className="w-full bg-zinc-900 border border-zinc-700 p-2 text-white text-sm"
                                            value={editForm.tips}
                                            onChange={(e) => setEditForm({ ...editForm, tips: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-zinc-500 text-xs uppercase font-bold block mb-1">Remarks</label>
                                        <textarea
                                            rows={2}
                                            className="w-full bg-zinc-900 border border-zinc-700 p-2 text-white text-sm"
                                            value={editForm.remarks}
                                            onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                                        />
                                    </div>
                                    <button
                                        onClick={handleSaveEdit}
                                        className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white py-2 font-bold text-sm uppercase"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {resume.tips && (
                                        <div className="mb-4">
                                            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1">
                                                <Lightbulb size={12} /> Tips
                                            </h3>
                                            <p className="text-zinc-300 text-sm italic">"{resume.tips}"</p>
                                        </div>
                                    )}

                                    {resume.remarks && (
                                        <div>
                                            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Remarks</h3>
                                            <p className="text-zinc-400 text-sm">{resume.remarks}</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
