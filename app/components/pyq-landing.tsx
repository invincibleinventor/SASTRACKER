"use client";

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import {
    Loader2, FileText, Search, Bot,
    Database, Zap, ArrowRight, Sparkles,
    Cpu, Network, FileJson, ScanLine, Share2, HelpCircle,
    Upload
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

export default function PyQLanding() {
    const containerRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo(".hero-element",
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: "power2.out" }
            );

            gsap.fromTo(".pipeline-step",
                { opacity: 0, x: -20 },
                {
                    opacity: 1,
                    x: 0,
                    duration: 0.5,
                    stagger: 0.2,
                    scrollTrigger: {
                        trigger: "#pipeline",
                        start: "top 70%",
                    }
                }
            );
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <div ref={containerRef} className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-red-900 selection:text-white overflow-x-hidden">

            <section className="relative min-h-screen flex flex-col justify-center p-6 border-b border-zinc-800">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

                <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-12 gap-12 items-center relative z-10">

                    <div className="lg:col-span-7 space-y-8">
                        <div className="hero-element inline-flex items-center gap-3 border border-pink-500/50 bg-pink-500/10 px-3 py-1 text-pink-500 text-xs font-mono uppercase tracking-widest">
                            <span className="w-2 h-2 bg-pink-500 animate-pulse"></span>
                            v1 Stable
                        </div>

                        <div className="hero-element">
                            <h1 className="text-5xl md:text-7xl font-black text-white leading-[0.9] tracking-tighter mb-6">
                                SASTRA'S <br />
                                KNOWLEDGE <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-pink-500">REPOSITORY</span>
                            </h1>
                            <p className="text-zinc-400 text-lg max-w-xl leading-relaxed border-l-2 border-red-600 pl-6">
                                A centralized, intelligent database for Previous Year Questions.
                                Stop searching through scattered WhatsApp groups. Come SASTRACKER - Your modern PyQDB
                            </p>
                        </div>

                        <div className="hero-element flex flex-wrap gap-4">
                            <Link
                                href="/auth"
                                className="px-8 py-4 bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-colors flex items-center gap-2"
                            >
                                Login to Access <ArrowRight size={16} />
                            </Link>
                            <button
                                onClick={() => document.getElementById('pipeline')?.scrollIntoView({ behavior: 'smooth' })}
                                className="px-8 py-4 border border-zinc-700 text-white font-bold text-sm uppercase tracking-widest hover:border-zinc-500 transition-colors flex items-center gap-2"
                            >
                                How it works <ArrowRight size={16} />
                            </button>
                        </div>

                        <div className="hero-element">
                            <Link href="/resumes" className="text-zinc-500 hover:text-purple-400 text-sm font-mono transition-colors">
                                Not a SASTRA student? Check out Resume Hub →
                            </Link>
                        </div>
                    </div>

                    <div className="lg:col-span-5 w-full hidden lg:block">
                        <div className="hero-element border border-zinc-800 bg-zinc-900/50 p-8 backdrop-blur-sm">
                            <div className="text-center mb-6">
                                <Database size={48} className="text-red-600 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-2">
                                    PyQ Database
                                </h3>
                                <p className="text-zinc-500 text-sm">
                                    Access thousands of previous year questions
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-3 border border-zinc-800 bg-black/50">
                                    <Search size={16} className="text-zinc-500" />
                                    <span className="text-zinc-400 text-sm">Search by subject, year, exam type</span>
                                </div>
                                <div className="flex items-center gap-3 p-3 border border-zinc-800 bg-black/50">
                                    <Bot size={16} className="text-zinc-500" />
                                    <span className="text-zinc-400 text-sm">AI-powered solutions</span>
                                </div>
                                <div className="flex items-center gap-3 p-3 border border-zinc-800 bg-black/50">
                                    <FileText size={16} className="text-zinc-500" />
                                    <span className="text-zinc-400 text-sm">Automatic extraction from PDFs using AI</span>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
                                <p className="text-zinc-600 text-xs font-mono">
                                    Restricted to @sastra.ac.in emails
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="lg:py-24 py-16 border-b border-zinc-900 bg-neutral-950">
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16">
                    <div>
                        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-800 to-zinc-400 uppercase tracking-tighter mb-6">
                            The Problem
                        </h2>
                        <p className="text-zinc-400 text-lg leading-relaxed mb-6">
                            Academic resources are often fragmented. Valuable Question Papers (PyQs) are stored as images, shared on messaging apps, and eventually lost in the digital void.
                        </p>
                    </div>
                    <div>
                        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-zinc-400 uppercase tracking-tighter mb-6">
                            Our Solution
                        </h2>
                        <p className="text-zinc-400 text-lg leading-relaxed mb-6">
                            Sastracker creates a permanent, structured archive. We don't just store files - we extract the content, making every question searchable, sortable, and solvable.
                        </p>
                    </div>
                </div>
            </section>

            <section id="pipeline" className="py-16 lg:py-32 border-b border-zinc-900 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="mb-20">
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">
                            Simplified Processing Flow
                        </h2>
                        <p className="text-zinc-500 font-mono">How SASTRACKER Operates</p>
                    </div>

                    <div className="grid md:grid-cols-4 gap-6">
                        <ProcessStep
                            step="01"
                            icon={<Upload size={24} />}
                            title="Ingestion"
                            description="Raw PDF upload via secure portal. Supports scanned documents and digital exports."
                        />
                        <ProcessStep
                            step="02"
                            icon={<ScanLine size={24} />}
                            title="Extraction"
                            description="Vision algorithms parse visual data. OCR extracts text while preserving mathematical notation."
                        />
                        <ProcessStep
                            step="03"
                            icon={<Cpu size={24} />}
                            title="Analysis"
                            description="Intelligent models identify metadata: Year, Subject, Exam Type, and Marks allocation."
                        />
                        <ProcessStep
                            step="04"
                            icon={<Database size={24} />}
                            title="Indexing"
                            description="Structured data is pushed to the database. Vector search ready for instant retrieval."
                        />
                    </div>
                </div>
            </section>

            <section className="py-16 lg:py-32 bg-neutral-950 border-b border-zinc-900">
                <div className="max-w-7xl mx-auto px-6">
                    <h1 className='text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-700 mb-10 pl-1 to-zinc-900 font-black uppercase text-3xl'>Our Features</h1>

                    <div className="grid md:grid-cols-3 gap-3">
                        <FeatureBox
                            icon={<Search className="text-white" size={24} />}
                            title="Granular Search"
                            desc="Filter by Year (I-IV), Subject Name, Exam Category (CIA/End Sem), or specific marks."
                        />
                        <FeatureBox
                            icon={<Bot className="text-white" size={24} />}
                            title="AI Tutor"
                            desc="Generate step-by-step solutions for any question using our integrated smart solver."
                        />
                        <FeatureBox
                            icon={<FileJson className="text-white" size={24} />}
                            title="LaTeX Rendering"
                            desc="Complex mathematical equations are rendered natively in the browser for perfect clarity."
                        />
                        <FeatureBox
                            icon={<Share2 className="text-white" size={24} />}
                            title="Contribution"
                            desc="Upload your own papers or contribute answers to existing questions to help the community."
                        />
                        <FeatureBox
                            icon={<Network className="text-white" size={24} />}
                            title="Peer Review"
                            desc="Community voting system ensures the best and most accurate answers appear at the top."
                        />

                        <FeatureBox
                            icon={<Zap className="text-white" size={24} />}
                            title="Real-time Updates"
                            desc="New uploads appear instantly in the global feed. No processing lag."
                        />
                    </div>
                </div>
            </section>

            <section className="py-16 lg:py-32 border-b border-zinc-900">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="mb-16">
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">
                            Frequently Asked Questions
                        </h2>
                        <p className="text-zinc-500 font-normal">Common questions regarding SASTRACKER and using it.</p>
                    </div>
                    <div className="space-y-4">
                        <FaqItem question="Who can access this platform?" answer="Access is strictly limited to students and faculty with a valid @sastra.ac.in or associated institutional email address." />
                        <FaqItem question="How do I upload a question paper?" answer="Once logged in, navigate to the Upload section. You can drag and drop PDF files, and the system will automatically extract the questions individually." />
                        <FaqItem question="Can I edit questions if the AI makes a mistake?" answer="Yes. Our review interface allows you to edit text, fix mathematical formulas, and adjust images before the paper is published to the live database." />
                        <FaqItem question="Is this an official university portal?" answer="No, this is a student-run initiative designed to help the community organize and preserve academic resources effectively." />
                    </div>
                </div>
            </section>

            <section className="py-16 lg:py-32">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <p className="font-sans px-6 mx-6 text-zinc-300 text-base bg-white/10 border border-zinc-800 border-dashed py-2 mb-10 ">
                        We are completely student-run and community-driven. Your participation keeps the archive growing.
                    </p>
                    <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-8">
                        START EXPLORING AND CONTRIBUTING
                    </h2>
                    <p className="text-zinc-500 text-lg mb-12">
                        Join SASTRACKER. Access PyQs. Contribute to the archive. Let the community thrive.
                    </p>
                    <Link
                        href="/auth"
                        className="inline-block bg-gradient-to-r from-red-600 to-pink-600 text-white text-sm font-black px-12 py-4 uppercase tracking-widest hover:opacity-90 transition-all"
                    >
                        Access SASTRACKER
                    </Link>
                </div>
            </section>

            <footer className="py-12 border-t border-zinc-900 bg-black text-zinc-500 font-mono text-xs">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                            <div className="w-4 h-4 bg-gradient-to-br from-red-600 to-pink-600"></div>
                            <span className="font-bold text-white tracking-tight uppercase">SASTRACKER</span>
                        </div>
                        <a href="https://baladev.in" className="hover:text-white transition-colors">
                            &copy; {new Date().getFullYear()} Invincible Inventor.
                        </a>
                    </div>

                    <div className="flex gap-8 uppercase tracking-wider font-bold">
                        <a href="mailto:128003034@sastra.ac.in" className="hover:text-white transition-colors">Contact</a>
                        <a href="https://baladev.in" className="hover:text-white transition-colors">Author</a>
                    </div>

                    <div className="flex items-center gap-2">
                        <span>NOT OFFICIALLY RECOGNIZED BY:</span>
                        <Link href="https://sastra.edu" className="text-green-500">SASTRA ©</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}

