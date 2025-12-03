"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { ArrowLeft, Loader2, Save, Trash2, CheckCircle, Edit2, Eye, ImageIcon } from 'lucide-react';

const supabase = createPagesBrowserClient();

// Inline LatexRenderer to ensure no import issues and match Upload page style
const LatexRenderer = ({ text }: { text: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if ((window as any).katex) { setIsLoaded(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!text || !containerRef.current) return;
    if (isLoaded) {
      try {
        const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/g);
        containerRef.current.innerHTML = '';
        parts.forEach(part => {
          if (part.startsWith('$$') && part.endsWith('$$')) {
             const span = document.createElement('div');
             const cleanMath = part.slice(2, -2).replace(/\\\\/g, '\\'); 
             (window as any).katex.render(cleanMath, span, { displayMode: true, throwOnError: false }); 
             containerRef.current?.appendChild(span);
          } else if (part.startsWith('$') && part.endsWith('$')) {
            const span = document.createElement('span');
            const cleanMath = part.slice(1, -1).replace(/\\\\/g, '\\');
            (window as any).katex.render(cleanMath, span, { throwOnError: false }); 
            containerRef.current?.appendChild(span);
          } else {
            containerRef.current?.appendChild(document.createTextNode(part));
          }
        });
      } catch (e) {
        containerRef.current.innerText = text;
      }
    } else {
      containerRef.current.innerText = text;
    }
  }, [text, isLoaded]);

  return <div ref={containerRef} className="latex-content hide-scrollbar overflow-x-auto inline-block w-full break-words" />;
};

