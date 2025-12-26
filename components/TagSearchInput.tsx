"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { Search, X, Plus, Loader2 } from 'lucide-react';

const supabase = createPagesBrowserClient();

interface TagSearchInputProps {
    tablename: 'categories' | 'tech_stacks' | 'skills';
    selectedtags: string[];
    ontagschange: (tags: string[]) => void;
    placeholder?: string;
    maxselections?: number;
    showselected?: boolean;
}

export default function TagSearchInput({
    tablename,
    selectedtags,
    ontagschange,
    placeholder = 'Search or add...',
    maxselections,
    showselected = true
}: TagSearchInputProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isopen, setIsopen] = useState(false);
    const inputref = useRef<HTMLInputElement>(null);
    const containerref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleclickoutside = (e: MouseEvent) => {
            if (containerref.current && !containerref.current.contains(e.target as Node)) {
                setIsopen(false);
            }
        };
        document.addEventListener('mousedown', handleclickoutside);
        return () => document.removeEventListener('mousedown', handleclickoutside);
    }, []);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        const searchtags = async () => {
            setLoading(true);
            const { data } = await supabase
                .from(tablename)
                .select('*')
                .ilike('name', `%${query}%`)
                .limit(10);
            setResults(data || []);
            setLoading(false);
        };

        const debounce = setTimeout(searchtags, 200);
        return () => clearTimeout(debounce);
    }, [query, tablename]);

    const handleselect = (name: string) => {
        if (!selectedtags.includes(name)) {
            if (maxselections && selectedtags.length >= maxselections) return;
            ontagschange([...selectedtags, name]);
        }
        setQuery('');
        setResults([]);
        setIsopen(false);
    };

    const handlecreate = async () => {
        if (!query.trim()) return;

        const normalized = query.trim();
        if (selectedtags.includes(normalized)) {
            setQuery('');
            return;
        }

        setLoading(true);

        const insertdata: any = { name: normalized };
        if (tablename === 'categories') {
            insertdata.slug = normalized.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        }

        const { error } = await supabase.from(tablename).insert(insertdata);

        if (!error) {
            if (maxselections && selectedtags.length >= maxselections) {
                setLoading(false);
                return;
            }
            ontagschange([...selectedtags, normalized]);
        }

        setQuery('');
        setResults([]);
        setIsopen(false);
        setLoading(false);
    };

    const handleremove = (tag: string) => {
        ontagschange(selectedtags.filter(t => t !== tag));
    };

    const exactmatch = results.some(r => r.name.toLowerCase() === query.toLowerCase().trim());

    return (
        <div ref={containerref} className="relative">
            <div className="relative">
                <Search className="absolute left-3 top-3 text-zinc-500" size={16} />
                <input
                    ref={inputref}
                    type="text"
                    placeholder={placeholder}
                    className="w-full bg-zinc-900 border border-zinc-700 p-2.5 pl-10 text-white text-sm placeholder-zinc-600 focus:border-red-600 outline-none"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsopen(true)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && query.trim()) {
                            e.preventDefault();
                            if (!exactmatch) {
                                handlecreate();
                            } else {
                                const match = results.find(r => r.name.toLowerCase() === query.toLowerCase().trim());
                                if (match) handleselect(match.name);
                            }
                        }
                    }}
                />
                {loading && <Loader2 className="absolute right-3 top-3 text-zinc-500 animate-spin" size={16} />}
            </div>

            {isopen && (query.trim() || results.length > 0) && (
                <div className="absolute z-50 w-full mt-1 bg-black border border-zinc-700 max-h-60 overflow-y-auto">
                    {results.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => handleselect(item.name)}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-800 transition-colors ${selectedtags.includes(item.name) ? 'text-zinc-600' : 'text-white'
                                }`}
                            disabled={selectedtags.includes(item.name)}
                        >
                            {item.name}
                            {selectedtags.includes(item.name) && <span className="text-zinc-600 ml-2">(selected)</span>}
                        </button>
                    ))}

                    {query.trim() && !exactmatch && (
                        <button
                            type="button"
                            onClick={handlecreate}
                            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-zinc-800 transition-colors flex items-center gap-2 border-t border-zinc-800"
                        >
                            <Plus size={14} />
                            Create "{query.trim()}"
                        </button>
                    )}

                    {query.trim() && results.length === 0 && !loading && (
                        <button
                            type="button"
                            onClick={handlecreate}
                            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-zinc-800 transition-colors flex items-center gap-2"
                        >
                            <Plus size={14} />
                            Create "{query.trim()}"
                        </button>
                    )}
                </div>
            )}

            {showselected && selectedtags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                    {selectedtags.map((tag) => (
                        <span key={tag} className="bg-red-600/20 text-red-400 border border-red-500/30 px-3 py-1 text-sm flex items-center gap-2">
                            {tag}
                            <button type="button" onClick={() => handleremove(tag)}>
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
