"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import {
    Rocket, Loader2, Plus, X, Link as LinkIcon,
    Github, Play, Image, Code, Smartphone, Brain,
    Database as DbIcon, Server, Gamepad2, Cpu, MoreHorizontal
} from 'lucide-react';
import TagSearchInput from '@/components/TagSearchInput';

const supabase = createPagesBrowserClient();

const CATEGORY_ICONS: Record<string, any> = {
    'web': Code,
    'mobile': Smartphone,
    'ai': Brain,
    'data': DbIcon,
    'devops': Server,
    'game': Gamepad2,
    'iot': Cpu,
    'other': MoreHorizontal
};

interface Collaborator {
    name: string;
    email: string;
    role: string;
}

export default function SubmitProjectPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [uploadingimage, setUploadingimage] = useState(false);

    const [title, setTitle] = useState('');
    const [tagline, setTagline] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [categories, setCategories] = useState<any[]>([]);
    const [techstack, setTechstack] = useState<string[]>([]);
    const [tags, setTags] = useState<string[]>([]);
    const [customtag, setCustomtag] = useState('');
    const [liveurl, setLiveurl] = useState('');
    const [githuburl, setGithuburl] = useState('');
    const [demovideourl, setDemovideourl] = useState('');
    const [thumbnailurl, setThumbnailurl] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [newcollab, setNewcollab] = useState({ name: '', email: '', role: '' });

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                router.push('/auth?redirect_to=/projects/submit&public=1');
                return;
            }

            setUser(session.user);

            const { data: cats } = await supabase.from('categories').select('*').order('name');
            setCategories(cats || []);

            setLoading(false);
        };

        init();
    }, [router]);

    const handleimageupload = async (e: React.ChangeEvent<HTMLInputElement>, isthumbnail: boolean) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingimage(true);

        const filename = `${user.id}/${Date.now()}_${file.name}`;
        const { error: uploaderror } = await supabase.storage
            .from('project-images')
            .upload(filename, file);

        if (uploaderror) {
            alert('Failed to upload image');
            setUploadingimage(false);
            return;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('project-images')
            .getPublicUrl(filename);

        if (isthumbnail) {
            setThumbnailurl(publicUrl);
        } else {
            setImages([...images, publicUrl]);
        }

        setUploadingimage(false);
    };

    const handleaddtag = () => {
        if (customtag && !tags.includes(customtag.toLowerCase())) {
            setTags([...tags, customtag.toLowerCase()]);
        }
        setCustomtag('');
    };

    const handleaddcollaborator = () => {
        if (newcollab.name && newcollab.email) {
            setCollaborators([...collaborators, newcollab]);
            setNewcollab({ name: '', email: '', role: '' });
        }
    };

    const handlesubmit = async () => {
        if (!title.trim() || !description.trim() || !category) {
            alert('Please fill in title, description, and category');
            return;
        }

        setSubmitting(true);

        const { data: project, error } = await supabase.from('projects').insert({
            user_id: user.id,
            user_email: user.email,
            user_name: user.user_metadata?.full_name || user.email?.split('@')[0],
            user_avatar: user.user_metadata?.avatar_url,
            title: title.trim(),
            tagline: tagline.trim() || null,
            description: description.trim(),
            category,
            tech_stack: techstack,
            tags,
            live_url: liveurl.trim() || null,
            github_url: githuburl.trim() || null,
            demo_video_url: demovideourl.trim() || null,
            thumbnail_url: thumbnailurl || null,
            images,
            status: 'published'
        }).select().single();

        if (error) {
            alert('Failed to submit project');
            setSubmitting(false);
            return;
        }

        if (collaborators.length > 0 && project) {
            await supabase.from('project_collaborators').insert(
                collaborators.map(c => ({
                    project_id: project.id,
                    user_email: c.email,
                    user_name: c.name,
                    role: c.role || null
                }))
            );
        }

        router.push(`/projects/${project.id}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <Loader2 className="text-red-600 animate-spin" size={32} />
            </div>
        );
    }

    const geticon = (slug: string) => {
        const Icon = CATEGORY_ICONS[slug] || Code;
        return <Icon size={20} />;
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-gray-100 py-12">
            <div className="max-w-3xl mx-auto px-6">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 border border-red-500/50 bg-red-500/10 px-4 py-1.5 text-red-400 text-xs font-mono uppercase tracking-widest mb-4">
                        <Rocket size={14} /> Submit Project
                    </div>
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter">
                        Share Your Work
                    </h1>
                    <p className="text-zinc-500 mt-2">Showcase your project to the community</p>
                </div>

                <div className="space-y-8">
                    <div className="bg-black border border-zinc-800 p-6">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">Basic Info</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-zinc-400 text-xs uppercase font-bold block mb-1">Title *</label>
                                <input
                                    type="text"
                                    placeholder="My Awesome Project"
                                    className="w-full bg-zinc-900 border border-zinc-700 p-3 text-white placeholder-zinc-600 focus:border-red-600 outline-none"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-zinc-400 text-xs uppercase font-bold block mb-1">Tagline</label>
                                <input
                                    type="text"
                                    placeholder="A brief one-liner about your project"
                                    className="w-full bg-zinc-900 border border-zinc-700 p-3 text-white placeholder-zinc-600 focus:border-red-600 outline-none"
                                    value={tagline}
                                    onChange={(e) => setTagline(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-zinc-400 text-xs uppercase font-bold block mb-1">Description *</label>
                                <textarea
                                    rows={6}
                                    placeholder="What does your project do? What problem does it solve? What technologies did you use and why?"
                                    className="w-full bg-zinc-900 border border-zinc-700 p-3 text-white placeholder-zinc-600 focus:border-red-600 outline-none"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-zinc-400 text-xs uppercase font-bold block mb-2">Category *</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {categories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setCategory(cat.slug)}
                                            className={`flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 border transition-colors ${category === cat.slug
                                                ? 'border-red-500 bg-red-500/10 text-red-400'
                                                : 'border-zinc-700 text-zinc-500 hover:border-zinc-600'
                                                }`}
                                        >
                                            {geticon(cat.slug)}
                                            <span className="text-[9px] sm:text-[10px] uppercase font-bold">{cat.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-black border border-zinc-800 p-6">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">Tech Stack</h3>
                        <TagSearchInput
                            tablename="tech_stacks"
                            selectedtags={techstack}
                            ontagschange={setTechstack}
                            placeholder="Search or add technologies..."
                        />
                    </div>

                    <div className="bg-black border border-zinc-800 p-6">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">Links</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-zinc-400 text-xs uppercase font-bold block mb-1 flex items-center gap-2">
                                    <LinkIcon size={12} /> Live Demo URL
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://myproject.com"
                                    className="w-full bg-zinc-900 border border-zinc-700 p-3 text-white placeholder-zinc-600 focus:border-red-600 outline-none"
                                    value={liveurl}
                                    onChange={(e) => setLiveurl(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-zinc-400 text-xs uppercase font-bold block mb-1 flex items-center gap-2">
                                    <Github size={12} /> GitHub URL
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://github.com/username/repo"
                                    className="w-full bg-zinc-900 border border-zinc-700 p-3 text-white placeholder-zinc-600 focus:border-red-600 outline-none"
                                    value={githuburl}
                                    onChange={(e) => setGithuburl(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-zinc-400 text-xs uppercase font-bold block mb-1 flex items-center gap-2">
                                    <Play size={12} /> Demo Video URL (YouTube/Loom)
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://youtube.com/watch?v=..."
                                    className="w-full bg-zinc-900 border border-zinc-700 p-3 text-white placeholder-zinc-600 focus:border-red-600 outline-none"
                                    value={demovideourl}
                                    onChange={(e) => setDemovideourl(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-black border border-zinc-800 p-6">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">Images</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-zinc-400 text-xs uppercase font-bold block mb-2">Thumbnail (Cover Image)</label>
                                {thumbnailurl ? (
                                    <div className="relative aspect-video bg-zinc-900 border border-zinc-700">
                                        <img src={thumbnailurl} alt="" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => setThumbnailurl('')}
                                            className="absolute top-2 right-2 bg-red-600 p-1"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="aspect-video bg-zinc-900 border border-dashed border-zinc-700 flex flex-col items-center justify-center cursor-pointer hover:border-red-600 transition-colors">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleimageupload(e, true)}
                                        />
                                        {uploadingimage ? (
                                            <Loader2 size={24} className="text-red-500 animate-spin" />
                                        ) : (
                                            <>
                                                <Image size={32} className="text-zinc-600 mb-2" />
                                                <span className="text-zinc-500 text-sm">Click to upload thumbnail</span>
                                            </>
                                        )}
                                    </label>
                                )}
                            </div>

                            <div>
                                <label className="text-zinc-400 text-xs uppercase font-bold block mb-2">Additional Screenshots</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {images.map((img, i) => (
                                        <div key={i} className="relative aspect-video bg-zinc-900 border border-zinc-700">
                                            <img src={img} alt="" className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                                                className="absolute top-1 right-1 bg-red-600 p-0.5"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    {images.length < 5 && (
                                        <label className="aspect-video bg-zinc-900 border border-dashed border-zinc-700 flex items-center justify-center cursor-pointer hover:border-red-600 transition-colors">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handleimageupload(e, false)}
                                            />
                                            <Plus size={24} className="text-zinc-600" />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-black border border-zinc-800 p-4 sm:p-6">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">Collaborators (Optional)</h3>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                            <input
                                type="text"
                                placeholder="Name"
                                className="bg-zinc-900 border border-zinc-700 p-2 text-white text-sm placeholder-zinc-600"
                                value={newcollab.name}
                                onChange={(e) => setNewcollab({ ...newcollab, name: e.target.value })}
                            />
                            <input
                                type="email"
                                placeholder="Email"
                                className="bg-zinc-900 border border-zinc-700 p-2 text-white text-sm placeholder-zinc-600"
                                value={newcollab.email}
                                onChange={(e) => setNewcollab({ ...newcollab, email: e.target.value })}
                            />
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Role"
                                    className="flex-1 bg-zinc-900 border border-zinc-700 p-2 text-white text-sm placeholder-zinc-600"
                                    value={newcollab.role}
                                    onChange={(e) => setNewcollab({ ...newcollab, role: e.target.value })}
                                />
                                <button
                                    type="button"
                                    onClick={handleaddcollaborator}
                                    className="bg-zinc-800 border border-zinc-700 px-3 text-zinc-400"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>

                        {collaborators.length > 0 && (
                            <div className="space-y-2">
                                {collaborators.map((c, i) => (
                                    <div key={i} className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 p-2">
                                        <span className="text-white text-sm">{c.name} ({c.email}) {c.role && `- ${c.role}`}</span>
                                        <button onClick={() => setCollaborators(collaborators.filter((_, idx) => idx !== i))}>
                                            <X size={14} className="text-zinc-500" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-black border border-zinc-800 p-6">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">Tags</h3>

                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                placeholder="Add tags (e.g., portfolio, hackathon, opensource)"
                                className="flex-1 bg-zinc-900 border border-zinc-700 p-2 text-white text-sm placeholder-zinc-600 focus:border-red-600 outline-none"
                                value={customtag}
                                onChange={(e) => setCustomtag(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleaddtag()}
                            />
                            <button
                                type="button"
                                onClick={handleaddtag}
                                className="bg-zinc-800 border border-zinc-700 px-4 text-zinc-400"
                            >
                                <Plus size={16} />
                            </button>
                        </div>

                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag) => (
                                    <span key={tag} className="bg-zinc-900 text-zinc-400 px-3 py-1 text-sm flex items-center gap-2">
                                        #{tag}
                                        <button onClick={() => setTags(tags.filter(t => t !== tag))}>
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handlesubmit}
                        disabled={submitting}
                        className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold py-4 text-sm uppercase tracking-widest hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <><Loader2 size={18} className="animate-spin" /> Publishing...</>
                        ) : (
                            <><Rocket size={18} /> Publish Project</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