const QuestionEditor = ({ question, onSave, onDelete }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(question.content);
  const [difficulty, setDifficulty] = useState(question.difficulty_rating || 1);
  const [marks, setMarks] = useState(question.marks || 0);
  // image state will hold either the existing path (string) or a new file (File object)
  const [image, setImage] = useState<string | File | null>(question.image_path);
  const fileRef = useRef<HTMLInputElement>(null);
  
  const handleSave = async () => { 
    // Call onSave to propagate changes to parent/DB. The parent will handle image upload.
    await onSave({ 
        ...question, 
        content, 
        difficulty_rating: difficulty, 
        marks, 
        image_file: image instanceof File ? image : null, // Pass file for upload
        image_path: typeof image === 'string' ? image : null // Pass path if keeping existing
    });
    setIsEditing(false); 
  };
  
  // Helper to display image preview (works for both URL and File object)
  const getImagePreview = () => {
    if (!image) return null;
    if (typeof image === 'string') return image;
    return URL.createObjectURL(image);
  };

  return (
    <div className="bg-black border border-zinc-800 p-6 mb-4">
      <div className="flex items-start gap-4">
        <div className="bg-zinc-900 text-zinc-400 font-mono text-xs px-2 py-1 h-fit border border-zinc-700">Q{question.question_number}</div>
        <div className="flex-1 w-full min-w-0">
          {isEditing ? (
            <div className="space-y-4">
              <textarea className="bg-zinc-900 border border-zinc-700 p-3 text-white w-full text-sm outline-none focus:border-red-600 font-mono" rows={6} value={content} onChange={(e) => setContent(e.target.value)} />
              
              <div className="flex justify-between items-center border border-zinc-700 p-2 bg-zinc-900/50">
                  <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold text-zinc-500">Difficulty</span>
                          <select className="bg-black text-white text-xs border border-zinc-700" value={difficulty} onChange={e => setDifficulty(Number(e.target.value))}>
                              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                      </div>
                      <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold text-zinc-500">Marks</span>
                          <input type="number" className="bg-black text-white text-xs border border-zinc-700 w-16 p-1" value={marks} onChange={e => setMarks(Number(e.target.value))} />
                      </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input 
                      type="file" 
                      ref={fileRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={(e) => e.target.files?.[0] && setImage(e.target.files[0])} 
                    />
                    <button 
                      onClick={() => fileRef.current?.click()} 
                      className="text-xs text-red-400 uppercase font-bold flex items-center gap-1 hover:text-red-300"
                    >
                      <ImageIcon size={14} /> {image ? 'Replace Image' : 'Add Image'}
                    </button>
                    {image && (
                      <button onClick={() => setImage(null)} className="text-zinc-500 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
              </div>

              {image && (
                <div className="border border-zinc-800 bg-black p-2">
                  <img src={getImagePreview()!} alt="Preview" className="max-h-40 object-contain" />
                </div>
              )}

              <div className="bg-zinc-900/30 p-4 border border-zinc-800/50">
                 <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-zinc-500 uppercase"><Eye size={12} /> Live Preview</div>
                 <div className="prose prose-invert max-w-none text-gray-300 text-sm"><LatexRenderer text={content} /></div>
              </div>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none text-gray-200 text-sm font-light leading-relaxed">
              <LatexRenderer text={content} />
              {question.image_path && <img src={question.image_path} className="mt-4 border border-zinc-800 bg-black max-h-60" />}
              <div className="mt-2 text-xs text-zinc-500 font-mono text-right">Marks: {marks}</div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0 border-l border-zinc-800 pl-4 ml-2">
          {isEditing ? (
            <button onClick={handleSave} className="text-green-500 hover:scale-110 transition"><CheckCircle size={18} /></button>
          ) : (
            <button onClick={() => setIsEditing(true)} className="text-zinc-500 hover:text-white transition"><Edit2 size={18} /></button>
          )}
          <button onClick={() => onDelete(question.id)} className="text-zinc-500 hover:text-red-500 transition"><Trash2 size={18} /></button>
        </div>
      </div>
    </div>
  );
};

export default function EditPaperPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const [questions, setQuestions] = useState<any[]>([]);
  const [paper, setPaper] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
           router.push('/auth');
           return;
        }

        const { data: paperData, error: paperError } = await supabase
            .from('papers')
            .select('*')
            .eq('id', id)
            .single();
        
        if (paperError) throw paperError;
        
        if (paperData.user_id !== session.user.id) {
          router.push('/dashboard');
        }
        setPaper(paperData);

        const { data: qData, error: qError } = await supabase
            .from('questions')
            .select('*')
            .eq('paper_id', id)
            .order('question_number', { ascending: true });
            
        if (qError) throw qError;
        
        setQuestions(qData || []);
      } catch (err: any) {
        console.error("Fetch Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  const handleUpdateQuestion = async (updatedQ: any) => {
    try {
        let finalImagePath = updatedQ.image_path;

        if (updatedQ.image_file) {
            const fileExt = updatedQ.image_file.name.split('.').pop();
            const fileName = `${id}/${updatedQ.id}-${Math.random()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('question-images')
                .upload(fileName, updatedQ.image_file);
                
            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('question-images')
                .getPublicUrl(fileName);
                
            finalImagePath = urlData.publicUrl;
        }

        const { error } = await supabase
            .from('questions')
            .update({
                content: updatedQ.content,
                difficulty_rating: updatedQ.difficulty_rating,
                marks: updatedQ.marks,
                image_path: finalImagePath
            })
            .eq('id', updatedQ.id);
        
        if (error) throw error;

        setQuestions(questions.map(q => q.id === updatedQ.id ? {
            ...updatedQ,
            image_path: finalImagePath,
            image_file: undefined 
        } : q));

    } catch (e) {
        console.error(e);
        alert("Failed to update question. Check console.");
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm("Delete this question?")) return;
    try {
        const { error } = await supabase.from('questions').delete().eq('id', qId);
        if (error) throw error;
        setQuestions(questions.filter(q => q.id !== qId));
    } catch (e) {
        alert("Failed to delete question.");
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="text-red-600 animate-spin" size={32}/></div>;
  if (error) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-neutral-950 text-gray-100 font-sans p-6">
        <div className="max-w-5xl mx-auto">
            <button onClick={() => router.back()} className="flex items-center text-zinc-500 hover:text-red-500 mb-6 transition-colors">
                <ArrowLeft size={20} className="mr-2" /> Back to Dashboard
            </button>

            <div className="flex justify-between items-end mb-8 border-b border-zinc-800 pb-6">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Edit Paper</h2>
                    <p className="text-zinc-500 text-sm mt-1 font-mono">{paper?.subject} ({paper?.exam_year})</p>
                </div>
            </div>

            {questions.length === 0 ? (
                <div className="text-zinc-500 text-center py-10">No questions found for this paper.</div>
            ) : (
                <div className="space-y-2">
                    {questions.map(q => (
                        <QuestionEditor 
                            key={q.id} 
                            question={q} 
                            onSave={handleUpdateQuestion} 
                            onDelete={handleDeleteQuestion} 
                        />
                    ))}
                </div>
            )}
        </div>
    </div>
  );
}