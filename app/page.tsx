"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js'; 
import { Filter, Search, Star, ArrowRight, Loader2, Image as ImageIcon } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

let feedCache = {
  queryKey: '', 
  data: [] as any[],
  page: 0,
  hasMore: true,
  scrollPos: 0
};

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

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [filters, setFilters] = useState({ 
    year: searchParams.get('year') || '', 
    subject: searchParams.get('subject') || '', 
    exam: searchParams.get('exam') || '', 
    date: searchParams.get('date') || '' 
  });

  const [displayQuestions, setDisplayQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [filterSubjects, setFilterSubjects] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (filters.year) {
        supabase.from('subjects').select('subject_name').eq('academic_year', filters.year)
            .then(({ data }) => setFilterSubjects(data ? data.map(s => s.subject_name) : []));
    }
  }, [filters.year]);

  const fetchQuestions = useCallback(async (currentFilters: any, isNewSearch = false) => {
    const queryKey = JSON.stringify(currentFilters);


    if (isNewSearch && feedCache.queryKey === queryKey && feedCache.data.length > 0) {
        console.log("⚡️ Restoring from Cache (No DB Call)");
        setDisplayQuestions(feedCache.data);
        setPage(feedCache.page);
        setHasMore(feedCache.hasMore);
        setHasSearched(true);
   
        return;
    }

    if (!currentFilters.year && !currentFilters.subject && !currentFilters.exam && !currentFilters.date) return;

    setIsLoading(true);
    const currentPage = isNewSearch ? 0 : page;
    const from = currentPage * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase.from('questions')
        .select(`*, papers!inner (academic_year, subject, exam_type, exam_year)`)
        .range(from, to);

    if (currentFilters.year) query = query.eq('papers.academic_year', currentFilters.year);
    if (currentFilters.subject) query = query.ilike('papers.subject', `%${currentFilters.subject}%`);
    if (currentFilters.exam) query = query.eq('papers.exam_type', currentFilters.exam);
    if (currentFilters.date) query = query.eq('papers.exam_year', currentFilters.date);

    const { data, error } = await query;

    if (!error && data) {
        const formatted = data.map(q => ({
            ...q,
            academic_year: q.papers.academic_year,
            subject: q.papers.subject,
            exam_type: q.papers.exam_type,
            exam_year: q.papers.exam_year,
            avg_rating: q.avg_rating || 0
        }));

        if (isNewSearch) {
            setDisplayQuestions(formatted);
            setPage(1);
            setHasSearched(true);
            
            feedCache = {
                queryKey,
                data: formatted,
                page: 1,
                hasMore: data.length === ITEMS_PER_PAGE,
                scrollPos: 0
            };
        } else {
            const newData = [...displayQuestions, ...formatted];
            setDisplayQuestions(newData);
            setPage(prev => prev + 1);
            
            feedCache.data = newData;
            feedCache.page = page + 1;
        }
        
        const moreAvailable = data.length === ITEMS_PER_PAGE;
        setHasMore(moreAvailable);
        feedCache.hasMore = moreAvailable;
    }
    setIsLoading(false);
  }, [page, displayQuestions]);

  useEffect(() => {
    const urlFilters = {
        year: searchParams.get('year') || '',
        subject: searchParams.get('subject') || '',
        exam: searchParams.get('exam') || '',
        date: searchParams.get('date') || ''
    };
    
    setFilters(urlFilters);

    if (urlFilters.year || urlFilters.subject || urlFilters.exam || urlFilters.date) {
        fetchQuestions(urlFilters, true);
    }
  }, [searchParams]); 

  const handleSearchClick = () => {
   
    updateUrl(filters);
  };

  const handleTagClick = (e: React.MouseEvent, key: string, val: string) => {
    e.stopPropagation();
    
    const newFilters = {
        year: '',
        subject: '',
        exam: '',
        date: '',
        [key]: val 
    };
    
    setFilters(newFilters);
    updateUrl(newFilters);
  };

  const updateUrl = (newFilters: any) => {
    const params = new URLSearchParams();
    if (newFilters.year) params.set('year', newFilters.year);
    if (newFilters.subject) params.set('subject', newFilters.subject);
    if (newFilters.exam) params.set('exam', newFilters.exam);
    if (newFilters.date) params.set('date', newFilters.date);
    router.push(`/?${params.toString()}`);
  };

  const navigateToDetail = (id: string) => {
    feedCache.scrollPos = window.scrollY;
    router.push(`/question/${id}`);
  };

  const styles = {
    input: "bg-zinc-900 border border-zinc-700 p-3 text-white placeholder-zinc-500 focus:border-red-600 outline-none w-full transition-colors font-mono text-sm",
    btnPrimary: "bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold px-6 py-2 hover:opacity-90 active:scale-95 transition-transform uppercase tracking-wider text-xs flex justify-center items-center gap-2",
    tag: "cursor-pointer bg-zinc-900 border border-zinc-700 text-zinc-400 px-2 py-1 text-[10px] uppercase hover:bg-zinc-800 hover:text-red-400 hover:border-red-900 transition-colors flex items-center gap-1"
  };



    useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) router.push('/auth');
      });
    }, [router]);

    
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-black border border-zinc-800 p-6 mb-8 sticky top-20 z-40 shadow-2xl shadow-black">
        <div className="flex items-center gap-2 mb-4 text-red-500 text-xs font-bold uppercase tracking-widest">
            <Filter size={14} /> Query Bank
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <select className={styles.input} value={filters.year} onChange={e => setFilters({...filters, year: e.target.value, subject: ''})}>
            <option value="">Year...</option>
            <option value="First Year">First Year</option>
            <option value="Second Year">Second Year</option>
            <option value="Third Year">Third Year</option>
            <option value="Fourth Year">Fourth Year</option>
          </select>
          <select className={styles.input} value={filters.subject} onChange={e => setFilters({...filters, subject: e.target.value})} disabled={!filters.year}>
            <option value="">Subject...</option>
            {filterSubjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className={styles.input} value={filters.exam} onChange={e => setFilters({...filters, exam: e.target.value})}>
            <option value="">Exam...</option>
            {['CIA - 1', 'CIA - 2', 'CIA - 3', 'End Sem', 'Lab Cia', 'End Sem Lab'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="number" className={styles.input} placeholder="Year" value={filters.date} onChange={e => setFilters({...filters, date: e.target.value})} />
          <button onClick={handleSearchClick} className={styles.btnPrimary}><Search size={14}/> Search</button>
        </div>
      </div>

      <div className="space-y-4 min-h-[50vh]">
        {!hasSearched && !isLoading && (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-600">
            <Search size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-mono uppercase">Select Filters and click Search</p>
          </div>
        )}

        {isLoading && hasSearched && displayQuestions.length === 0 && (
             <div className="flex justify-center p-12"><Loader2 size={32} className="animate-spin text-red-600"/></div>
        )}

        {displayQuestions.map(q => (
          <div key={q.id} onClick={() => navigateToDetail(q.id)} className="bg-black border border-zinc-800 p-6 hover:border-red-900/40 cursor-pointer transition-colors group relative flex flex-col">
            <div className="flex flex-wrap gap-2 mb-4">
              <span onClick={(e) => handleTagClick(e, 'year', q.academic_year)} className={styles.tag}>{q.academic_year}</span>
              <span onClick={(e) => handleTagClick(e, 'subject', q.subject)} className={styles.tag}>{q.subject}</span>
              <span onClick={(e) => handleTagClick(e, 'exam', q.exam_type)} className={styles.tag}>{q.exam_type}</span>
              <span onClick={(e) => handleTagClick(e, 'date', q.exam_year)} className={styles.tag}>{q.exam_year}</span>
            </div>
            
            <div className="flex gap-4">
                <div className="shrink-0 w-12 pt-1 border-r border-zinc-800 mr-2">
                    <span className="text-zinc-500 font-black text-lg block">Q{q.question_number}</span>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="text-gray-300 text-sm font-light leading-relaxed mb-4">
                    <LatexRenderer text={q.content} />
                    {q.image_path && (
                        <div className="mt-4 border border-zinc-800 bg-zinc-900/50 p-2 inline-block">
                            <img 
                                src={q.image_path} 
                                alt="Question Diagram" 
                                className="max-h-48 object-contain"
                                loading="lazy"
                            />
                        </div>
                    )}
                    </div>
                </div>
            </div>
            
            <div className="flex items-center justify-between border-t border-zinc-900 pt-4 mt-4 ml-16">
               <span className="text-zinc-500 group-hover:text-red-500 flex items-center gap-2 text-xs uppercase font-bold transition-colors">
                 View Solution <ArrowRight size={14} />
               </span>
               <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1 border border-zinc-800">
                 <Star size={12} className="text-amber-500 fill-amber-500" />
                 <span className="text-xs font-mono font-bold text-zinc-300">
                    Avg Diff: {q.avg_rating > 0 ? q.avg_rating.toFixed(1) : "N/A"} / 5
                 </span>
               </div>
            </div>
          </div>
        ))}
        
        {displayQuestions.length > 0 && hasMore && (
            <div className="flex justify-center pt-8">
                <button onClick={() => fetchQuestions(filters, false)} className="flex items-center gap-2 text-zinc-500 hover:text-white text-xs uppercase font-bold transition-colors" disabled={isLoading}>
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : "Load More"}
                </button>
            </div>
        )}
      </div>
    </div>
  );
}