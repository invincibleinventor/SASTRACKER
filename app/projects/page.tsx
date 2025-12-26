"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import {
    Search, Rocket, Eye, Heart, MessageSquare, ExternalLink, Github,
    ArrowRight, Plus, Code, Smartphone, Brain, Database as DbIcon,
    Server, Gamepad2, Cpu, MoreHorizontal, ArrowDown, Sparkles, Filter,
    Play, Star, Loader2, GraduationCap
} from 'lucide-react';
import gsap from 'gsap';
import Link from 'next/link';

const supabase = createPagesBrowserClient();

interface Project {
    id: string;
    created_at: string;
    user_id: string;
    user_name: string;
    user_avatar?: string;
    title: string;
    tagline?: string;
    description: string;
    tech_stack: string[];
    tags: string[];
    live_url?: string;
    github_url?: string;
    demo_video_url?: string;
    thumbnail_url?: string;
    images: string[];
    status: string;
    is_featured: boolean;
    views_count: number;
    likes_count: number;
    comments_count: number;
    category: string;
}

const CATEGORIES = [
    { id: 'web', label: 'Web', icon: Code },
    { id: 'mobile', label: 'Mobile', icon: Smartphone },
    { id: 'ai', label: 'AI/ML', icon: Brain },
    { id: 'data', label: 'Data', icon: DbIcon },
    { id: 'devops', label: 'DevOps', icon: Server },
    { id: 'game', label: 'Games', icon: Gamepad2 },
    { id: 'iot', label: 'IoT', icon: Cpu },
    { id: 'other', label: 'Other', icon: MoreHorizontal },
];

