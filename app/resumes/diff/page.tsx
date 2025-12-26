"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import {
    ArrowLeftRight, Loader2, Upload, FileText, Search,
    CheckCircle, XCircle, Lightbulb, Building2, Clock, Link as LinkIcon
} from 'lucide-react';
import type { Resume } from '@/utils/resumeTypes';

const supabase = createPagesBrowserClient();

interface DiffResult {
    resume1Strengths: string[];
    resume2Strengths: string[];
    suggestions: string[];
    overallComparison: string;
}

export default function DiffViewerPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState<Resume[]>([]);
    const [userResumes, setUserResumes] = useState<Resume[]>([]);

    const [resume1Source, setResume1Source] = useState<'search' | 'link' | 'previous' | 'upload'>('search');
    const [resume1Search, setResume1Search] = useState('');
    const [resume1Link, setResume1Link] = useState('');
    const [selectedResume1, setSelectedResume1] = useState<Resume | null>(null);
    const [resume1File, setResume1File] = useState<File | null>(null);

    const [resume2Source, setResume2Source] = useState<'search' | 'link' | 'previous' | 'upload'>('previous');
    const [resume2Search, setResume2Search] = useState('');
    const [resume2Link, setResume2Link] = useState('');
    const [selectedResume2, setSelectedResume2] = useState<Resume | null>(null);
    const [resume2File, setResume2File] = useState<File | null>(null);

    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState<DiffResult | null>(null);
    const [server, setServer] = useState('prod');

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                router.push('/auth?redirect_to=/resumes/diff&public=1');
                return;
            }

            setUser(session.user);
            await fetchTemplates();
            await fetchUserResumes(session.user.id);
            setLoading(false);
        };

        init();
        setServer(process.env.NEXT_PUBLIC_SERVER || 'prod');
    }, [router]);

    const fetchTemplates = async () => {
        const { data } = await supabase
            .from('resumes')
            .select('*')
            .eq('status', 'approved')
            .order('views_count', { ascending: false });
        setTemplates(data || []);
    };

    const fetchUserResumes = async (userId: string) => {
        const { data } = await supabase
            .from('resumes')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        setUserResumes(data || []);
    };

    const extractResumeIdFromLink = (link: string): string | null => {
        const match = link.match(/\/resumes\/([a-f0-9-]+)/i);
        return match ? match[1] : null;
    };

    const handleLink = async (link: string, setSelected: (r: Resume) => void) => {
        const id = extractResumeIdFromLink(link);
        if (!id) {
            alert('Invalid resume link');
            return;
        }
        const { data } = await supabase.from('resumes').select('*').eq('id', id).single();
        if (data) {
            setSelected(data);
        } else {
            alert('Resume not found');
        }
    };

    const filteredTemplates1 = templates.filter(t =>
        t.company_name.toLowerCase().includes(resume1Search.toLowerCase()) ||
        t.role_title.toLowerCase().includes(resume1Search.toLowerCase()) ||
        t.user_name.toLowerCase().includes(resume1Search.toLowerCase())
    );

    const filteredTemplates2 = templates.filter(t =>
        t.company_name.toLowerCase().includes(resume2Search.toLowerCase()) ||
        t.role_title.toLowerCase().includes(resume2Search.toLowerCase()) ||
        t.user_name.toLowerCase().includes(resume2Search.toLowerCase())
    );

    const handleCompare = async () => {
        let hasResume1 = (resume1Source === 'upload' && resume1File) || selectedResume1;
        let hasResume2 = (resume2Source === 'upload' && resume2File) || selectedResume2;

        if (!hasResume1 || !hasResume2) {
            alert('Please select both resumes');
            return;
        }

        setProcessing(true);

        try {
            const formData = new FormData();

            if (resume1Source === 'upload' && resume1File) {
                formData.append('resume1_file', resume1File);
            } else if (selectedResume1) {
                formData.append('resume1_url', selectedResume1.pdf_url);
            }

            if (resume2Source === 'upload' && resume2File) {
                formData.append('resume2_file', resume2File);
            } else if (selectedResume2) {
                formData.append('resume2_url', selectedResume2.pdf_url);
            }

            const res = await fetch(server === 'local' ? 'http://localhost:8000/resume-diff' : 'https://sastrackerbackend.vercel.app/resume-diff', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || data.error);

            setResult(data);
        } catch (err: any) {
            alert(err.message || 'Comparison failed');
        }

        setProcessing(false);
    };

    const renderSourceSelector = (
        source: 'search' | 'link' | 'previous' | 'upload',
        setSource: (s: 'search' | 'link' | 'previous' | 'upload') => void,
        search: string,
        setSearch: (s: string) => void,
        link: string,
        setLink: (s: string) => void,
        selected: Resume | null,
        setSelected: (r: Resume | null) => void,
        file: File | null,
        setFile: (f: File | null) => void,
        filteredTemplates: Resume[],
        label: string
    ) => (
        <div className="bg-black border border-zinc-800 p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">{label}</h3>

            {selected ? (
                <div className="bg-zinc-900 border border-green-900/50 p-4 flex items-center justify-between">
                    <div>
                        <p className="text-white font-bold">{selected.user_name}</p>
                        <p className="text-green-400 text-sm">{selected.company_name} - {selected.role_title}</p>
                    </div>
                    <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-white text-xs uppercase font-bold">
                        Change
                    </button>
                </div>
            ) : file ? (
                <div className="bg-zinc-900 border border-green-900/50 p-4 flex items-center justify-between">
                    <p className="text-white">{file.name}</p>
                    <button onClick={() => setFile(null)} className="text-zinc-500 hover:text-white text-xs uppercase font-bold">
                        Change
                    </button>
                </div>
            ) : (
                <>
                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={() => setSource('search')}
                            className={`flex-1 py-2 text-xs font-bold uppercase ${source === 'search' ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-400 border border-zinc-700'}`}
                        >
                            Search
                        </button>
                        <button
                            onClick={() => setSource('link')}
                            className={`flex-1 py-2 text-xs font-bold uppercase ${source === 'link' ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-400 border border-zinc-700'}`}
                        >
                            Paste Link
                        </button>
                        {userResumes.length > 0 && (
                            <button
                                onClick={() => setSource('previous')}
                                className={`flex-1 py-2 text-xs font-bold uppercase ${source === 'previous' ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-400 border border-zinc-700'}`}
                            >
                                My Resumes
                            </button>
                        )}
                        <button
                            onClick={() => setSource('upload')}
                            className={`flex-1 py-2 text-xs font-bold uppercase ${source === 'upload' ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-400 border border-zinc-700'}`}
                        >
                            Upload
                        </button>
                    </div>

                    {source === 'search' && (
                        <>
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-3 text-zinc-500" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search by company, role, name..."
                                    className="w-full bg-zinc-900 border border-zinc-700 p-3 pl-10 text-white text-sm placeholder-zinc-500"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-auto">
                                {filteredTemplates.slice(0, 8).map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setSelected(t)}
                                        className="bg-zinc-900/50 border border-zinc-800 p-3 text-left hover:border-red-900/50 transition-colors"
                                    >
                                        <p className="text-red-400 text-xs font-bold flex items-center gap-1">
                                            <Building2 size={12} /> {t.company_name}
                                        </p>
                                        <p className="text-white text-sm">{t.role_title}</p>
                                        <p className="text-zinc-600 text-xs">{t.user_name}</p>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {source === 'link' && (
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <LinkIcon className="absolute left-3 top-3 text-zinc-500" size={16} />
                                <input
                                    type="text"
                                    placeholder="Paste resume link"
                                    className="w-full bg-zinc-900 border border-zinc-700 p-3 pl-10 text-white text-sm placeholder-zinc-500"
                                    value={link}
                                    onChange={(e) => setLink(e.target.value)}
                                />
                            </div>
                            <button onClick={() => handleLink(link, setSelected)} className="bg-red-600 text-white px-4 font-bold text-sm uppercase">
                                Load
                            </button>
                        </div>
                    )}

                    {source === 'previous' && (
                        <div className="space-y-2 max-h-48 overflow-auto">
                            {userResumes.map((r) => (
                                <button
                                    key={r.id}
                                    onClick={() => setSelected(r)}
                                    className="w-full p-3 text-left border border-zinc-800 hover:border-red-900/50 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-zinc-600" />
                                        <span className="text-white">{r.company_name} - {r.role_title}</span>
                                        <span className="text-zinc-600 text-xs ml-auto">
                                            {new Date(r.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {source === 'upload' && (
                        <label className="block bg-zinc-900 border border-dashed border-zinc-700 p-8 text-center cursor-pointer hover:border-red-600 transition-colors">
                            <input
                                type="file"
                                accept=".pdf"
                                className="hidden"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                            />
                            <Upload size={32} className="mx-auto text-zinc-600 mb-2" />
                            <p className="text-zinc-500">Click to upload PDF</p>
                        </label>
                    )}
                </>
            )}
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <Loader2 className="text-red-600 animate-spin" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-gray-100 py-12">
            <div className="max-w-5xl mx-auto px-6">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 border border-red-500/50 bg-red-500/10 px-4 py-1.5 text-red-400 text-xs font-mono uppercase tracking-widest mb-4">
                        <ArrowLeftRight size={14} /> Resume Diff
                    </div>
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter">
                        Diff Viewer
                    </h1>
                    <p className="text-zinc-500 mt-2">See what makes successful resumes stand out</p>
                </div>

                {!result ? (
                    <div className="space-y-8">
                        <div className="grid lg:grid-cols-2 gap-6">
                            {renderSourceSelector(
                                resume1Source, setResume1Source,
                                resume1Search, setResume1Search,
                                resume1Link, setResume1Link,
                                selectedResume1, setSelectedResume1,
                                resume1File, setResume1File,
                                filteredTemplates1,
                                "Resume 1 (Target/Template)"
                            )}
                            {renderSourceSelector(
                                resume2Source, setResume2Source,
                                resume2Search, setResume2Search,
                                resume2Link, setResume2Link,
                                selectedResume2, setSelectedResume2,
                                resume2File, setResume2File,
                                filteredTemplates2,
                                "Resume 2 (Your Resume)"
                            )}
                        </div>

                        <button
                            onClick={handleCompare}
                            disabled={processing}
                            className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold py-4 text-sm uppercase tracking-widest hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {processing ? (
                                <><Loader2 size={18} className="animate-spin" /> Analyzing...</>
                            ) : (
                                <><ArrowLeftRight size={18} /> Run Comparison</>
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-black border border-zinc-800 p-6">
                            <h3 className="text-lg font-bold text-white mb-4">Overall Comparison</h3>
                            <p className="text-zinc-300">{result.overallComparison}</p>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-6">
                            <div className="bg-black border border-green-900/30 p-6">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-green-500 mb-4 flex items-center gap-2">
                                    <CheckCircle size={14} /> Resume 1 Strengths
                                </h3>
                                <ul className="space-y-2">
                                    {result.resume1Strengths.map((s, i) => (
                                        <li key={i} className="text-zinc-300 text-sm flex items-start gap-2">
                                            <CheckCircle size={14} className="text-green-500 mt-0.5 shrink-0" />
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="bg-black border border-blue-900/30 p-6">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-blue-500 mb-4 flex items-center gap-2">
                                    <CheckCircle size={14} /> Resume 2 Strengths
                                </h3>
                                <ul className="space-y-2">
                                    {result.resume2Strengths.map((s, i) => (
                                        <li key={i} className="text-zinc-300 text-sm flex items-start gap-2">
                                            <CheckCircle size={14} className="text-blue-500 mt-0.5 shrink-0" />
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="bg-black border border-amber-900/30 p-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-amber-500 mb-4 flex items-center gap-2">
                                <Lightbulb size={14} /> Suggestions for Improvement
                            </h3>
                            <ul className="space-y-2">
                                {result.suggestions.map((s, i) => (
                                    <li key={i} className="text-zinc-300 text-sm flex items-start gap-2">
                                        <Lightbulb size={14} className="text-amber-500 mt-0.5 shrink-0" />
                                        {s}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <button
                            onClick={() => setResult(null)}
                            className="w-full border border-zinc-700 text-zinc-400 py-3 text-sm uppercase font-bold hover:text-white hover:border-zinc-600"
                        >
                            ← Run Another Comparison
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
