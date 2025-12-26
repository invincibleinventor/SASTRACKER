"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import {
    User, FileText, GitFork, Loader2, ExternalLink,
    Linkedin, Github, Globe, Building2, Calendar, Star, Flag
} from 'lucide-react';
import Link from 'next/link';
import type { Resume } from '@/utils/resumeTypes';
import ReportModal from '@/components/ReportModal';

const supabase = createPagesBrowserClient();

interface UserProfile {
    id: string;
    user_id: string;
    email: string;
    full_name: string;
    avatar_url?: string;
    bio?: string;
    linkedin_url?: string;
    github_url?: string;
    portfolio_url?: string;
    department?: string;
    graduation_year?: string;
    current_company?: string;
    job_title?: string;
    flagship_resume_id?: string;
}

export default function ProfilePage() {
    const params = useParams();
    const router = useRouter();
    const userid = params.userId as string;

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [resumes, setResumes] = useState<Resume[]>([]);
    const [flagshipresume, setFlagshipresume] = useState<Resume | null>(null);
    const [forks, setForks] = useState<any[]>([]);
    const [currentuser, setCurrentuser] = useState<any>(null);
    const [showreport, setShowreport] = useState(false);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setCurrentuser(session?.user || null);

            const { data: profiledata } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', userid)
                .single();

            if (!profiledata) {
                const { data: userresumes } = await supabase
                    .from('resumes')
                    .select('*')
                    .eq('user_id', userid)
                    .eq('status', 'approved')
                    .order('created_at', { ascending: false });

                if (userresumes && userresumes.length > 0) {
                    setProfile({
                        id: '',
                        user_id: userid,
                        email: userresumes[0].user_email,
                        full_name: userresumes[0].user_name
                    });
                    setResumes(userresumes);
                }
                setLoading(false);
                return;
            }

            setProfile(profiledata);

            const { data: userresumes } = await supabase
                .from('resumes')
                .select('*')
                .eq('user_id', userid)
                .eq('status', 'approved')
                .order('created_at', { ascending: false });

            setResumes(userresumes || []);

            if (profiledata.flagship_resume_id) {
                const flagship = userresumes?.find(r => r.id === profiledata.flagship_resume_id);
                setFlagshipresume(flagship || null);
            } else if (userresumes && userresumes.length > 0) {
                setFlagshipresume(userresumes[0]);
            }

            const { data: userForks } = await supabase
                .from('resume_forks')
                .select('*, parent_resume:resumes!parent_resume_id(*)')
                .eq('forked_by', userid)
                .limit(5);

            setForks(userForks || []);
            setLoading(false);
        };

        init();
    }, [userid]);

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <Loader2 className="text-red-600 animate-spin" size={32} />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">
                <p>User not found</p>
            </div>
        );
    }

    const isOwnProfile = currentuser?.id === userid;

    return (
        <div className="min-h-screen bg-neutral-950 text-gray-100 py-12">
            <div className="max-w-5xl mx-auto px-6">
                <div className="bg-black border border-zinc-800 p-8 mb-8">
                    <div className="flex items-start gap-6">
                        <div className="w-24 h-24 bg-gradient-to-br from-red-600 to-pink-600 rounded-full flex items-center justify-center text-3xl font-black text-white">
                            {profile.full_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="flex-1">
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
                                {profile.full_name}
                            </h1>
                            {profile.job_title && profile.current_company && (
                                <p className="text-zinc-400 flex items-center gap-2 mt-1">
                                    <Building2 size={14} />
                                    {profile.job_title} at {profile.current_company}
                                </p>
                            )}
                            {profile.department && (
                                <p className="text-zinc-500 text-sm mt-1">
                                    {profile.department} {profile.graduation_year && `• ${profile.graduation_year}`}
                                </p>
                            )}
                            {profile.bio && (
                                <p className="text-zinc-400 mt-3 text-sm">{profile.bio}</p>
                            )}
                            <div className="flex gap-3 mt-4">
                                {profile.linkedin_url && (
                                    <a href={profile.linkedin_url} target="_blank" rel="noopener" className="text-zinc-500 hover:text-blue-400">
                                        <Linkedin size={20} />
                                    </a>
                                )}
                                {profile.github_url && (
                                    <a href={profile.github_url} target="_blank" rel="noopener" className="text-zinc-500 hover:text-white">
                                        <Github size={20} />
                                    </a>
                                )}
                                {profile.portfolio_url && (
                                    <a href={profile.portfolio_url} target="_blank" rel="noopener" className="text-zinc-500 hover:text-green-400">
                                        <Globe size={20} />
                                    </a>
                                )}
                            </div>
                        </div>
                        {isOwnProfile ? (
                            <Link
                                href="/profile/edit"
                                className="text-xs uppercase font-bold text-zinc-400 hover:text-white border border-zinc-600 px-4 py-2"
                            >
                                Edit Profile
                            </Link>
                        ) : (
                            <button
                                onClick={() => setShowreport(true)}
                                className="text-xs uppercase font-bold text-zinc-400 hover:text-red-400 border border-zinc-600 px-4 py-2 flex items-center gap-2"
                            >
                                <Flag size={14} /> Report
                            </button>
                        )}
                    </div>
                </div>

                <ReportModal
                    isopen={showreport}
                    onclose={() => setShowreport(false)}
                    contenttype="user"
                    contentid={userid}
                />

                {flagshipresume && (
                    <div className="mb-8">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                            <Star size={14} className="text-yellow-500" /> Flagship Resume
                        </h2>
                        <Link
                            href={`/resumes/${flagshipresume.id}`}
                            className="block bg-black border border-yellow-900/30 hover:border-yellow-600/50 p-6 transition-colors"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-yellow-400 text-xs font-bold flex items-center gap-1">
                                        <Building2 size={12} /> {flagshipresume.company_name}
                                    </p>
                                    <p className="text-white text-lg font-bold">{flagshipresume.role_title}</p>
                                    <p className="text-zinc-500 text-sm">{flagshipresume.views_count} views • {flagshipresume.fork_count || 0} forks</p>
                                </div>
                                <ExternalLink size={20} className="text-zinc-600" />
                            </div>
                        </Link>
                    </div>
                )}

                {resumes.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                            <FileText size={14} /> All Resumes ({resumes.length})
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            {resumes.map((resume) => (
                                <Link
                                    key={resume.id}
                                    href={`/resumes/${resume.id}`}
                                    className={`bg-black border p-4 hover:border-red-900/50 transition-colors ${resume.id === flagshipresume?.id ? 'border-yellow-900/30' : 'border-zinc-800'
                                        }`}
                                >
                                    <p className="text-red-400 text-xs font-bold">{resume.company_name}</p>
                                    <p className="text-white font-medium">{resume.role_title}</p>
                                    <p className="text-zinc-600 text-xs mt-1">
                                        {new Date(resume.created_at).toLocaleDateString()}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {forks.length > 0 && (
                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                            <GitFork size={14} /> Recent Forks
                        </h2>
                        <div className="space-y-2">
                            {forks.map((fork) => (
                                <div key={fork.id} className="bg-black border border-zinc-800 p-4">
                                    <p className="text-zinc-400 text-sm">
                                        Forked from{' '}
                                        <Link href={`/resumes/${fork.parent_resume_id}`} className="text-red-400 hover:underline">
                                            {fork.parent_resume?.company_name} - {fork.parent_resume?.role_title}
                                        </Link>
                                    </p>
                                    <p className="text-zinc-600 text-xs mt-1">
                                        {new Date(fork.forked_at).toLocaleDateString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