export default function ProjectsPage() {
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [featured, setFeatured] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterTech, setFilterTech] = useState('');
    const [user, setUser] = useState<any>(null);

    const heroRef = useRef(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setAuthLoading(false);
        });
    }, []);

    useEffect(() => {
        if (!authLoading && user) {
            fetchProjects();
        } else if (!authLoading && !user) {
            setLoading(false);
        }
    }, [authLoading, user]);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo(".hero-fade",
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: "power2.out" }
            );
        }, heroRef);
        return () => ctx.revert();
    }, [authLoading]);

    const fetchProjects = async () => {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .in('status', ['published', 'featured'])
            .order('created_at', { ascending: false });

        if (!error && data) {
            setProjects(data.filter(p => !p.is_featured));
            setFeatured(data.filter(p => p.is_featured));
        }
        setLoading(false);
    };

    const allTechStacks = [...new Set(projects.flatMap(p => p.tech_stack || []))].slice(0, 20);

    const filteredProjects = projects.filter(p => {
        const matchesSearch =
            p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.tagline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.tech_stack || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCategory = !filterCategory || p.category === filterCategory;
        const matchesTech = !filterTech || (p.tech_stack || []).includes(filterTech);

        return matchesSearch && matchesCategory && matchesTech;
    });

    const getCategoryIcon = (cat: string) => {
        const found = CATEGORIES.find(c => c.id === cat);
        return found ? <found.icon size={14} /> : <Code size={14} />;
    };

    const scrollToGallery = () => {
        document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-gray-100">
            <section ref={heroRef} className="relative min-h-[80vh] flex flex-col justify-center p-6 border-b border-zinc-800 overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/5 rounded-full blur-3xl pointer-events-none"></div>

                <div className="max-w-6xl mx-auto w-full relative z-10">
                    <div className="text-center mb-12">
                        <div className="hero-fade inline-flex items-center gap-2 border border-red-500/50 bg-red-500/10 px-4 py-1.5 text-red-400 text-xs font-mono uppercase tracking-widest mb-8">
                            <Rocket size={14} /> Project Showcase
                        </div>

                        <h1 className="hero-fade text-5xl md:text-7xl font-black text-white leading-[0.95] tracking-tighter mb-6">
                            BUILD <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-500">COOL STUFF</span>
                            <br />SHOW IT OFF
                        </h1>

                        <p className="hero-fade text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed mb-10">
                            The best projects from students and alumni. Get inspired, find collaborators,
                            and showcase what you've built to the community.
                        </p>

                        <div className="hero-fade flex flex-wrap gap-4 justify-center mb-12">
                            <button
                                onClick={scrollToGallery}
                                className="px-8 py-4 bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2"
                            >
                                Explore Projects <ArrowDown size={16} />
                            </button>
                            <button
                                onClick={() => router.push('/projects/submit')}
                                className="px-8 py-4 border border-zinc-700 text-white font-bold text-sm uppercase tracking-widest hover:border-red-600 transition-colors flex items-center gap-2"
                            >
                                <Plus size={16} /> Submit Yours
                            </button>
                        </div>
                    </div>

                    <div className="hero-fade grid grid-cols-4 md:grid-cols-8 gap-3 max-w-3xl mx-auto">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => { setFilterCategory(cat.id); scrollToGallery(); }}
                                className="flex flex-col items-center gap-2 p-3 bg-black/50 border border-zinc-800 hover:border-red-900/50 transition-colors"
                            >
                                <cat.icon size={20} className="text-red-400" />
                                <span className="text-zinc-500 text-[10px] uppercase font-bold">{cat.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {user && featured.length > 0 && (
                <section className="py-12 border-b border-zinc-800 bg-gradient-to-b from-red-950/10 to-transparent">
                    <div className="max-w-7xl mx-auto px-6">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-red-500 mb-6 flex items-center gap-2">
                            <Star size={14} /> Featured Projects
                        </h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {featured.map((project) => (
                                <ProjectCard key={project.id} project={project} featured />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            <section id="gallery" className="py-16 border-b border-zinc-800">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col lg:flex-row gap-4 mb-8">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-3.5 text-zinc-500" size={18} />
                            <input
                                type="text"
                                placeholder="Search projects, tech stack, or creator..."
                                className="w-full bg-zinc-900 border border-zinc-700 p-3 pl-12 text-white placeholder-zinc-500 focus:border-red-600 outline-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-2">
                            <select
                                className="bg-zinc-900 border border-zinc-700 p-3 text-white text-sm outline-none focus:border-red-600"
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                            >
                                <option value="">All Categories</option>
                                {CATEGORIES.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                                ))}
                            </select>

                            <select
                                className="bg-zinc-900 border border-zinc-700 p-3 text-white text-sm outline-none focus:border-red-600"
                                value={filterTech}
                                onChange={(e) => setFilterTech(e.target.value)}
                            >
                                <option value="">All Tech</option>
                                {allTechStacks.map(tech => (
                                    <option key={tech} value={tech}>{tech}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
                        <button
                            onClick={() => setFilterCategory('')}
                            className={`px-4 py-2 text-xs font-bold uppercase whitespace-nowrap ${!filterCategory ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-400 border border-zinc-700'
                                }`}
                        >
                            All
                        </button>
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setFilterCategory(cat.id)}
                                className={`px-4 py-2 text-xs font-bold uppercase flex items-center gap-2 whitespace-nowrap ${filterCategory === cat.id ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-400 border border-zinc-700'
                                    }`}
                            >
                                <cat.icon size={12} /> {cat.label}
                            </button>
                        ))}
                    </div>

                    {authLoading || loading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="text-red-600 animate-spin" size={32} />
                        </div>
                    ) : !user ? (
                        <div className="text-center py-20 border border-dashed border-zinc-800">
                            <Rocket size={40} className="text-zinc-600 mx-auto mb-4" />
                            <p className="text-zinc-400 mb-2">Login to browse student projects</p>
                            <p className="text-zinc-600 text-sm mb-6">Discover amazing projects built by students and alumni</p>
                            <Link
                                href="/auth?redirect_to=/projects&public=1"
                                className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold px-6 py-3 text-sm uppercase tracking-widest hover:opacity-90"
                            >
                                Login to Browse <ArrowRight size={16} />
                            </Link>
                        </div>
                    ) : filteredProjects.length === 0 ? (
                        <div className="text-center py-20 border border-dashed border-zinc-800">
                            <p className="text-zinc-500 mb-4">No projects found</p>
                            <button
                                onClick={() => router.push('/projects/submit')}
                                className="text-red-500 font-bold hover:underline"
                            >
                                Be the first to submit
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredProjects.map((project) => (
                                <ProjectCard key={project.id} project={project} />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <section className="py-16 bg-black border-b border-zinc-800">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">
                        Built Something Cool?
                    </h2>
                    <p className="text-zinc-500 mb-8">
                        Share your project with the community. Get feedback, find collaborators, and inspire others.
                    </p>
                    <button
                        onClick={() => router.push('/projects/submit')}
                        className="bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold px-8 py-4 text-sm uppercase tracking-wider hover:opacity-90 flex items-center gap-2 mx-auto"
                    >
                        <Rocket size={16} /> Submit Your Project
                    </button>
                </div>
            </section>

            <footer className="py-8 bg-neutral-950 text-zinc-600 text-xs text-center">
                <p>Part of <Link href="/resumes" className="text-red-500 hover:underline">SASTRACKER</Link> • Project Showcase</p>
            </footer>
        </div>
    );
}

function ProjectCard({ project, featured }: { project: Project; featured?: boolean }) {
    const router = useRouter();

    return (
        <div
            onClick={() => router.push(`/projects/${project.id}`)}
            className={`bg-black border p-0 cursor-pointer transition-all group overflow-hidden ${featured ? 'border-red-900/50 hover:border-red-600' : 'border-zinc-800 hover:border-zinc-600'
                }`}
        >
            <div className="aspect-video bg-zinc-900 relative overflow-hidden">
                {project.thumbnail_url ? (
                    <img
                        src={project.thumbnail_url}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Rocket size={32} className="text-zinc-800" />
                    </div>
                )}
                {project.demo_video_url && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play size={40} className="text-white" />
                    </div>
                )}
                {featured && (
                    <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] uppercase font-bold px-2 py-1">
                        Featured
                    </div>
                )}
            </div>

            <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-red-500 text-[10px] uppercase font-bold flex items-center gap-1">
                        {CATEGORIES.find(c => c.id === project.category)?.label || 'Other'}
                    </span>
                </div>

                <h3 className="text-lg font-black text-white mb-1 line-clamp-1">
                    {project.title}
                </h3>

                {project.tagline && (
                    <p className="text-zinc-500 text-sm mb-3 line-clamp-2">{project.tagline}</p>
                )}

                <div className="flex flex-wrap gap-1 mb-4">
                    {(project.tech_stack || []).slice(0, 4).map((tech, i) => (
                        <span key={i} className="bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                            {tech}
                        </span>
                    ))}
                    {(project.tech_stack || []).length > 4 && (
                        <span className="text-zinc-600 text-[10px]">+{project.tech_stack.length - 4}</span>
                    )}
                </div>

                <div className="flex items-center justify-between border-t border-zinc-900 pt-3">
                    <div className="flex items-center gap-2">
                        {project.user_avatar && (
                            <img src={project.user_avatar} alt="" className="w-5 h-5 rounded-full" />
                        )}
                        <Link href={`/profile/${project.user_id}`} onClick={(e) => e.stopPropagation()} className="text-zinc-500 text-xs hover:text-cyan-400">{project.user_name}</Link>
                    </div>

                    <div className="flex items-center gap-3 text-zinc-600 text-xs">
                        <span className="flex items-center gap-1"><Eye size={12} /> {project.views_count}</span>
                        <span className="flex items-center gap-1"><Heart size={12} /> {project.likes_count}</span>
                        <span className="flex items-center gap-1"><MessageSquare size={12} /> {project.comments_count}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
