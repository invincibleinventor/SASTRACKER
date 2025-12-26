"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Undo, Redo } from 'lucide-react';

interface HtmlEditorProps {
    content: string;
    onChange: (html: string) => void;
}

export default function HtmlEditor({ content, onChange }: HtmlEditorProps) {
    const editor = useEditor({
        extensions: [StarterKit, Underline],
        content,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-invert max-w-none min-h-[400px] p-4 focus:outline-none'
            }
        }
    });

    if (!editor) return null;

    const toolbarbtn = (active: boolean) =>
        `p-2 ${active ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`;

    return (
        <div className="border border-zinc-700 rounded overflow-hidden">
            <div className="flex gap-1 p-2 bg-zinc-900 border-b border-zinc-700">
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={toolbarbtn(editor.isActive('bold'))}
                    title="Bold"
                >
                    <Bold size={16} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={toolbarbtn(editor.isActive('italic'))}
                    title="Italic"
                >
                    <Italic size={16} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={toolbarbtn(editor.isActive('underline'))}
                    title="Underline"
                >
                    <UnderlineIcon size={16} />
                </button>
                <div className="w-px bg-zinc-700 mx-1" />
                <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={toolbarbtn(editor.isActive('bulletList'))}
                    title="Bullet List"
                >
                    <List size={16} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={toolbarbtn(editor.isActive('orderedList'))}
                    title="Numbered List"
                >
                    <ListOrdered size={16} />
                </button>
                <div className="w-px bg-zinc-700 mx-1" />
                <button
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    className={toolbarbtn(false)}
                    title="Undo"
                >
                    <Undo size={16} />
                </button>
                <button
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    className={toolbarbtn(false)}
                    title="Redo"
                >
                    <Redo size={16} />
                </button>
            </div>
            <EditorContent editor={editor} className="bg-zinc-950" />
        </div>
    );
}