const ProcessStep = ({ step, icon, title, description }: any) => (
    <div className="pipeline-step border border-zinc-800 bg-zinc-900/20 p-6 relative group hover:border-zinc-600 transition-colors">
        <div className="absolute top-4 right-4 text-4xl font-black text-zinc-800/50 select-none group-hover:text-zinc-800 transition-colors">{step}</div>
        <div className="mb-6 text-red-600">{icon}</div>
        <h3 className="text-lg font-bold text-white uppercase mb-3 tracking-wide">{title}</h3>
        <p className="text-zinc-500 text-sm leading-relaxed font-mono">{description}</p>
    </div>
);

const FeatureBox = ({ icon, title, desc }: any) => (
    <div className="bg-black border-dashed border border-zinc-800 p-8 hover:bg-zinc-900/50 transition-colors group">
        <div className="mb-6 opacity-50 group-hover:opacity-100 transition-opacity">{icon}</div>
        <h3 className="text-lg font-bold text-white uppercase mb-2">{title}</h3>
        <p className="text-zinc-500 text-sm leading-relaxed">{desc}</p>
    </div>
);

const FaqItem = ({ question, answer }: any) => (
    <div className="border border-zinc-800 bg-zinc-900/10 p-6 hover:bg-zinc-900/30 transition-colors">
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <HelpCircle size={16} className="text-zinc-500" /> {question}
        </h3>
        <p className="text-zinc-400 text-sm leading-relaxed pl-6 border-l border-zinc-800">{answer}</p>
    </div>
);
