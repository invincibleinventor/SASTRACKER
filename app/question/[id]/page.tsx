'use client';


import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation'; 
import { ArrowLeft, Star, User, Clock, Send, Paperclip, ChevronUp, ChevronDown, Loader2, X, Info, Sparkles, Bot } from 'lucide-react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
const supabase = createPagesBrowserClient();

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
        // Updated Regex to support $...$, $$...$$, and `...`
        const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$|`[\s\S]+?`)/g);
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
          } else if (part.startsWith('`') && part.endsWith('`')) {
            // Handle backticks as inline math (Common AI fallback)
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
export default function QuestionDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  
  const [user, setUser] = useState<any>(null);
  const [question, setQuestion] = useState<any>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, number>>({}); 
  const [userRating, setUserRating] = useState<number | null>(null);
  
  const [newAnswer, setNewAnswer] = useState('');
  const [answerImage, setAnswerImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [uploading, setUploading] = useState(false);
  const answerFileRef = useRef<HTMLInputElement>(null);
const[server,setServer]=useState('prod');
  // Check Auth
  useEffect(() => {
    setServer(process.env.NEXT_PUBLIC_SERVER || 'prod');
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
  }, []);

  // Fetch Data
  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      
      // 1. Question
      const { data: qData } = await supabase
        .from('questions')
        .select(`*, papers (academic_year, subject, exam_type, exam_year)`)
        .eq('id', id)
        .single();
      setQuestion(qData);

      // 2. User Answers
      const { data: aData } = await supabase
        .from('answers')
        .select('*')
        .eq('question_id', id)
        .order('net_votes', { ascending: false });
      setAnswers(aData || []);

      // 3. AI Answer
      const { data: aiData } = await supabase
        .from('ai_answers')
        .select('content')
        .eq('question_id', id)
        .maybeSingle();
      
      if (aiData) setAiAnswer(aiData.content);

      // 4. User specific data
      if (user) {
        const { data: vData } = await supabase.from('answer_votes').select('answer_id, vote_value').eq('user_id', user.id);
        const votesMap: Record<string, number> = {};
        vData?.forEach((v: any) => votesMap[v.answer_id] = v.vote_value);
        setUserVotes(votesMap);

        const { data: rData } = await supabase.from('question_ratings').select('rating').eq('user_id', user.id).eq('question_id', id).single();
        if (rData) setUserRating(rData.rating);
      }
      
      setLoading(false);
    };

    if (user !== undefined) fetchData(); 
  }, [id, user]);

  // --- Handlers ---

  const handleGenerateAI = async () => {
    if (!user) return router.push('/auth');
    setGeneratingAI(true);

    try {
        // Call your backend
                const res = await fetch(server=='local'?'http://localhost:8000/solve':'https://sastrackerbackend.vercel.app/solve', {

            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: question.content,
                image_url: question.image_path // Pass the image URL if it exists
            })
        });

        if (!res.ok) throw new Error("AI Generation Failed");
        const data = await res.json();
        const solution = data.solution;

        // Save to DB
        const { error } = await supabase.from('ai_answers').insert({
            question_id: id,
            content: solution
        });

        if (error) throw error;
        setAiAnswer(solution);
        
    } catch (e) {
        alert("Failed to generate AI solution. Please try again later.");
        console.error(e);
    } finally {
        setGeneratingAI(false);
    }
  };

  const handlePostAnswer = async () => {
    if (!user) return router.push('/auth');
    if (!newAnswer.trim() && !answerImage) return;
    
    setUploading(true);
    let imageUrl = null;

    try {
        if (answerImage) {
            const fileExt = answerImage.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${id}/${fileName}`;
            await supabase.storage.from('answer-images').upload(filePath, answerImage);
            const { data } = supabase.storage.from('answer-images').getPublicUrl(filePath);
            imageUrl = data.publicUrl;
        }

        const { data, error } = await supabase.from('answers').insert({
            question_id: id,
            content: newAnswer,
            author_name: user.email?.split('@')[0] || 'Anonymous', 
            image_url: imageUrl,
            net_votes: 0,
            user_id: user.id
        }).select();

        if (error) throw error;

        setAnswers(prev => [data[0], ...prev]);
        setNewAnswer("");
        setAnswerImage(null);
    } catch (error: any) {
        alert(`Failed to post: ${error.message}`);
    } finally {
        setUploading(false);
    }
  };

  const handleRateQuestion = async (rating: number) => {
    if (!user) return router.push('/auth');
    setUserRating(rating);

    const { error } = await supabase.from('question_ratings').upsert({
      user_id: user.id,
      question_id: id,
      rating: rating
    }, { onConflict: 'user_id, question_id' });

    if (error) {
      console.error("Rating failed", error);
      return;
    }

    const { data: allRatings } = await supabase.from('question_ratings').select('rating').eq('question_id', id);
    if (allRatings) {
      const total = allRatings.reduce((acc, curr) => acc + curr.rating, 0);
      const avg = total / allRatings.length;
      await supabase.from('questions').update({ 
        avg_rating: avg, 
        rating_count: allRatings.length 
      }).eq('id', id);
      
      setQuestion((prev: any) => ({ ...prev, avg_rating: avg, rating_count: allRatings.length }));
    }
  };

  const handleVote = async (answerId: string, type: 1 | -1) => {
    if (!user) return router.push('/auth');

    const currentVote = userVotes[answerId]; 
    let newVoteValue: number | null = type;
    let voteDelta = 0;
   
    if (currentVote === type) {
      newVoteValue = null;
      voteDelta = -type; 
      await supabase.from('answer_votes').delete().match({ user_id: user.id, answer_id: answerId });
    } else if (currentVote) {
      voteDelta = type * 2;
      await supabase.from('answer_votes').update({ vote_value: type }).match({ user_id: user.id, answer_id: answerId });
    } else {
      voteDelta = type;
      await supabase.from('answer_votes').insert({ user_id: user.id, answer_id: answerId, vote_value: type });
    }

    const nextVotes = { ...userVotes };
    if (newVoteValue === null) delete nextVotes[answerId];
    else nextVotes[answerId] = newVoteValue;
    setUserVotes(nextVotes);

    setAnswers(prev => prev.map(a => {
      if (a.id === answerId) {
        const newNet = (a.net_votes || 0) + voteDelta;
        supabase.from('answers').update({ net_votes: newNet }).eq('id', answerId).then(); 
        return { ...a, net_votes: newNet };
      }
      return a;
    }));
  };

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center"><Loader2 className="animate-spin text-red-600" /></div>;
  if (!question) return <div className="min-h-screen bg-neutral-950 text-gray-100 font-sans p-6">
    <div className="text-center pt-20 text-gray-400">Question not found.</div>
  </div>;

  return (
    <div className="min-h-screen bg-neutral-950 text-gray-100 font-sans p-6">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center text-zinc-500 hover:text-red-500 mb-6 transition-colors">
          <ArrowLeft size={20} className="mr-2" /> Back to Bank
        </button>

        {/* Question Card */}
        <div className="bg-zinc-900 border border-zinc-800 p-8 mb-8 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-600 to-pink-600"></div>
          <div className="absolute top-4 right-4 text-xs font-mono border border-zinc-700 px-2 py-1 text-zinc-400">
            Q{question.question_number} • {question.marks || 0} Marks
          </div>
          
          <div className="flex gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-zinc-500 pr-24">
            <span>{question.papers?.academic_year}</span> •
            <span className="text-red-500">{question.papers?.subject}</span> •
            <span>{question.papers?.exam_type} {question.papers?.exam_year}</span>
          </div>

          <div className="text-xl md:text-2xl leading-relaxed font-light text-white mb-6">
            <LatexRenderer text={question.content} />
            {question.image_path && (
                <img src={question.image_path} alt="Question Diagram" className="mt-6 max-h-96 rounded border border-zinc-700 block" />
            )}
          </div>

          <div className="border-t border-zinc-800 pt-4 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-1 text-xs uppercase font-bold text-zinc-600">
                Rate Difficulty:
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button 
                    key={star} 
                    onClick={() => handleRateQuestion(star)}
                    className={`hover:scale-110 transition-transform ${userRating && star <= userRating ? "text-amber-500" : "text-zinc-700"}`}
                >
                  <Star size={20} className={userRating && star <= userRating ? "fill-current" : ""} />
                </button>
              ))}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-2">
                <Info size={12}/> 
                <span>1 Star = Easy, 5 Stars = Very Hard</span>
                <span className="text-zinc-700">|</span>
                <span>Avg: <span className="text-white">{question.avg_rating?.toFixed(1) || "N/A"}</span> ({question.rating_count || 0} votes)</span>
            </div>
          </div>
        </div>

        {/* AI Solution Section */}
        <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
                <Sparkles size={18} className="text-purple-500" />
                <h3 className="text-lg font-black text-white uppercase tracking-tighter">AI Solution</h3>
            </div>
            
            {aiAnswer ? (
                <div className="bg-zinc-900/50 border border-purple-500/30 p-6 rounded-lg">
                    <div className="flex items-center gap-2 mb-4 text-purple-400 text-xs font-bold uppercase tracking-widest">
                        <Bot size={16} /> Generated by AI
                    </div>
                    <div className="text-gray-300 leading-relaxed">
                        <LatexRenderer text={aiAnswer} />
                    </div>
                </div>
            ) : (
                <div className="bg-zinc-900/30 border border-zinc-800 border-dashed p-8 text-center">
                    <p className="text-zinc-500 text-sm mb-4">No AI solution generated yet.</p>
                    <button 
                        onClick={handleGenerateAI}
                        disabled={generatingAI}
                        className="bg-white text-black font-bold px-6 py-3 text-xs uppercase hover:bg-purple-500 hover:text-white transition-colors inline-flex items-center gap-2 disabled:opacity-50"
                    >
                        {generatingAI ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16} />}
                        {generatingAI ? "Solving..." : "Generate AI Solution"}
                    </button>
                </div>
            )}
        </div>

        {/* Human Answers Section */}
        <div className="bg-black border border-zinc-800 p-6 mb-10 shadow-lg">
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500 mb-4">Contribute Solution</h3>
            <textarea 
              className="w-full bg-zinc-900/50 border border-zinc-700 p-4 text-sm text-white focus:border-red-600 outline-none transition-colors min-h-[120px]"
              placeholder="Write your answer (Markdown/LaTeX supported)..."
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
            />
            
            {answerImage && (
                <div className="mt-4 relative w-fit">
                    <img src={URL.createObjectURL(answerImage)} className="h-24 rounded border border-zinc-700" />
                    <button onClick={() => setAnswerImage(null)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1"><X size={12}/></button>
                </div>
            )}

            <div className="flex justify-between items-center mt-4">
                <button onClick={() => answerFileRef.current?.click()} className="text-zinc-400 hover:text-white text-xs font-bold uppercase flex items-center gap-2">
                    <Paperclip size={16} /> {answerImage ? "Replace Image" : "Attach Image"}
                </button>
                <input type="file" ref={answerFileRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && setAnswerImage(e.target.files[0])} />
                
                <button 
                    onClick={handlePostAnswer}
                    disabled={uploading}
                    className="bg-zinc-100 text-black font-bold px-6 py-2 text-xs uppercase hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Post Answer
                </button>
            </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 text-white">
            Community Solutions <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-1 rounded-full">{answers.length}</span>
          </h3>

          {answers.map(ans => {
            const myVote = userVotes[ans.id] || 0; 
            
            return (
                <div key={ans.id} className="flex gap-4 border-l-2 border-zinc-800 pl-4 py-4 hover:border-red-900/50 transition-colors">
                <div className="flex flex-col items-center gap-1 min-w-[32px] pt-1">
                    <button 
                        onClick={() => handleVote(ans.id, 1)} 
                        className={`p-1 transition-colors rounded ${myVote === 1 ? 'text-green-500 bg-green-900/20' : 'text-zinc-600 hover:text-green-500 hover:bg-zinc-900'}`}
                    >
                        <ChevronUp size={24} />
                    </button>
                    <span className={`text-sm font-bold font-mono ${ans.net_votes > 0 ? 'text-green-500' : ans.net_votes < 0 ? 'text-red-500' : 'text-zinc-500'}`}>
                        {ans.net_votes || 0}
                    </span>
                    <button 
                        onClick={() => handleVote(ans.id, -1)} 
                        className={`p-1 transition-colors rounded ${myVote === -1 ? 'text-red-500 bg-red-900/20' : 'text-zinc-600 hover:text-red-500 hover:bg-zinc-900'}`}
                    >
                        <ChevronDown size={24} />
                    </button>
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-zinc-800 p-1 rounded-full"><User size={12} className="text-zinc-400"/></div>
                        <span className="text-sm font-bold text-zinc-300">{ans.author_name}</span>
                        <span className="text-xs text-zinc-600 flex items-center gap-1"><Clock size={10}/> {new Date(ans.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-zinc-400 text-sm leading-relaxed mb-3">
                        <LatexRenderer text={ans.content} />
                    </div>
                    {ans.image_url && (
                        <img src={ans.image_url} alt="Answer Attachment" className="max-h-64 rounded border border-zinc-800" />
                    )}
                </div>
                </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}