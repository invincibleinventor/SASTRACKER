"use client";

import React, { useState } from 'react';
import { X, Flag, Loader2 } from 'lucide-react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

const supabase = createPagesBrowserClient();

interface ReportModalProps {
    isopen: boolean;
    onclose: () => void;
    contenttype: 'resume' | 'project' | 'comment' | 'user' | 'question' | 'paper';
    contentid: string;
}

const REPORT_REASONS: Record<string, string[]> = {
    resume: ['Inappropriate content', 'Fake/misleading information', 'Copyright violation', 'Spam', 'Other'],
    project: ['Inappropriate content', 'Fake/misleading information', 'Copyright violation', 'Non-functional links', 'Spam', 'Other'],
    comment: ['Harassment', 'Hate speech', 'Spam', 'Inappropriate content', 'Other'],
    user: ['Impersonation', 'Harassment', 'Spam', 'Inappropriate behavior', 'Other'],
    question: ['Incorrect content', 'Inappropriate content', 'Duplicate', 'Other'],
    paper: ['Incorrect content', 'Wrong subject/exam', 'Duplicate', 'Copyright issue', 'Other']
};

export default function ReportModal({ isopen, onclose, contenttype, contentid }: ReportModalProps) {
    const [reason, setReason] = useState('');
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handlesubmit = async () => {
        if (!reason) {
            alert('Please select a reason');
            return;
        }

        setSubmitting(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            const { error } = await supabase.from('reports').insert({
                reporter_id: session?.user?.id || null,
                reporter_email: session?.user?.email || 'anonymous',
                content_type: contenttype,
                content_id: contentid,
                reason: reason,
                comment: comment || null
            });

            if (error) throw error;

            setSubmitted(true);
            setTimeout(() => {
                onclose();
                setSubmitted(false);
                setReason('');
                setComment('');
            }, 1500);
        } catch (err: any) {
            alert(`Failed to submit report: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isopen) return null;

    const reasons = REPORT_REASONS[contenttype] || REPORT_REASONS.resume;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="bg-black border border-zinc-700 w-full max-w-md p-6 relative">
                <button onClick={onclose} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
                    <X size={20} />
                </button>

                {submitted ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Flag size={32} className="text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Report Submitted</h3>
                        <p className="text-zinc-500">Thank you for helping keep our community safe.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-red-500/20 flex items-center justify-center">
                                <Flag size={20} className="text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Report {contenttype}</h3>
                                <p className="text-zinc-500 text-sm">Help us understand what's wrong</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-zinc-500 text-xs uppercase font-bold block mb-2">Reason</label>
                                <select
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-700 p-3 text-white text-sm outline-none focus:border-red-600"
                                >
                                    <option value="">Select a reason...</option>
                                    {reasons.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-zinc-500 text-xs uppercase font-bold block mb-2">
                                    Additional Comments <span className="text-zinc-600">(optional)</span>
                                </label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Provide more details..."
                                    rows={3}
                                    className="w-full bg-zinc-900 border border-zinc-700 p-3 text-white text-sm outline-none focus:border-red-600 resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={onclose}
                                className="flex-1 border border-zinc-700 text-zinc-400 py-2 text-sm font-bold uppercase hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlesubmit}
                                disabled={submitting || !reason}
                                className="flex-1 bg-red-600 text-white py-2 text-sm font-bold uppercase disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Flag size={16} />}
                                {submitting ? 'Submitting...' : 'Submit Report'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
