"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { 
  Upload, FileText, CheckCircle, Edit2, Loader2, Save, Trash2, X, Eye, ImageIcon
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);


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

  return <div ref={containerRef} className="latex-content inline-block w-full break-words" />;
};

const PublishModal = ({ isOpen, onClose, onConfirm }: any) => {
  const [meta, setMeta] = useState({ year: '', subject: '', exam: '', date: '' });
  const [customSubject, setCustomSubject] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  
  const subjectsCache = useRef<Record<string, string[]>>({});

  useEffect(() => {
    if (meta.year) {
      if (subjectsCache.current[meta.year]) {
        setAvailableSubjects(subjectsCache.current[meta.year]);
        return;
      }

      setLoadingSubjects(true);
      supabase.from('subjects').select('subject_name').eq('academic_year', meta.year)
        .then(({ data }) => {
          const subjects = data ? data.map(s => s.subject_name) : [];
          subjectsCache.current[meta.year] = subjects; // Update cache
          setAvailableSubjects(subjects);
          setLoadingSubjects(false);
        });
    } else {
      setAvailableSubjects([]);
    }
  }, [meta.year]);

  const handleConfirm = () => {
    const finalSubject = meta.subject === 'Other' ? customSubject : meta.subject;
    onConfirm({ ...meta, subject: finalSubject, isCustomSubject: meta.subject === 'Other' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-black border border-zinc-700 w-full max-w-md p-8 shadow-2xl shadow-red-900/20 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={20}/></button>
        <h2 className="text-2xl font-black text-white uppercase mb-6">Finalize Paper</h2>
        <div className="space-y-4">
          <div>
            <label className="text-zinc-500 text-[10px] uppercase font-bold block mb-2">Academic Year</label>
            <select className="bg-zinc-900 border border-zinc-700 p-3 text-white w-full text-sm outline-none focus:border-red-600" value={meta.year} onChange={e => setMeta({...meta, year: e.target.value, subject: ''})}>
              <option value="">Select Year...</option>
              <option value="First Year">First Year</option>
              <option value="Second Year">Second Year</option>
              <option value="Third Year">Third Year</option>
              <option value="Fourth Year">Fourth Year</option>
            </select>
          </div>
          
          <div>
            <label className="text-zinc-500 text-[10px] uppercase font-bold block mb-2">Subject</label>
            <select 
                className="bg-zinc-900 border border-zinc-700 p-3 text-white w-full text-sm outline-none focus:border-red-600" 
                value={meta.subject} 
                onChange={e => setMeta({...meta, subject: e.target.value})} 
                disabled={!meta.year}
            >
              <option value="">{loadingSubjects ? "Loading..." : "Select Subject..."}</option>
              {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
              <option value="Other" className="text-amber-500 font-bold">+ Add New Subject</option>
            </select>
            
            {meta.subject === 'Other' && (
                <input 
                    type="text" 
                    className="mt-2 bg-zinc-900 border border-amber-600/50 p-3 text-white w-full text-sm outline-none focus:border-amber-500" 
                    placeholder="Enter new subject name..." 
                    value={customSubject} 
                    onChange={e => setCustomSubject(e.target.value)} 
                />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-zinc-500 text-[10px] uppercase font-bold block mb-2">Exam Name</label>
              <select className="bg-zinc-900 border border-zinc-700 p-3 text-white w-full text-sm outline-none focus:border-red-600" value={meta.exam} onChange={e => setMeta({...meta, exam: e.target.value})}>
                <option value="">Select Type...</option>
                {['CIA - 1', 'CIA - 2', 'CIA - 3', 'End Sem', 'Lab Cia', 'End Sem Lab'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-zinc-500 text-[10px] uppercase font-bold block mb-2">Exam Year</label>
              <input type="number" className="bg-zinc-900 border border-zinc-700 p-3 text-white w-full text-sm outline-none focus:border-red-600" placeholder="2024" value={meta.date} onChange={e => setMeta({...meta, date: e.target.value})} />
            </div>
          </div>
        </div>
        <div className="mt-8">
          <button 
            onClick={handleConfirm} 
            disabled={!meta.year || !meta.subject || (meta.subject === 'Other' && !customSubject) || !meta.exam || !meta.date} 
            className="bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold px-6 py-2 w-full uppercase tracking-wider text-xs hover:opacity-90 disabled:opacity-50"
          >
            Save to Database
          </button>
        </div>
      </div>
    </div>
  );
};

const QuestionEditor = ({ question, onSave, onDelete }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(question.content);
  const [difficulty, setDifficulty] = useState(question.difficulty || 1);
  const [image, setImage] = useState(question.image);
  const fileRef = useRef<HTMLInputElement>(null);
  
  const handleSave = () => { onSave({ ...question, content, difficulty, image, verified: true }); setIsEditing(false); };
  
  return (
    <div className={`bg-black border border-zinc-800 p-6 mb-4 ${question.verified ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-amber-500'}`}>
      <div className="flex items-start gap-4">
        <div className="bg-zinc-900 text-zinc-400 font-mono text-xs px-2 py-1 h-fit border border-zinc-700">Q{question.number}</div>
        <div className="flex-1 w-full min-w-0">
          {isEditing ? (
            <div className="space-y-4">
              <textarea className="bg-zinc-900 border border-zinc-700 p-3 text-white w-full text-sm outline-none focus:border-red-600 font-mono" rows={6} value={content} onChange={(e) => setContent(e.target.value)} />
              
              <div className="flex justify-between items-center border border-zinc-700 p-2 bg-zinc-900/50">
                  <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-zinc-500">Difficulty</span>
                      <select className="bg-black text-white text-xs border border-zinc-700" value={difficulty} onChange={e => setDifficulty(Number(e.target.value))}>
                          {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input 
                      type="file" 
                      ref={fileRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          const reader = new FileReader();
                          reader.onload = (ev) => setImage(ev.target?.result);
                          reader.readAsDataURL(e.target.files[0]);
                        }
                      }} 
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
                  <img src={image} alt="Preview" className="max-h-40 object-contain" />
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
              {image && <img src={image} className="mt-4 border border-zinc-800 bg-black max-h-60" />}
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

export default function UploadPage() {
  const [view, setView] = useState('upload'); 
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/auth');
    });
  }, [router]);

  const handleUpload = (file: File) => {
    setUploadedFile(file);
    setView('processing');
  };

  const handlePublish = async (meta: any) => {
    try {
        if (meta.isCustomSubject) {
            const { data: existingSubs } = await supabase
                .from('subjects')
                .select('id')
                .ilike('subject_name', meta.subject)
                .maybeSingle();
            
            if (!existingSubs) {
                // Insert new subject
                const { error: subError } = await supabase.from('subjects').insert({
                    academic_year: meta.year,
                    subject_name: meta.subject
                });
                if (subError) throw subError;
            }
        }

        const { data: existingPaper, error: checkError } = await supabase
            .from('papers')
            .select('id')
            .eq('academic_year', meta.year)
            .ilike('subject', meta.subject) 
            .eq('exam_type', meta.exam)
            .eq('exam_year', meta.date)
            .maybeSingle();

        if (checkError) throw checkError;

        if (existingPaper) {
            alert(`Duplicate Error: A paper for ${meta.subject} (${meta.exam} ${meta.date}) already exists.`);
            return;
        }

        const { data: paperData, error: paperError } = await supabase.from('papers').insert({
            academic_year: meta.year,
            subject: meta.subject,
            exam_type: meta.exam,
            exam_year: meta.date
        }).select().single();

        if (paperError) throw paperError;

        const questionsToInsert = questions.map(q => ({
            paper_id: paperData.id,
            question_number: q.number,
            content: q.content,
            type: q.type,
            image_path: q.image, 
            difficulty_rating: q.difficulty || 1
        }));

        const { error: qError } = await supabase.from('questions').insert(questionsToInsert);
        if (qError) throw qError;
        
        router.push('/');
    } catch (e) {
        console.error("Publish Error", e);
        alert("Failed to publish. Check console.");
    }
  };



  if (view === 'processing') {
    if (uploadedFile && questions.length === 0) {
       const extract = async () => {
         try {
            const formData = new FormData();
            formData.append('file', uploadedFile);
            const res = await fetch('http://localhost:8000/extract', { method: 'POST', body: formData });
            if (!res.ok) throw new Error("Backend Error");
            const data = await res.json();
            const mapped = data.questions.map((q: any) => ({
                ...q, verified: false, difficulty: 1, 
                image: q.image_base64 || (q.hasImage ? "https://placehold.co/600x200?text=Image+Detected" : null)
            }));
            setQuestions(mapped);
            setView('review');
         } catch (e) {
            alert("The AI Backend has been paused due to an outage or for maintenance. Expect it to work in an hour or two. Please do try uploading later. Meanwhile, explore all other questions");
            setView('upload');
         }
       }
       extract();
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh]">
            <Loader2 size={64} className="text-red-600 animate-spin mb-6" />
            <h2 className="text-2xl font-black uppercase tracking-widest text-white">Extracting Data</h2>
            <p className="text-zinc-500 font-mono text-sm mt-2">Connecting to AI Neural Net...</p>
        </div>
    );
  }

  if (view === 'review') {
    return (
        <div className="max-w-5xl mx-auto p-6">
            <PublishModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onConfirm={handlePublish} 
            />
            
            <div className="flex justify-between items-end mb-8 border-b border-zinc-800 pb-6 sticky top-0 bg-black z-10 pt-4">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Review & Edit</h2>
                    <p className="text-zinc-500 text-sm mt-1 font-mono">{uploadedFile?.name} • {questions.length} Items Extracted</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => setView('upload')} className="text-zinc-500 hover:text-white text-xs font-bold uppercase">Cancel</button>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold px-6 py-2 uppercase tracking-wider text-xs hover:opacity-90 flex items-center gap-2"
                    >
                        <CheckCircle size={16} /> Finalize & Publish
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                {questions.map(q => (
                    <QuestionEditor 
                        key={q.id} 
                        question={q} 
                        onSave={(u: any) => setQuestions(questions.map(x => x.id === u.id ? u : x))} 
                        onDelete={(id: string) => setQuestions(questions.filter(x => x.id !== id))} 
                    />
                ))}
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 animate-in fade-in zoom-in duration-500">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-black text-white mb-4 uppercase tracking-tighter">
          UPLOAD <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-pink-600">PYQS</span>
        </h1>
        <p className="text-zinc-400 text-lg max-w-2xl font-light">One universal repository for all PYQs SASTRA</p>
      </div>
      <div 
        className="w-full max-w-3xl h-64 border-2 border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-900/30 transition-all cursor-pointer flex flex-col items-center justify-center relative group"
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <input 
            id="file-upload" 
            type="file" 
            className="hidden" 
            accept="application/pdf" 
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} 
        />
        <Upload size={48} className="mb-6 text-zinc-500 group-hover:text-red-500 transition-colors" />
        <h3 className="text-xl font-bold text-white uppercase tracking-widest mb-2">Drop PDF Here</h3>
      </div>
    </div>
  );
}