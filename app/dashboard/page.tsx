"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { FileText, Calendar, Trash2, Edit, Loader2, Plus, GraduationCap } from 'lucide-react';

const supabase = createPagesBrowserClient();

export default function Dashboard() {
  const router = useRouter();
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
        return;
      }
      setUser(session.user);
      fetchUserPapers(session.user.id);
    };
    checkUser();
  }, [router]);

  const fetchUserPapers = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('papers')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPapers(data || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePaper = async (paperId: string) => {
    if (!confirm("Are you sure you want to delete this paper? This action cannot be undone.")) return;

    try {
      const { error } = await supabase.from('papers').delete().eq('id', paperId);
      if (error) throw error;
      setPapers(papers.filter(p => p.id !== paperId));
    } catch (error) {
      alert("Failed to delete paper.");
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="text-red-600 animate-spin" size={32} /></div>;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">My Dashboard</h1>
            <p className="text-zinc-500 text-sm mt-1">Manage your contributions</p>
          </div>
          <button
            onClick={() => router.push('/upload')}
            className="bg-zinc-100 text-black font-bold px-4 py-2 text-xs uppercase hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2"
          >
            <Plus size={16} /> Upload New
          </button>
        </div>

        {papers.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-zinc-800 rounded-lg">
            <p className="text-zinc-500 mb-4">You haven't uploaded any papers yet.</p>
            <button onClick={() => router.push('/upload')} className="text-red-500 font-bold hover:underline">Upload your first paper</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {papers.map(paper => (
              <div key={paper.id} className="bg-black border border-zinc-800 p-6 hover:border-zinc-600 transition-all group relative flex flex-col">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-600 mb-3">
                  <GraduationCap size={14} />
                  {paper.academic_year}
                </div>

                <h3 className="text-lg font-black text-white mb-2 line-clamp-2 h-14">
                  {paper.subject}
                </h3>

                <div className="flex items-center gap-4 text-zinc-500 text-sm font-mono mt-4 border-t border-zinc-900 pt-4 mb-6">
                  <span className="flex items-center gap-1"><FileText size={12} /> {paper.exam_type}</span>
                  <span className="flex items-center gap-1"><Calendar size={12} /> {paper.exam_year}</span>
                </div>

                <div className="mt-auto flex gap-2">
                  <button
                    onClick={() => router.push(`/dashboard/${paper.id}`)}
                    className="flex-1 bg-zinc-900 text-white border border-zinc-700 py-2 text-xs font-bold uppercase hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit size={14} /> Edit Questions
                  </button>
                  <button
                    onClick={() => handleDeletePaper(paper.id)}
                    className="px-3 bg-zinc-900 text-red-500 border border-zinc-700 py-2 hover:bg-red-900/20 hover:border-red-900 transition-colors"
                    title="Delete Paper"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}