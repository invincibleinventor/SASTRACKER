"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { Filter, Search, Star, ArrowRight, Loader2, FileText, Calendar, GraduationCap } from 'lucide-react';


const supabase = createPagesBrowserClient();
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
export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [filters, setFilters] = useState({ 
    year: searchParams.get('year') || '', 
    subject: searchParams.get('subject') || '', 
    exam: searchParams.get('exam') || '', 
    date: searchParams.get('date') || '',
    marks: searchParams.get('marks') || ''
  });
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  const [displayQuestions, setDisplayQuestions] = useState<any[]>([]);
  const [papers, setPapers] = useState<any[]>([]); // State for storing papers list
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

  // Fetch available papers on mount
  useEffect(() => {
    const fetchPapers = async () => {
      const { data, error } = await supabase
        .from('papers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50); // Fetch latest 50 papers
      
      if (!error && data) {
        setPapers(data);
      }
    };
    fetchPapers();
  }, []);

  const fetchQuestions = useCallback(async (currentFilters: any, currentQuery: string, isNewSearch = false) => {
    const queryKey = JSON.stringify({ ...currentFilters, q: currentQuery });

    if (isNewSearch && feedCache.queryKey === queryKey && feedCache.data.length > 0) {
        console.log("⚡️ Restoring from Cache");
        setDisplayQuestions(feedCache.data);
        setPage(feedCache.page);
        setHasMore(feedCache.hasMore);
        setHasSearched(true);

        return;
    }

    if (!currentQuery && !currentFilters.year && !currentFilters.subject && !currentFilters.exam && !currentFilters.date && !currentFilters.marks) {
        setHasSearched(false); // Reset search state if filters cleared
        return;
    }

    setIsLoading(true);
    const currentPage = isNewSearch ? 0 : page;
    const from = currentPage * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let data: any[] | null = [];
    let error: any = null;

    if (currentQuery) {
        const { data: rpcData, error: rpcError } = await supabase.rpc('search_questions', { keyword: currentQuery });
        if (rpcData) {
            data = rpcData.slice(from, to + 1); 
            if (rpcData.length <= to) setHasMore(false);
        }
        error = rpcError;
    } else {
        let query = supabase.from('questions')
            .select(`*, papers!inner (academic_year, subject, exam_type, exam_year)`)
            .range(from, to);

        if (currentFilters.year) query = query.eq('papers.academic_year', currentFilters.year);
        if (currentFilters.subject) query = query.ilike('papers.subject', `%${currentFilters.subject}%`);
        if (currentFilters.exam) query = query.eq('papers.exam_type', currentFilters.exam);
        if (currentFilters.date) query = query.eq('papers.exam_year', currentFilters.date);
        if (currentFilters.marks) query = query.eq('marks', currentFilters.marks);

        const res = await query;
        data = res.data;
        error = res.error;
    }

    if (!error && data) {
        const formatted = data.map((q: any) => ({
            ...q,
            academic_year: q.academic_year || q.papers?.academic_year,
            subject: q.subject || q.papers?.subject,
            exam_type: q.exam_type || q.papers?.exam_type,
            exam_year: q.exam_year || q.papers?.exam_year,
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
        
        if (!currentQuery) {
            const moreAvailable = data.length === ITEMS_PER_PAGE;
            setHasMore(moreAvailable);
            feedCache.hasMore = moreAvailable;
        }
    }
    setIsLoading(false);
  }, [page, displayQuestions]);

  useEffect(() => {
    const urlFilters = {
        year: searchParams.get('year') || '',
        subject: searchParams.get('subject') || '',
        exam: searchParams.get('exam') || '',
        date: searchParams.get('date') || '',
        marks: searchParams.get('marks') || ''
    };
    const q = searchParams.get('q') || '';
    
    setFilters(urlFilters);
    setSearchQuery(q);

    if (q || urlFilters.year || urlFilters.subject || urlFilters.exam || urlFilters.date || urlFilters.marks) {
        fetchQuestions(urlFilters, q, true);
    } else {
        setHasSearched(false); // Ensure we revert to papers list if URL is cleared
    }
  }, [searchParams]);

  const updateUrl = (newFilters: any, queryStr: string) => {
    const params = new URLSearchParams();
    if (queryStr) {
        params.set('q', queryStr);
    } else {
        if (newFilters.year) params.set('year', newFilters.year);
        if (newFilters.subject) params.set('subject', newFilters.subject);
        if (newFilters.exam) params.set('exam', newFilters.exam);
        if (newFilters.date) params.set('date', newFilters.date);
        if (newFilters.marks) params.set('marks', newFilters.marks);
    }
    router.push(`/?${params.toString()}`);
  };

  const handleSearchClick = () => {
    updateUrl(filters, searchQuery);
  };

  const handleTagClick = (e: React.MouseEvent, key: string, val: string) => {
    e.stopPropagation();
    
    const newFilters = {
        year: '',
        subject: '',
        exam: '',
        date: '',
        marks: '',
        [key]: val 
    };
    
    setFilters(newFilters);
    setSearchQuery(''); 
    updateUrl(newFilters, '');
  };

  // Handle clicking a Paper Card -> Sets filters
  const handlePaperClick = (paper: any) => {
    const newFilters = {
        year: paper.academic_year,
        subject: paper.subject,
        exam: paper.exam_type,
        date: paper.exam_year,
        marks: ''
    };
    setFilters(newFilters);
    updateUrl(newFilters, '');
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

  return (
    <div className="max-w-7xl mx-auto p-6 hide-scrollbar">
      <div className="bg-black border border-zinc-800 p-6 mb-8 lg:sticky top-20 z-40 shadow-2xl shadow-black">
        <div className="mb-6 relative">
            <input 
                type="text" 
                className="w-full text-xs bg-zinc-900 border border-zinc-700 p-4 pl-12 text-white placeholder-zinc-500 focus:border-red-600 outline-none transition-colors"
                placeholder="Search across all questions (e.g., 'Resultant', 'Routhe Array')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
            />
            <Search className="absolute left-4 top-4 text-zinc-500" size={20} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
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
          <select className={styles.input} value={filters.marks} onChange={e => setFilters({...filters, marks: e.target.value})}>
            <option value="">Marks...</option>
            {[1,2,3,4,5,7,8,10,15,20,25].map(m => <option key={m} value={m}>{m} Marks</option>)}
          </select>
          <button onClick={handleSearchClick} className={styles.btnPrimary+' h-full col-span-2 md:col-span-1'}><Search size={14}/> Find</button>
        </div>
      </div>

      <div className="space-y-4 min-h-[50vh]">
        {/* 1. PAPERS LIST (SHOWN WHEN NO FILTERS ARE ACTIVE) */}
        {!hasSearched && !isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-500">
             {papers.length > 0 ? (
                 papers.map(paper => (
                     <div 
                        key={paper.id} 
                        onClick={() => handlePaperClick(paper)}
                        className="bg-black border border-zinc-800 p-6 hover:border-red-900/50 hover:bg-zinc-900/10 cursor-pointer transition-all group relative"
                     >
                         <div className="absolute top-4 right-4 opacity-50 group-hover:opacity-100 transition-opacity">
                             <ArrowRight size={20} className="text-zinc-600 group-hover:text-red-500" />
                         </div>
                         
                         <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-600 mb-3">
                             <GraduationCap size={14} />
                             {paper.academic_year}
                         </div>
                         
                         <h3 className="text-lg font-black text-white mb-2 line-clamp-2 h-14">
                             {paper.subject}
                         </h3>
                         
                         <div className="flex items-center gap-4 text-zinc-500 text-sm font-mono mt-4 border-t border-zinc-900 pt-4">
                             <span className="flex items-center gap-1"><FileText size={12}/> {paper.exam_type}</span>
                             <span className="flex items-center gap-1"><Calendar size={12}/> {paper.exam_year}</span>
                         </div>
                     </div>
                 ))
             ) : (
                 <div className="col-span-full flex flex-col items-center justify-center h-64 text-zinc-600">
                    <p className="text-sm font-mono uppercase">No Papers Available Yet.</p>
                 </div>
             )}
          </div>
        )}

        {/* 2. LOADING STATE */}
        {isLoading && (
             <div className="flex justify-center p-12"><Loader2 size={32} className="animate-spin text-red-600"/></div>
        )}

        {/* 3. QUESTIONS LIST (SHOWN WHEN SEARCHED) */}
        {hasSearched && !isLoading && displayQuestions.map(q => (
          <div key={q.id} onClick={() => navigateToDetail(q.id)} className="hide-scrollbar bg-black border border-zinc-800 p-6 hover:border-red-900/40 cursor-pointer transition-colors group relative flex flex-col">
            <div className="absolute top-4 right-4 text-zinc-500 font-mono text-xs border border-zinc-800 px-2 py-1">
               {q.marks || 0} Marks
            </div>
            <div className="flex flex-wrap gap-2 mb-4 pr-16">
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
                    <div className="text-gray-300 font-sans text-sm font-light leading-relaxed mb-4">
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
               <span className="text-zinc-500 group-hover:text-red-500 flex items-center gap-2 text-[10px] lg:text-xs uppercase font-bold transition-colors">
                 <span className='hidden lg:inline-block'>View</span>Solution <ArrowRight size={14} />
               </span>
               <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1 border border-zinc-800">
                 <Star size={12} className="text-amber-500 fill-amber-500" />
                 <span className="text-[10px] lg:text-xs font-mono font-bold text-zinc-300">
                    <span className="hidden lg:inline-block">Avg</span> Diff: {q.avg_rating > 0 ? q.avg_rating.toFixed(1) : "N/A"} / 5
                 </span>
               </div>
            </div>
          </div>
        ))}
        
        {hasSearched && displayQuestions.length > 0 && hasMore && (
            <div className="flex justify-center pt-8">
                <button onClick={() => fetchQuestions(filters, searchQuery, false)} className="flex items-center gap-2 text-zinc-500 hover:text-white text-xs uppercase font-bold transition-colors" disabled={isLoading}>
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : "Load More"}
                </button>
            </div>
        )}
      </div>
    </div>
  );
}