"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import {
    User, FileText, Edit2, Save, Loader2,
    Linkedin, Github, Globe, Building2, GraduationCap,
    BookOpen, Briefcase, Eye, Trash2, ExternalLink, Plus,
    FolderKanban, BadgeCheck, Sparkles, Code, ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import TagSearchInput from '@/components/TagSearchInput';

const supabase = createPagesBrowserClient();

const SASTRA_DOMAINS = ["sastra.ac.in", "sastra.edu"];

function issastraemail(email: string): boolean {
    return SASTRA_DOMAINS.some((d) => email.toLowerCase().trim().endsWith(d));
}

interface Profile {
    id?: string;
    full_name: string;
    bio: string;
    linkedin_url: string;
    github_url: string;
    portfolio_url: string;
    is_sastra_student: boolean;
    is_alumni: boolean;
    department: string;
    semester: number | null;
    section: string;
    batch_year: string;
    graduation_year: string;
    current_company: string;
    job_title: string;
}

type SidebarSection = 'account' | 'skills' | 'resumes' | 'projects' | 'pyqs';

function ProfileContent() {
    const router = useRouter();
    const searchparams = useSearchParams();
    const sectionparam = searchparams.get('section') as SidebarSection | null;

    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [issastra, setIssastra] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [resumes, setResumes] = useState<any[]>([]);
    const [papers, setPapers] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [userskills, setUserskills] = useState<string[]>([]);
    const [activesection, setActivesection] = useState<SidebarSection>(sectionparam || 'account');
    const [visibleresumes, setVisibleresumes] = useState(6);
    const [visibleprojects, setVisibleprojects] = useState(6);
    const [visiblepapers, setVisiblepapers] = useState(10);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                router.push('/auth');
                return;
            }

            setUser(session.user);
            const email = session.user.email?.toLowerCase() || '';
            setIssastra(issastraemail(email));

            await fetchprofile(session.user);
            await fetchresumes(session.user.id);
            await fetchprojects(session.user.id);
            await fetchuserskills(session.user.id);
            if (issastraemail(email)) {
                await fetchpapers(session.user.id);
            }
            setLoading(false);
        };

        init();
    }, [router]);

    useEffect(() => {
        if (sectionparam) {
            setActivesection(sectionparam);
        }
    }, [sectionparam]);

    const fetchprofile = async (user: any) => {
        const { data } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (data) {
            setProfile(data);
        } else {
            const email = user.email?.toLowerCase() || '';
            setProfile({
                full_name: user.user_metadata?.full_name || '',
                bio: '',
                linkedin_url: '',
                github_url: '',
                portfolio_url: '',
                is_sastra_student: issastraemail(email),
                is_alumni: !issastraemail(email),
                department: '',
                semester: null,
                section: '',
                batch_year: '',
                graduation_year: '',
                current_company: '',
                job_title: ''
            });
        }
    };

    const fetchresumes = async (userid: string) => {
        const { data } = await supabase
            .from('resumes')
            .select('*')
            .eq('user_id', userid)
            .order('created_at', { ascending: false });
        setResumes(data || []);
    };

    const fetchprojects = async (userid: string) => {
        const { data } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', userid)
            .order('created_at', { ascending: false });
        setProjects(data || []);
    };

    const fetchpapers = async (userid: string) => {
        const { data } = await supabase
            .from('papers')
            .select('*')
            .eq('author_id', userid)
            .order('created_at', { ascending: false });
        setPapers(data || []);
    };

    const fetchuserskills = async (userid: string) => {
        const { data } = await supabase
            .from('user_skills')
            .select('skill_id, skills(name)')
            .eq('user_id', userid);
        if (data) {
            setUserskills(data.map((s: any) => s.skills?.name).filter(Boolean));
        }
    };

    const handleskillschange = async (newskills: string[]) => {
        if (!user) return;

        const added = newskills.filter(s => !userskills.includes(s));
        const removed = userskills.filter(s => !newskills.includes(s));

        for (const skillname of added) {
            let { data: skill } = await supabase
                .from('skills')
                .select('id')
                .eq('name', skillname)
                .single();

            if (!skill) {
                const { data: newskill } = await supabase
                    .from('skills')
                    .insert({ name: skillname })
                    .select()
                    .single();
                skill = newskill;
            }

            if (skill) {
                await supabase.from('user_skills').insert({
                    user_id: user.id,
                    skill_id: skill.id
                });
            }
        }

        for (const skillname of removed) {
            const { data: skill } = await supabase
                .from('skills')
                .select('id')
                .eq('name', skillname)
                .single();

            if (skill) {
                await supabase
                    .from('user_skills')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('skill_id', skill.id);
            }
        }

        setUserskills(newskills);
    };

    const handlesaveprofile = async () => {
        if (!user || !profile) return;
        setSaving(true);

        const profiledata = {
            user_id: user.id,
            email: user.email,
            ...profile
        };

        if (profile.id) {
            await supabase.from('user_profiles').update(profiledata).eq('id', profile.id);
        } else {
            const { data } = await supabase.from('user_profiles').insert(profiledata).select().single();
            if (data) setProfile(data);
        }

        setSaving(false);
        setEditing(false);
    };

    const handledeleteresume = async (id: string) => {
        if (!confirm('Delete this resume?')) return;
        await supabase.from('resumes').delete().eq('id', id);
        setResumes(resumes.filter(r => r.id !== id));
    };

    const handledeleteproject = async (id: string) => {
        if (!confirm('Delete this project?')) return;
        await supabase.from('projects').delete().eq('id', id);
        setProjects(projects.filter(p => p.id !== id));
    };

    const changesection = (section: SidebarSection) => {
        setActivesection(section);
        router.push(`/profile?section=${section}`, { scroll: false });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <Loader2 className="text-red-600 animate-spin" size={32} />
            </div>
        );
    }

    const getstatusbadge = (status: string) => {
        const styles: Record<string, string> = {
            pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            approved: 'bg-green-500/20 text-green-400 border-green-500/30',
            rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
            published: 'bg-green-500/20 text-green-400 border-green-500/30',
            featured: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
            draft: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
        };
        return <span className={`${styles[status] || styles.pending} border px-2 py-0.5 text-[10px] uppercase font-bold`}>{status}</span>;
    };

    const sidebarsections = [
        { id: 'account' as const, label: 'Account', icon: User },
        { id: 'skills' as const, label: 'Skills', icon: Code },
        { id: 'resumes' as const, label: 'Resumes', icon: FileText },
        { id: 'projects' as const, label: 'Projects', icon: FolderKanban },
        ...(issastra ? [{ id: 'pyqs' as const, label: 'PyQs', icon: BookOpen }] : [])
    ];

    return (
        <div className="min-h-screen bg-neutral-950 text-gray-100">
            <div className="max-w-7xl mx-auto p-6">
                <div className="flex items-start gap-6 mb-8 pb-6 border-b border-zinc-800">
                    <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-pink-600 rounded-full flex items-center justify-center text-white text-2xl font-black shrink-0">
                        {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter truncate">
                            {profile?.full_name || 'Your Profile'}
                        </h1>
                        <p className="text-zinc-500 truncate">{user?.email}</p>
                        {profile?.job_title && profile?.current_company && (
                            <p className="text-red-400 mt-1">{profile.job_title} at {profile.current_company}</p>
                        )}
                        <div className="flex gap-3 mt-3">
                            {profile?.linkedin_url && (
                                <a href={profile.linkedin_url} target="_blank" className="text-zinc-500 hover:text-white">
                                    <Linkedin size={18} />
                                </a>
                            )}
                            {profile?.github_url && (
                                <a href={profile.github_url} target="_blank" className="text-zinc-500 hover:text-white">
                                    <Github size={18} />
                                </a>
                            )}
                            {profile?.portfolio_url && (
                                <a href={profile.portfolio_url} target="_blank" className="text-zinc-500 hover:text-white">
                                    <Globe size={18} />
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    <aside className="lg:w-56 shrink-0">
                        <nav className="space-y-1 lg:sticky lg:top-24">
                            {sidebarsections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => changesection(section.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-bold uppercase tracking-wider transition-colors ${activesection === section.id
                                        ? 'bg-gradient-to-r from-red-600/20 to-pink-600/20 text-white border-l-2 border-red-500'
                                        : 'text-zinc-500 hover:text-white hover:bg-zinc-900/50'
                                        }`}
                                >
                                    <section.icon size={16} />
                                    {section.label}
                                </button>
                            ))}
                        </nav>
                    </aside>

                    <main className="flex-1 min-w-0">
                        {activesection === 'account' && (
                            <div className="bg-black border border-zinc-800 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Account Information</h3>
                                    <button
                                        onClick={() => setEditing(!editing)}
                                        className="p-2 bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                </div>

                                {editing && profile ? (
                                    <div className="space-y-6">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-zinc-500 text-xs uppercase font-bold block mb-1">Full Name</label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-zinc-900 border border-zinc-700 p-2.5 text-white text-sm"
                                                    value={profile.full_name}
                                                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-zinc-500 text-xs uppercase font-bold block mb-1">Bio</label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-zinc-900 border border-zinc-700 p-2.5 text-white text-sm"
                                                    value={profile.bio}
                                                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="text-zinc-500 text-xs uppercase font-bold block mb-1">LinkedIn URL</label>
                                                <input
                                                    type="url"
                                                    className="w-full bg-zinc-900 border border-zinc-700 p-2.5 text-white text-sm"
                                                    value={profile.linkedin_url}
                                                    onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-zinc-500 text-xs uppercase font-bold block mb-1">GitHub URL</label>
                                                <input
                                                    type="url"
                                                    className="w-full bg-zinc-900 border border-zinc-700 p-2.5 text-white text-sm"
                                                    value={profile.github_url}
                                                    onChange={(e) => setProfile({ ...profile, github_url: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-zinc-500 text-xs uppercase font-bold block mb-1">Portfolio URL</label>
                                                <input
                                                    type="url"
                                                    className="w-full bg-zinc-900 border border-zinc-700 p-2.5 text-white text-sm"
                                                    value={profile.portfolio_url}
                                                    onChange={(e) => setProfile({ ...profile, portfolio_url: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        {issastra ? (
                                            <div className="grid md:grid-cols-4 gap-4">
                                                <div>
                                                    <label className="text-zinc-500 text-xs uppercase font-bold block mb-1">Department</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g., CSE, ECE"
                                                        className="w-full bg-zinc-900 border border-zinc-700 p-2.5 text-white text-sm"
                                                        value={profile.department}
                                                        onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-zinc-500 text-xs uppercase font-bold block mb-1">Semester</label>
                                                    <select
                                                        className="w-full bg-zinc-900 border border-zinc-700 p-2.5 text-white text-sm"
                                                        value={profile.semester || ''}
                                                        onChange={(e) => setProfile({ ...profile, semester: parseInt(e.target.value) || null })}
                                                    >
                                                        <option value="">Select</option>
                                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-zinc-500 text-xs uppercase font-bold block mb-1">Section</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g., A, B"
                                                        className="w-full bg-zinc-900 border border-zinc-700 p-2.5 text-white text-sm"
                                                        value={profile.section}
                                                        onChange={(e) => setProfile({ ...profile, section: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-zinc-500 text-xs uppercase font-bold block mb-1">Batch Year</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g., 2021-2025"
                                                        className="w-full bg-zinc-900 border border-zinc-700 p-2.5 text-white text-sm"
                                                        value={profile.batch_year}
                                                        onChange={(e) => setProfile({ ...profile, batch_year: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="text-zinc-500 text-xs uppercase font-bold block mb-1">Graduation Year</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g., 2023"
                                                        className="w-full bg-zinc-900 border border-zinc-700 p-2.5 text-white text-sm"
                                                        value={profile.graduation_year}
                                                        onChange={(e) => setProfile({ ...profile, graduation_year: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-zinc-500 text-xs uppercase font-bold block mb-1">Current Company</label>
                                                    <input
                                                        type="text"
                                                        className="w-full bg-zinc-900 border border-zinc-700 p-2.5 text-white text-sm"
                                                        value={profile.current_company}
                                                        onChange={(e) => setProfile({ ...profile, current_company: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-zinc-500 text-xs uppercase font-bold block mb-1">Current Role</label>
                                                    <input
                                                        type="text"
                                                        className="w-full bg-zinc-900 border border-zinc-700 p-2.5 text-white text-sm"
                                                        value={profile.job_title}
                                                        onChange={(e) => setProfile({ ...profile, job_title: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={handlesaveprofile}
                                            disabled={saving}
                                            className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-2.5 font-bold text-sm uppercase flex items-center gap-2"
                                        >
                                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                            Save Profile
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div>
                                                <span className="text-zinc-600 text-xs uppercase block mb-1">Name</span>
                                                <span className="text-white">{profile?.full_name || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="text-zinc-600 text-xs uppercase block mb-1">Bio</span>
                                                <span className="text-white">{profile?.bio || '-'}</span>
                                            </div>
                                            {issastra ? (
                                                <>
                                                    <div>
                                                        <span className="text-zinc-600 text-xs uppercase block mb-1">Department</span>
                                                        <span className="text-white">{profile?.department || '-'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-zinc-600 text-xs uppercase block mb-1">Batch</span>
                                                        <span className="text-white">{profile?.batch_year || '-'}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div>
                                                        <span className="text-zinc-600 text-xs uppercase block mb-1">Company</span>
                                                        <span className="text-white">{profile?.current_company || '-'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-zinc-600 text-xs uppercase block mb-1">Role</span>
                                                        <span className="text-white">{profile?.job_title || '-'}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activesection === 'skills' && (
                            <div className="bg-black border border-zinc-800 p-6">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-6">Your Skills</h3>
                                <TagSearchInput
                                    tablename="skills"
                                    selectedtags={userskills}
                                    ontagschange={handleskillschange}
                                    placeholder="Search or add skills..."
                                />
                                {userskills.length === 0 && (
                                    <p className="text-zinc-600 text-sm mt-4">No skills added yet. Start typing to search and add skills.</p>
                                )}
                            </div>
                        )}

                        {activesection === 'resumes' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-white">Your Resumes ({resumes.length})</h3>
                                    <Link
                                        href="/resumes/submit"
                                        className="bg-zinc-900 border border-zinc-700 text-white px-4 py-2 text-xs font-bold uppercase hover:bg-zinc-800 flex items-center gap-2"
                                    >
                                        <Plus size={14} /> Submit New
                                    </Link>
                                </div>

                                {resumes.length === 0 ? (
                                    <div className="text-center py-12 border border-dashed border-zinc-800 bg-black">
                                        <p className="text-zinc-500 mb-4">You haven't submitted any resumes yet</p>
                                        <Link href="/resumes/submit" className="text-red-500 font-bold hover:underline">
                                            Submit your first resume
                                        </Link>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-3">
                                            {resumes.slice(0, visibleresumes).map((resume) => (
                                                <div key={resume.id} className="bg-black border border-zinc-800 p-4 flex items-center justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            {getstatusbadge(resume.status)}
                                                            <span className="text-zinc-600 text-xs">
                                                                {new Date(resume.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-white font-bold">{resume.company_name} - {resume.role_title}</p>
                                                        <div className="flex items-center gap-4 text-zinc-500 text-xs mt-1">
                                                            <span><Eye size={12} className="inline mr-1" />{resume.views_count}</span>
                                                            <span>Votes: {resume.votes_count || 0}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Link
                                                            href={`/resumes/${resume.id}`}
                                                            className="p-2 bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white"
                                                        >
                                                            <ExternalLink size={14} />
                                                        </Link>
                                                        <button
                                                            onClick={() => handledeleteresume(resume.id)}
                                                            className="p-2 bg-zinc-900 border border-red-900/50 text-red-500 hover:bg-red-900/20"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {resumes.length > visibleresumes && (
                                            <button
                                                onClick={() => setVisibleresumes(prev => prev + 6)}
                                                className="w-full mt-4 py-2 text-sm text-zinc-400 hover:text-white border border-zinc-800 hover:border-red-600 flex items-center justify-center gap-2"
                                            >
                                                <ChevronDown size={14} />
                                                Load More ({resumes.length - visibleresumes} remaining)
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {activesection === 'projects' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-white">Your Projects ({projects.length})</h3>
                                    <Link
                                        href="/projects/submit"
                                        className="bg-zinc-900 border border-zinc-700 text-white px-4 py-2 text-xs font-bold uppercase hover:bg-zinc-800 flex items-center gap-2"
                                    >
                                        <Plus size={14} /> Submit New
                                    </Link>
                                </div>

                                {projects.length === 0 ? (
                                    <div className="text-center py-12 border border-dashed border-zinc-800 bg-black">
                                        <p className="text-zinc-500 mb-4">You haven't submitted any projects yet</p>
                                        <Link href="/projects/submit" className="text-red-500 font-bold hover:underline">
                                            Submit your first project
                                        </Link>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            {projects.slice(0, visibleprojects).map((project) => (
                                                <div key={project.id} className="bg-black border border-zinc-800 overflow-hidden">
                                                    {project.thumbnail_url && (
                                                        <div className="aspect-video bg-zinc-900">
                                                            <img src={project.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                    <div className="p-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            {getstatusbadge(project.status)}
                                                            <span className="text-zinc-600 text-xs">
                                                                {new Date(project.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-white font-bold mb-2">{project.title}</p>
                                                        <div className="flex items-center gap-4 text-zinc-500 text-xs mb-3">
                                                            <span><Eye size={12} className="inline mr-1" />{project.views_count}</span>
                                                            <span>Likes: {project.likes_count || 0}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Link
                                                                href={`/projects/${project.id}`}
                                                                className="flex-1 text-center py-2 bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white text-xs font-bold uppercase"
                                                            >
                                                                View
                                                            </Link>
                                                            <button
                                                                onClick={() => handledeleteproject(project.id)}
                                                                className="p-2 bg-zinc-900 border border-red-900/50 text-red-500 hover:bg-red-900/20"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {projects.length > visibleprojects && (
                                            <button
                                                onClick={() => setVisibleprojects(prev => prev + 6)}
                                                className="w-full mt-4 py-2 text-sm text-zinc-400 hover:text-white border border-zinc-800 hover:border-cyan-600 flex items-center justify-center gap-2"
                                            >
                                                <ChevronDown size={14} />
                                                Load More ({projects.length - visibleprojects} remaining)
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {activesection === 'pyqs' && issastra && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-white">Your PyQ Papers ({papers.length})</h3>
                                    <Link
                                        href="/upload"
                                        className="bg-zinc-900 border border-zinc-700 text-white px-4 py-2 text-xs font-bold uppercase hover:bg-zinc-800 flex items-center gap-2"
                                    >
                                        <Plus size={14} /> Upload New
                                    </Link>
                                </div>

                                {papers.length === 0 ? (
                                    <div className="text-center py-12 border border-dashed border-zinc-800 bg-black">
                                        <p className="text-zinc-500 mb-4">You haven't uploaded any question papers yet</p>
                                        <Link href="/upload" className="text-red-500 font-bold hover:underline">
                                            Upload your first paper
                                        </Link>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-3">
                                            {papers.slice(0, visiblepapers).map((paper) => (
                                                <div key={paper.id} className="bg-black border border-zinc-800 p-4">
                                                    <p className="text-white font-bold">{paper.subject_name}</p>
                                                    <p className="text-zinc-500 text-sm">{paper.exam_category} • Year {paper.year}</p>
                                                </div>
                                            ))}
                                        </div>
                                        {papers.length > visiblepapers && (
                                            <button
                                                onClick={() => setVisiblepapers(prev => prev + 10)}
                                                className="w-full mt-4 py-2 text-sm text-zinc-400 hover:text-white border border-zinc-800 hover:border-purple-600 flex items-center justify-center gap-2"
                                            >
                                                <ChevronDown size={14} />
                                                Load More ({papers.length - visiblepapers} remaining)
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {activesection === 'pyqs' && !issastra && (
                            <div className="bg-amber-500/10 border border-amber-500/30 p-6 text-center">
                                <GraduationCap size={32} className="text-amber-500 mx-auto mb-4" />
                                <h3 className="text-white font-bold mb-2">PyQ Access Restricted</h3>
                                <p className="text-zinc-400 text-sm mb-4">
                                    Only SASTRA students can access the Question Bank.
                                </p>
                                <Link href="/auth" className="text-amber-500 font-bold hover:underline">
                                    Login with SASTRA email →
                                </Link>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <Loader2 className="text-red-600 animate-spin" size={32} />
            </div>
        }>
            <ProfileContent />
        </Suspense>
    );
}
