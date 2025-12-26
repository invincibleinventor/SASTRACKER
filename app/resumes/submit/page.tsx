"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import {
    Upload, Loader2, ArrowLeft, CheckCircle, Building2,
    Briefcase, User, Calendar, Lightbulb, MessageSquare, AlertTriangle, ShieldCheck, Plus, Trash2, Edit
} from 'lucide-react';

const supabase = createPagesBrowserClient();

const SASTRA_DOMAINS = ["sastra.ac.in", "sastra.edu"];

function isSastraEmail(email: string): boolean {
    const lower = email.toLowerCase().trim();
    return SASTRA_DOMAINS.some((d) => lower.endsWith(d));
}

interface Achievement {
    id?: string;
    achievement_type: string;
    company_name: string;
    role_title: string;
    start_date: string;
    end_date: string;
    is_converted: boolean;
}

function SubmitResumeContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editid = searchParams.get('edit');
    const fileRef = useRef<HTMLInputElement>(null);

    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [autoApproved, setAutoApproved] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [existingResume, setExistingResume] = useState<any>(null);

    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [formData, setFormData] = useState({
        userName: '',
        yearGraduated: '',
        tips: '',
        remarks: ''
    });
    const [userresumes, setUserresumes] = useState<any[]>([]);
    const [selectedresumeid, setSelectedresumeid] = useState<string | null>(null);
    const [isflagship, setIsflagship] = useState(false);

    const [achievements, setAchievements] = useState<Achievement[]>([{
        achievement_type: 'internship',
        company_name: '',
        role_title: '',
        start_date: '',
        end_date: '',
        is_converted: false
    }]);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/auth?redirect_to=/resumes/submit&public=1');
                return;
            }
            setUser(session.user);

            const { data: allresumes } = await supabase
                .from('resumes')
                .select('*, resume_achievements(*)')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (allresumes && allresumes.length > 0) {
                setUserresumes(allresumes);
            }

            setFormData(prev => ({
                ...prev,
                userName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || ''
            }));

            if (editid) {
                const resumetoedit = allresumes?.find(r => r.id === editid);
                if (resumetoedit) {
                    setSelectedresumeid(editid);
                    setIsEditing(true);
                    setFormData({
                        userName: resumetoedit.user_name || '',
                        yearGraduated: resumetoedit.year_graduated || '',
                        tips: resumetoedit.tips || '',
                        remarks: resumetoedit.remarks || ''
                    });
                    setIsflagship(resumetoedit.is_flagship || false);
                    if (resumetoedit.resume_achievements && resumetoedit.resume_achievements.length > 0) {
                        setAchievements(resumetoedit.resume_achievements.map((a: any) => ({
                            id: a.id,
                            achievement_type: a.achievement_type || 'internship',
                            company_name: a.company_name || '',
                            role_title: a.role_title || '',
                            start_date: a.start_date || '',
                            end_date: a.end_date || '',
                            is_converted: a.is_converted || false
                        })));
                    } else {
                        setAchievements([{
                            achievement_type: resumetoedit.achievement_type || 'internship',
                            company_name: resumetoedit.company_name || '',
                            role_title: resumetoedit.role_title || '',
                            start_date: '',
                            end_date: '',
                            is_converted: false
                        }]);
                    }
                }
            }

            setLoading(false);
        };
        init();
    }, [router, editid]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            setPdfFile(file);
        } else {
            alert('Please upload a PDF file');
        }
    };

    const addAchievement = () => {
        setAchievements([...achievements, {
            achievement_type: 'internship',
            company_name: '',
            role_title: '',
            start_date: '',
            end_date: '',
            is_converted: false
        }]);
    };

    const removeAchievement = (index: number) => {
        if (achievements.length > 1) {
            setAchievements(achievements.filter((_, i) => i !== index));
        }
    };

    const updateAchievement = (index: number, field: keyof Achievement, value: any) => {
        const updated = [...achievements];
        updated[index] = { ...updated[index], [field]: value };
        setAchievements(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        const validachievements = achievements.filter(a => a.company_name && a.role_title);
        if (validachievements.length === 0) {
            alert('Please add at least one achievement');
            return;
        }

        const editingresume = selectedresumeid ? userresumes.find(r => r.id === selectedresumeid) : null;

        if (!editingresume && !pdfFile) {
            alert('Please upload your resume PDF');
            return;
        }

        setSubmitting(true);

        try {
            let pdfurl = editingresume?.pdf_url;

            if (pdfFile) {
                const fileext = 'pdf';
                const filename = `${user.id}_${Date.now()}.${fileext}`;
                const filepath = `resumes/${filename}`;

                const { error: uploaderror } = await supabase.storage
                    .from('resume-files')
                    .upload(filepath, pdfFile);

                if (uploaderror) throw uploaderror;

                const { data: urldata } = supabase.storage
                    .from('resume-files')
                    .getPublicUrl(filepath);

                pdfurl = urldata.publicUrl;
            }

            const useremail = user.email || '';
            const isauto = isSastraEmail(useremail);

            const primaryachievement = validachievements[0];

            const resumedata: any = {
                user_id: user.id,
                user_email: useremail,
                user_name: formData.userName,
                pdf_url: pdfurl,
                achievement_type: primaryachievement.achievement_type,
                company_name: primaryachievement.company_name,
                role_title: primaryachievement.role_title,
                year_graduated: formData.yearGraduated || null,
                tips: formData.tips || null,
                remarks: formData.remarks || null,
                is_flagship: isflagship
            };

            let resumeid = editingresume?.id;

            if (editingresume) {
                if (!isauto) {
                    resumedata.status = 'pending';
                    resumedata.approved_at = null;
                }
                const { error: updateerror } = await supabase
                    .from('resumes')
                    .update(resumedata)
                    .eq('id', editingresume.id);

                if (updateerror) throw updateerror;
                setIsEditing(true);
            } else {
                resumedata.status = isauto ? 'approved' : 'pending';
                resumedata.approved_at = isauto ? new Date().toISOString() : null;

                const { data: newresume, error: inserterror } = await supabase
                    .from('resumes')
                    .insert(resumedata)
                    .select()
                    .single();

                if (inserterror) throw inserterror;
                resumeid = newresume.id;
                setAutoApproved(isauto);
            }

            if (isflagship && resumeid) {
                await supabase.from('resumes').update({ is_flagship: false }).eq('user_id', user.id).neq('id', resumeid);
            }

            if (resumeid) {
                await supabase.from('resume_achievements').delete().eq('resume_id', resumeid);

                const achievementsdata = validachievements.map(a => ({
                    resume_id: resumeid,
                    achievement_type: a.achievement_type,
                    company_name: a.company_name,
                    role_title: a.role_title,
                    start_date: a.start_date || null,
                    end_date: a.end_date || null,
                    is_converted: a.is_converted
                }));

                const { error: achieverror } = await supabase
                    .from('resume_achievements')
                    .insert(achievementsdata);

                if (achieverror) { }
            }

            setSubmitted(true);
        } catch (error: any) {
            alert(`Failed to submit: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <Loader2 className="text-red-600 animate-spin" size={32} />
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                    <div className={`w-20 h-20 ${isEditing ? 'bg-blue-500/20' : autoApproved ? 'bg-green-500/20' : 'bg-amber-500/20'} rounded-full flex items-center justify-center mx-auto mb-6`}>
                        {isEditing ? (
                            <Edit size={40} className="text-blue-500" />
                        ) : autoApproved ? (
                            <ShieldCheck size={40} className="text-green-500" />
                        ) : (
                            <CheckCircle size={40} className="text-amber-500" />
                        )}
                    </div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">
                        {isEditing ? 'Resume Updated!' : autoApproved ? 'Resume Published!' : 'Resume Submitted!'}
                    </h2>
                    <p className="text-zinc-400 mb-8">
                        {isEditing
                            ? 'Your resume has been updated successfully.'
                            : autoApproved
                                ? 'Your SASTRA email verified you automatically. Your resume is now live in the gallery!'
                                : 'Your resume is pending admin review. Once approved, it will appear in the public gallery.'}
                    </p>
                    <button
                        onClick={() => router.push('/resumes')}
                        className="bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold px-8 py-3 text-sm uppercase tracking-wider hover:opacity-90"
                    >
                        Back to Resume Hub
                    </button>
                </div>
            </div>
        );
    }

    const useremail = user?.email || '';
    const willauto = isSastraEmail(useremail) && !selectedresumeid;
    const editingresume = selectedresumeid ? userresumes.find(r => r.id === selectedresumeid) : null;

    const handleeditresume = (resume: any) => {
        setSelectedresumeid(resume.id);
        setIsEditing(true);
        setFormData({
            userName: resume.user_name || '',
            yearGraduated: resume.year_graduated || '',
            tips: resume.tips || '',
            remarks: resume.remarks || ''
        });
        setIsflagship(resume.is_flagship || false);
        if (resume.resume_achievements && resume.resume_achievements.length > 0) {
            setAchievements(resume.resume_achievements.map((a: any) => ({
                id: a.id,
                achievement_type: a.achievement_type || 'internship',
                company_name: a.company_name || '',
                role_title: a.role_title || '',
                start_date: a.start_date || '',
                end_date: a.end_date || '',
                is_converted: a.is_converted || false
            })));
        } else {
            setAchievements([{
                achievement_type: resume.achievement_type || 'internship',
                company_name: resume.company_name || '',
                role_title: resume.role_title || '',
                start_date: '',
                end_date: '',
                is_converted: false
            }]);
        }
    };

    const handlenewresume = () => {
        setSelectedresumeid(null);
        setIsEditing(false);
        setPdfFile(null);
        setIsflagship(false);
        setAchievements([{
            achievement_type: 'internship',
            company_name: '',
            role_title: '',
            start_date: '',
            end_date: '',
            is_converted: false
        }]);
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-gray-100">
            <div className="max-w-2xl mx-auto p-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center text-zinc-500 hover:text-red-500 mb-6 transition-colors"
                >
                    <ArrowLeft size={20} className="mr-2" /> Back
                </button>

                <div className="mb-8">
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">
                        {isEditing ? 'Edit Your Resume' : 'Submit New Resume'}
                    </h1>
                    <p className="text-zinc-500">
                        {isEditing ? 'Update your resume and achievements' : 'Share your successful resume to help others'}
                    </p>
                </div>

                {userresumes.length > 0 && (
                    <div className="bg-black border border-zinc-800 p-4 mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Your Resumes ({userresumes.length})</h3>
                            <button
                                type="button"
                                onClick={handlenewresume}
                                className="text-xs font-bold uppercase text-red-400 hover:text-red-300 flex items-center gap-1"
                            >
                                <Plus size={14} /> New Resume
                            </button>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {userresumes.map(resume => (
                                <div
                                    key={resume.id}
                                    onClick={() => handleeditresume(resume)}
                                    className={`p-3 border cursor-pointer transition-colors flex items-center justify-between ${selectedresumeid === resume.id ? 'border-red-600 bg-red-900/10' : 'border-zinc-800 hover:border-zinc-600'}`}
                                >
                                    <div>
                                        <p className="text-white font-medium text-sm">{resume.company_name} - {resume.role_title}</p>
                                        <p className="text-zinc-500 text-xs">{resume.status} • {new Date(resume.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {resume.is_flagship && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 uppercase font-bold">Flagship</span>}
                                        <Edit size={14} className="text-zinc-500" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div
                        onClick={() => fileRef.current?.click()}
                        className={`border-2 border-dashed ${pdfFile ? 'border-green-500/50 bg-green-500/5' : editingresume?.pdf_url ? 'border-blue-500/50 bg-blue-500/5' : 'border-zinc-700 hover:border-zinc-500'} p-8 text-center cursor-pointer transition-all`}
                    >
                        <input
                            ref={fileRef}
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        {pdfFile ? (
                            <div className="flex items-center justify-center gap-3">
                                <CheckCircle size={24} className="text-green-500" />
                                <span className="text-white font-bold">{pdfFile.name}</span>
                            </div>
                        ) : editingresume?.pdf_url ? (
                            <div className="flex items-center justify-center gap-3">
                                <Edit size={24} className="text-blue-500" />
                                <span className="text-blue-400 font-bold">Current resume uploaded • Click to replace</span>
                            </div>
                        ) : (
                            <>
                                <Upload size={40} className="mx-auto mb-4 text-zinc-500" />
                                <p className="text-white font-bold mb-1">Drop your resume PDF here</p>
                                <p className="text-zinc-500 text-sm">or click to browse</p>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-black border border-zinc-800">
                        <input
                            type="checkbox"
                            id="flagship"
                            checked={isflagship}
                            onChange={(e) => setIsflagship(e.target.checked)}
                            className="accent-amber-500 w-4 h-4"
                        />
                        <label htmlFor="flagship" className="text-sm text-zinc-300">
                            <span className="font-bold text-amber-400">Set as Flagship Resume</span>
                        </label>
                    </div>

                    <div className="bg-black border border-zinc-800 p-6 space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">Your Details</h3>

                        <div>
                            <label className="text-zinc-500 text-xs uppercase font-bold block mb-2">
                                <User size={12} className="inline mr-1" /> Your Name
                            </label>
                            <input
                                type="text"
                                required
                                className="w-full bg-zinc-900 border border-zinc-700 p-3 text-white text-sm outline-none focus:border-red-600"
                                value={formData.userName}
                                onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="text-zinc-500 text-xs uppercase font-bold block mb-2">
                                <Calendar size={12} className="inline mr-1" /> Graduation Year (Optional)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., 2024"
                                className="w-full bg-zinc-900 border border-zinc-700 p-3 text-white text-sm outline-none focus:border-red-600"
                                value={formData.yearGraduated}
                                onChange={(e) => setFormData({ ...formData, yearGraduated: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="bg-black border border-zinc-800 p-6 space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Achievements</h3>
                            <button
                                type="button"
                                onClick={addAchievement}
                                className="flex items-center gap-1 text-xs font-bold uppercase text-red-400 hover:text-red-300"
                            >
                                <Plus size={14} /> Add More
                            </button>
                        </div>

                        {achievements.map((achievement, index) => (
                            <div key={index} className="bg-zinc-900/50 border border-zinc-800 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-zinc-500 text-xs font-bold uppercase">Achievement #{index + 1}</span>
                                    {achievements.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeAchievement(index)}
                                            className="text-red-500 hover:text-red-400"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>

                                <div>
                                    <label className="text-zinc-500 text-xs uppercase font-bold block mb-2">
                                        <Briefcase size={12} className="inline mr-1" /> Type
                                    </label>
                                    <select
                                        required
                                        className="w-full bg-zinc-900 border border-zinc-700 p-3 text-white text-sm outline-none focus:border-red-600"
                                        value={achievement.achievement_type}
                                        onChange={(e) => updateAchievement(index, 'achievement_type', e.target.value)}
                                    >
                                        <option value="internship">Internship</option>
                                        <option value="job">Full-time Job</option>
                                        <option value="freelance">Freelance</option>
                                        <option value="project">Project/Contract</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-zinc-500 text-xs uppercase font-bold block mb-2">
                                        <Building2 size={12} className="inline mr-1" /> Company
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g., Google, Microsoft"
                                        className="w-full bg-zinc-900 border border-zinc-700 p-3 text-white text-sm outline-none focus:border-red-600"
                                        value={achievement.company_name}
                                        onChange={(e) => updateAchievement(index, 'company_name', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="text-zinc-500 text-xs uppercase font-bold block mb-2">Role / Title</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g., Software Engineer"
                                        className="w-full bg-zinc-900 border border-zinc-700 p-3 text-white text-sm outline-none focus:border-red-600"
                                        value={achievement.role_title}
                                        onChange={(e) => updateAchievement(index, 'role_title', e.target.value)}
                                    />
                                </div>

                                {achievement.achievement_type === 'internship' && (
                                    <label className="flex items-center gap-2 text-sm text-zinc-400">
                                        <input
                                            type="checkbox"
                                            checked={achievement.is_converted}
                                            onChange={(e) => updateAchievement(index, 'is_converted', e.target.checked)}
                                            className="accent-red-600"
                                        />
                                        Converted to full-time
                                    </label>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="bg-black border border-zinc-800 p-6 space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">Share Your Wisdom</h3>

                        <div>
                            <label className="text-zinc-500 text-xs uppercase font-bold block mb-2">
                                <Lightbulb size={12} className="inline mr-1" /> Tips for Others (Optional)
                            </label>
                            <textarea
                                rows={3}
                                placeholder="What worked well in your resume? Any advice?"
                                className="w-full bg-zinc-900 border border-zinc-700 p-3 text-white text-sm outline-none focus:border-red-600"
                                value={formData.tips}
                                onChange={(e) => setFormData({ ...formData, tips: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="text-zinc-500 text-xs uppercase font-bold block mb-2">
                                <MessageSquare size={12} className="inline mr-1" /> Additional Remarks (Optional)
                            </label>
                            <textarea
                                rows={2}
                                placeholder="Anything else you'd like to share?"
                                className="w-full bg-zinc-900 border border-zinc-700 p-3 text-white text-sm outline-none focus:border-red-600"
                                value={formData.remarks}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                            />
                        </div>
                    </div>

                    {!isEditing && (
                        willauto ? (
                            <div className="bg-green-500/10 border border-green-500/30 p-4 flex items-start gap-3">
                                <ShieldCheck size={20} className="text-green-500 shrink-0 mt-0.5" />
                                <div className="text-sm text-green-200">
                                    <p className="font-bold mb-1">Auto-Approved</p>
                                    <p className="text-green-300/70">Your SASTRA email means instant approval. Resume will be live immediately!</p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-amber-500/10 border border-amber-500/30 p-4 flex items-start gap-3">
                                <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                                <div className="text-sm text-amber-200">
                                    <p className="font-bold mb-1">Pending Approval</p>
                                    <p className="text-amber-300/70">Your resume will be reviewed by an admin before appearing in the public gallery.</p>
                                </div>
                            </div>
                        )
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold py-4 text-sm uppercase tracking-wider hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <><Loader2 size={18} className="animate-spin" /> {isEditing ? 'Updating...' : 'Submitting...'}</>
                        ) : (
                            <><CheckCircle size={18} /> {isEditing ? 'Update Resume' : 'Submit Resume'}</>
                        )}
                    </button>
                </form>
            </div >
        </div >
    );
}

export default function SubmitResumePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <Loader2 className="text-red-600 animate-spin" size={32} />
            </div>
        }>
            <SubmitResumeContent />
        </Suspense>
    );
}
