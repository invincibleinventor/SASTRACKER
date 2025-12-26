"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import {
    Sparkles, Loader2, Upload, Download, FileText, Search,
    ArrowRight, Link as LinkIcon, Clock, Building2
} from 'lucide-react';
import type { Resume } from '@/utils/resumeTypes';
import dynamic from 'next/dynamic';

const HtmlEditor = dynamic(() => import('@/components/HtmlEditor'), { ssr: false });

const supabase = createPagesBrowserClient();

function ForkTemplateContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preselectedTemplate = searchParams.get('template');

    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState<Resume[]>([]);
    const [userResumes, setUserResumes] = useState<Resume[]>([]);

    const [templateSearch, setTemplateSearch] = useState('');
    const [templateLink, setTemplateLink] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<Resume | null>(null);

    const [selectedChild, setSelectedChild] = useState<Resume | null>(null);

    const [processing, setProcessing] = useState(false);
    const [extractingTemplate, setExtractingTemplate] = useState(false);
    const [extractingChild, setExtractingChild] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [savingfork, setSavingfork] = useState(false);
    const [server, setServer] = useState('prod');

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                router.push('/auth?redirect_to=/resumes/fork&public=1');
                return;
            }

            setUser(session.user);
            await fetchTemplates();
            await fetchUserResumes(session.user.id);

            if (preselectedTemplate) {
                const { data } = await supabase.from('resumes').select('*').eq('id', preselectedTemplate).single();
                if (data) setSelectedTemplate(data);
            }

            setLoading(false);
        };

        init();
        setServer(process.env.NEXT_PUBLIC_SERVER || 'prod');
    }, [router, preselectedTemplate]);

    const fetchTemplates = async () => {
        const { data } = await supabase
            .from('resumes')
            .select('*')
            .eq('status', 'approved')
            .order('views_count', { ascending: false })
            .limit(50);
        setTemplates(data || []);
    };

    const fetchUserResumes = async (userId: string) => {
        const { data } = await supabase
            .from('resumes')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);
        setUserResumes(data || []);
    };

    const extractResumeIdFromLink = (link: string): string | null => {
        const match = link.match(/\/resumes\/([a-f0-9-]+)/i);
        return match ? match[1] : null;
    };

    const handleTemplateLink = async () => {
        const id = extractResumeIdFromLink(templateLink);
        if (!id) {
            alert('Invalid resume link');
            return;
        }
        const { data } = await supabase.from('resumes').select('*').eq('id', id).single();
        if (data) {
            setSelectedTemplate(data);
            setTemplateLink('');
        } else {
            alert('Resume not found');
        }
    };



    const filteredTemplates = templates.filter(t =>
        t.company_name.toLowerCase().includes(templateSearch.toLowerCase()) ||
        t.role_title.toLowerCase().includes(templateSearch.toLowerCase()) ||
        t.user_name.toLowerCase().includes(templateSearch.toLowerCase())
    );

    const extractText = async (pdfUrl: string): Promise<string> => {
        const formData = new FormData();
        formData.append('url', pdfUrl);

        const res = await fetch(server === 'local' ? 'http://localhost:8000/extract-pdf-text' : 'https://sastrackerbackend.vercel.app/extract-pdf-text', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || data.error);
        return data.text;
    };

    const extractTextFromFile = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(server === 'local' ? 'http://localhost:8000/extract-pdf-text' : 'https://sastrackerbackend.vercel.app/extract-pdf-text', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || data.error);
        return data.text;
    };

    const handleProcess = async () => {
        if (!selectedTemplate) {
            alert('Please select a template resume');
            return;
        }

        if (!selectedChild) {
            alert('Please select your resume');
            return;
        }

        setProcessing(true);

        try {
            setExtractingTemplate(true);
            const templateText = await extractText(selectedTemplate.pdf_url);
            setExtractingTemplate(false);

            setExtractingChild(true);
            const childText = await extractText(selectedChild.pdf_url);
            setExtractingChild(false);

            const res = await fetch(server === 'local' ? 'http://localhost:8000/fork-template' : 'https://sastrackerbackend.vercel.app/fork-template', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    template_text: templateText,
                    child_text: childText
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setResult(data.rewrittenContent);

            await supabase.from('resumes').update({
                fork_count: (selectedTemplate.fork_count || 0) + 1
            }).eq('id', selectedTemplate.id);

        } catch (err: any) {
            alert(err.message || 'Processing failed');
        }

        setProcessing(false);
    };

    const handleDownloadPdf = async () => {
        if (!result) return;
        const res = await fetch(server === 'local' ? 'http://localhost:8000/generate-html' : 'https://sastrackerbackend.vercel.app/generate-html', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: result })
        });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rewritten-resume.html';
        a.click();
    };

    const handleDownloadText = () => {
        if (!result) return;
        const blob = new Blob([result], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rewritten-resume.txt';
        a.click();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <Loader2 className="text-red-600 animate-spin" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-gray-100 py-12">
            <div className="max-w-4xl mx-auto px-6">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 border border-pink-500/50 bg-pink-500/10 px-4 py-1.5 text-pink-400 text-xs font-mono uppercase tracking-widest mb-4">
                        <Sparkles size={14} /> Fork This Template
                    </div>
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter">
                        Transform Your Resume
                    </h1>
                    <p className="text-zinc-500 mt-2">Select a successful template and let AI rewrite your resume to match its style</p>
                </div>

                {!result ? (
                    <div className="space-y-8">
                        <div className="bg-black border border-zinc-800 p-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                                <FileText size={14} /> 1. Select Target Template
                            </h3>

                            {selectedTemplate ? (
                                <div className="bg-zinc-900 border border-pink-900/50 p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-white font-bold">{selectedTemplate.user_name}</p>
                                        <p className="text-pink-400 text-sm">{selectedTemplate.company_name} - {selectedTemplate.role_title}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedTemplate(null)}
                                        className="text-zinc-500 hover:text-white text-xs uppercase font-bold"
                                    >
                                        Change
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex gap-2 mb-4">
                                        <div className="flex-1 relative">
                                            <LinkIcon className="absolute left-3 top-3 text-zinc-500" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Paste resume link (e.g., /resumes/abc-123)"
                                                className="w-full bg-zinc-900 border border-zinc-700 p-3 pl-10 text-white text-sm placeholder-zinc-500"
                                                value={templateLink}
                                                onChange={(e) => setTemplateLink(e.target.value)}
                                            />
                                        </div>
                                        <button
                                            onClick={handleTemplateLink}
                                            className="bg-pink-600 text-white px-4 font-bold text-sm uppercase"
                                        >
                                            Load
                                        </button>
                                    </div>

                                    <div className="relative mb-4">
                                        <Search className="absolute left-3 top-3 text-zinc-500" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Or search templates by company, role, name..."
                                            className="w-full bg-zinc-900 border border-zinc-700 p-3 pl-10 text-white text-sm placeholder-zinc-500"
                                            value={templateSearch}
                                            onChange={(e) => setTemplateSearch(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-auto">
                                        {filteredTemplates.slice(0, 10).map((t) => (
                                            <button
                                                key={t.id}
                                                onClick={() => setSelectedTemplate(t)}
                                                className="bg-zinc-900/50 border border-zinc-800 p-3 text-left hover:border-pink-900/50 transition-colors"
                                            >
                                                <p className="text-pink-400 text-xs font-bold flex items-center gap-1">
                                                    <Building2 size={12} /> {t.company_name}
                                                </p>
                                                <p className="text-white text-sm font-medium">{t.role_title}</p>
                                                <p className="text-zinc-600 text-xs">{t.user_name}</p>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="bg-black border border-zinc-800 p-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                                <FileText size={14} /> 2. Select Your Resume
                            </h3>

                            {userResumes.length === 0 ? (
                                <div className="text-center py-8 border border-dashed border-zinc-700">
                                    <p className="text-zinc-500 mb-2">You don't have any resumes yet</p>
                                    <p className="text-zinc-600 text-sm">Submit a resume first to use this feature</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {userResumes.map((r) => (
                                        <button
                                            key={r.id}
                                            onClick={() => setSelectedChild(r)}
                                            className={`w-full p-3 text-left border transition-colors ${selectedChild?.id === r.id
                                                ? 'border-pink-500 bg-pink-900/10'
                                                : 'border-zinc-800 hover:border-zinc-700'
                                                }`}
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

                            {selectedChild && (
                                <div className="mt-4 bg-zinc-900 border border-green-900/50 p-3">
                                    <p className="text-green-400 text-sm">Selected: {selectedChild.company_name} - {selectedChild.role_title}</p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleProcess}
                            disabled={processing}
                            className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold py-4 text-sm uppercase tracking-widest hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {processing ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    {extractingTemplate ? 'Extracting template...' : extractingChild ? 'Extracting your resume...' : 'Rewriting...'}
                                </>
                            ) : (
                                <><Sparkles size={18} /> Transform My Resume</>
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-black border border-green-900/50 p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-green-500">
                                    {isEditing ? 'Edit Your Resume' : 'Rewritten Resume Preview'}
                                </h3>
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className="text-xs uppercase font-bold text-zinc-400 hover:text-white border border-zinc-600 px-3 py-1"
                                >
                                    {isEditing ? 'Preview' : 'Edit'}
                                </button>
                            </div>
                            {isEditing ? (
                                <HtmlEditor content={result} onChange={setResult} />
                            ) : (
                                <iframe
                                    srcDoc={result}
                                    className="w-full h-[500px] bg-white rounded"
                                    title="Resume Preview"
                                />
                            )}
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={async () => {
                                    if (!selectedTemplate || !selectedChild || !user || !result) return;

                                    setSavingfork(true);

                                    try {
                                        const htmlblob = new Blob([result], { type: 'text/html' });
                                        const filename = `${user.id}_fork_${Date.now()}.html`;
                                        const filepath = `resumes/${filename}`;

                                        const { error: uploadError } = await supabase.storage
                                            .from('resume-files')
                                            .upload(filepath, htmlblob);

                                        if (uploadError) {
                                            alert(`Upload failed: ${uploadError.message}`);
                                            setSavingfork(false);
                                            return;
                                        }

                                        const { data: urldata } = supabase.storage
                                            .from('resume-files')
                                            .getPublicUrl(filepath);

                                        const { data: newresume, error } = await supabase.from('resumes').insert({
                                            user_id: user.id,
                                            user_email: user.email,
                                            user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                                            pdf_url: urldata.publicUrl,
                                            achievement_type: selectedChild.achievement_type || 'job',
                                            company_name: selectedChild.company_name,
                                            role_title: `${selectedChild.role_title} (Forked from ${selectedTemplate.user_name})`,
                                            status: 'approved',
                                            forked_from: selectedTemplate.id
                                        }).select().single();

                                        if (error) {
                                            alert(`Failed to save fork: ${error.message}`);
                                            setSavingfork(false);
                                            return;
                                        }

                                        if (newresume) {
                                            await supabase.from('resumes').update({
                                                fork_count: (selectedTemplate.fork_count || 0) + 1
                                            }).eq('id', selectedTemplate.id);

                                            const a = document.createElement('a');
                                            a.href = urldata.publicUrl;
                                            a.download = 'forked-resume.html';
                                            a.click();

                                            router.push(`/resumes/${newresume.id}`);
                                        }
                                    } catch (err: any) {
                                        alert(`Error: ${err.message || 'Failed to save fork'}`);
                                    } finally {
                                        setSavingfork(false);
                                    }
                                }}
                                disabled={savingfork || !result}
                                className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold py-3 text-sm uppercase flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {savingfork ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                {savingfork ? 'Saving...' : 'Fork & Save Resume'}
                            </button>
                            <button
                                onClick={handleDownloadText}
                                className="flex-1 bg-zinc-900 border border-zinc-700 text-white font-bold py-3 text-sm uppercase flex items-center justify-center gap-2"
                            >
                                <FileText size={16} /> Download Text
                            </button>
                        </div>

                        <button
                            onClick={() => { setResult(null); setIsEditing(false); }}
                            className="w-full border border-zinc-700 text-zinc-400 py-3 text-sm uppercase font-bold hover:text-white hover:border-zinc-600"
                        >
                            ← Try Another
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ForkTemplatePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <Loader2 className="text-red-600 animate-spin" size={32} />
            </div>
        }>
            <ForkTemplateContent />
        </Suspense>
    );
}
