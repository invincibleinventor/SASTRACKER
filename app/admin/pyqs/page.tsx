"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import {
    ShieldCheck, Loader2, LayoutDashboard, FileText, Users,
    MessageSquare, BarChart3, Database, Search, Trash2, Edit2,
    Eye, Calendar, BookOpen, ChevronDown
} from 'lucide-react';
import Link from 'next/link';

const supabase = createPagesBrowserClient();

interface Paper {
    id: string;
    created_at: string;
    subject_name: string;
    exam_category: string;
    year: number;
    date: string;
    author_id: string;
}

interface Question {
    id: string;
    paper_id: string;
    question_text: string;
    marks: number;
    image_url: string;
}

export default function PyQManagement() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [papers, setPapers] = useState<Paper[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
    const [paperQuestions, setPaperQuestions] = useState<Question[]>([]);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [editText, setEditText] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [visiblepapers, setVisiblepapers] = useState(20);
    const papersperpage = 20;

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                router.push('/auth?redirect_to=/admin/pyqs&admin=1');
                return;
            }

            const email = session.user.email?.toLowerCase() || '';
            const { data: admincheck } = await supabase
                .from('admin_users')
                .select('id')
                .eq('email', email)
                .single();

            if (!admincheck) {
                router.push('/resumes');
                return;
            }

            await fetchData();
            setLoading(false);
        };

        init();
    }, [router]);

    const fetchData = async () => {
        const [papersRes, questionsRes] = await Promise.all([
            supabase.from('papers').select('*').order('created_at', { ascending: false }),
            supabase.from('questions').select('*')
        ]);
        setPapers(papersRes.data || []);
        setQuestions(questionsRes.data || []);
    };

    const handleSelectPaper = async (paper: Paper) => {
        setSelectedPaper(paper);
        const qs = questions.filter(q => q.paper_id === paper.id);
        setPaperQuestions(qs);
    };

    const handleDeletePaper = async (id: string) => {
        if (!confirm('Delete this paper and all its questions? This cannot be undone.')) return;
        setActionLoading(id);
        await supabase.from('questions').delete().eq('paper_id', id);
        await supabase.from('papers').delete().eq('id', id);
        await fetchData();
        if (selectedPaper?.id === id) {
            setSelectedPaper(null);
            setPaperQuestions([]);
        }
        setActionLoading(null);
    };

    const handleDeleteQuestion = async (id: string) => {
        if (!confirm('Delete this question?')) return;
        setActionLoading(id);
        await supabase.from('questions').delete().eq('id', id);
        await fetchData();
        setPaperQuestions(paperQuestions.filter(q => q.id !== id));
        setActionLoading(null);
    };

    const handleEditQuestion = (question: Question) => {
        setEditingQuestion(question);
        setEditText(question.question_text);
    };

    const handleSaveQuestion = async () => {
        if (!editingQuestion) return;
        setActionLoading(editingQuestion.id);
        await supabase.from('questions').update({ question_text: editText }).eq('id', editingQuestion.id);
        await fetchData();
        setPaperQuestions(paperQuestions.map(q =>
            q.id === editingQuestion.id ? { ...q, question_text: editText } : q
        ));
        setEditingQuestion(null);
        setActionLoading(null);
    };

    const filteredPapers = papers.filter(p =>
        p.subject_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.exam_category?.toLowerCase().includes(searchQuery.toLowerCase())
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
        { href: '/admin/users', icon: Users, label: 'Users' },
        { href: '/admin/pyqs', icon: Database, label: 'PyQs', active: true },
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
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">PyQ Management</h2>
                        <p className="text-zinc-500">Edit and manage question papers</p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8">
                        <div className="bg-black border border-zinc-800 p-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">
                                Papers ({papers.length})
                            </h3>

                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-2.5 text-zinc-500" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search papers..."
                                    className="w-full bg-zinc-900 border border-zinc-700 p-2 pl-10 text-white text-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2 max-h-[60vh] overflow-auto">
                                {filteredPapers.slice(0, visiblepapers).map((paper) => (
                                    <div
                                        key={paper.id}
                                        className={`p-3 border cursor-pointer transition-colors ${selectedPaper?.id === paper.id
                                            ? 'border-green-600 bg-green-900/10'
                                            : 'border-zinc-800 hover:border-zinc-700'
                                            }`}
                                        onClick={() => handleSelectPaper(paper)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-white font-medium">{paper.subject_name}</p>
                                                <p className="text-zinc-500 text-xs">
                                                    {paper.exam_category} • Year {paper.year} • {paper.date}
                                                </p>
                                                <p className="text-zinc-600 text-xs mt-1">
                                                    {questions.filter(q => q.paper_id === paper.id).length} questions
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeletePaper(paper.id); }}
                                                disabled={actionLoading === paper.id}
                                                className="text-red-500/50 hover:text-red-500"
                                            >
                                                {actionLoading === paper.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {filteredPapers.length > visiblepapers && (
                                    <button
                                        onClick={() => setVisiblepapers(prev => prev + papersperpage)}
                                        className="w-full text-center py-2 text-sm text-zinc-400 hover:text-white border border-zinc-800 hover:border-green-600 flex items-center justify-center gap-2"
                                    >
                                        <ChevronDown size={14} />
                                        Load More ({filteredPapers.length - visiblepapers} remaining)
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="bg-black border border-zinc-800 p-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">
                                {selectedPaper ? `Questions (${paperQuestions.length})` : 'Select a Paper'}
                            </h3>

                            {selectedPaper ? (
                                <div className="space-y-3 max-h-[60vh] overflow-auto">
                                    {paperQuestions.map((question, idx) => (
                                        <div key={question.id} className="p-3 bg-zinc-900/30 border border-zinc-800">
                                            <div className="flex items-start justify-between mb-2">
                                                <span className="text-xs text-zinc-600">Q{idx + 1} • {question.marks} marks</span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEditQuestion(question)}
                                                        className="text-zinc-500 hover:text-white"
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteQuestion(question.id)}
                                                        disabled={actionLoading === question.id}
                                                        className="text-red-500/50 hover:text-red-500"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-zinc-300 text-sm line-clamp-3">{question.question_text}</p>
                                            {question.image_url && (
                                                <img src={question.image_url} alt="" className="mt-2 max-h-20 opacity-70" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-zinc-600 text-sm">Click on a paper to view its questions</p>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {editingQuestion && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6">
                    <div className="bg-zinc-900 border border-zinc-700 max-w-2xl w-full p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Edit Question</h3>
                        <textarea
                            rows={6}
                            className="w-full bg-black border border-zinc-700 p-3 text-white text-sm font-mono"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={handleSaveQuestion}
                                disabled={actionLoading === editingQuestion.id}
                                className="flex-1 bg-green-600 text-white py-2 font-bold text-sm uppercase hover:bg-green-700"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => setEditingQuestion(null)}
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
