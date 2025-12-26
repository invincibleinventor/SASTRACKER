"use client";

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { ArrowLeft, Loader2, GitFork, Building2, User, Calendar } from 'lucide-react';
import Link from 'next/link';
import type { Resume } from '@/utils/resumeTypes';

const supabase = createPagesBrowserClient();

export default function ResumeForks({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [parentResume, setParentResume] = useState<Resume | null>(null);
    const [forks, setForks] = useState<Resume[]>([]);

    useEffect(() => {
        const init = async () => {
            const { data: parent } = await supabase
                .from('resumes')
                .select('*')
                .eq('id', id)
                .single();

            if (!parent) {
                router.push('/resumes');
                return;
            }

            setParentResume(parent);

            const { data: forkedResumes } = await supabase
                .from('resumes')
                .select('*')
                .eq('forked_from', id)
                .order('created_at', { ascending: false });

            setForks(forkedResumes || []);
            setLoading(false);
        };

        init();
    }, [id, router]);

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
                <button
                    onClick={() => router.back()}
                    className="flex items-center text-zinc-500 hover:text-red-500 mb-6 transition-colors"
                >
                    <ArrowLeft size={20} className="mr-2" /> Back
                </button>

                {parentResume && (
                    <div className="bg-black border border-zinc-800 p-6 mb-8">
                        <h1 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                            <GitFork className="text-purple-500" size={24} />
                            Forks of this Resume
                        </h1>
                        <Link href={`/resumes/${parentResume.id}`} className="text-red-400 hover:underline mt-2 inline-block">
                            {parentResume.company_name} - {parentResume.role_title}
                        </Link>
                        <p className="text-zinc-500 text-sm mt-1">by {parentResume.user_name}</p>
                    </div>
                )}

                {forks.length === 0 ? (
                    <div className="text-center py-12">
                        <GitFork className="text-zinc-700 mx-auto mb-4" size={48} />
                        <p className="text-zinc-500">No forks yet</p>
                        <p className="text-zinc-600 text-sm mt-2">Be the first to fork this resume!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-zinc-500 text-sm">{forks.length} fork{forks.length !== 1 ? 's' : ''}</p>
                        {forks.map((fork) => (
                            <Link
                                key={fork.id}
                                href={`/resumes/${fork.id}`}
                                className="block bg-black border border-zinc-800 hover:border-purple-900/50 p-4 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-white font-bold">{fork.role_title}</p>
                                        <p className="text-red-400 text-sm flex items-center gap-1">
                                            <Building2 size={12} /> {fork.company_name}
                                        </p>
                                        <p className="text-zinc-500 text-xs mt-1 flex items-center gap-3">
                                            <span className="flex items-center gap-1"><User size={10} /> {fork.user_name}</span>
                                            <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(fork.created_at).toLocaleDateString()}</span>
                                        </p>
                                    </div>
                                    <div className="text-purple-400 text-xs font-bold flex items-center gap-1">
                                        <GitFork size={12} /> FORK
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
