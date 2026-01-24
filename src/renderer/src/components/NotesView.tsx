
import { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { SlashCommand } from './editor/slash-command'
import {
  BoldIcon,
  ItalicIcon,
  ListBulletIcon,
  CodeBracketIcon,
  Bars3BottomLeftIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import type { Note } from '../types'

interface NotesViewProps {
  isSidebarVisible?: boolean
  activeNoteId: string | null
  notes: Note[]
  onUpdateNote: (id: string, updates: Partial<Note>) => void
}

export default function NotesView({ 
  isSidebarVisible = true,
  activeNoteId,
  notes,
  onUpdateNote
}: NotesViewProps) {
  const [showToolbar, setShowToolbar] = useState<boolean>(false)
  const activeNote = notes.find(n => n.id === activeNoteId)

  // Initialize editor with Tiptap
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Placeholder.configure({
        placeholder: "Start writing, press '/' for commands..."
      }),
      Typography,
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list'
        }
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item'
        }
      }),
      SlashCommand
    ],
    content: '',
    editorProps: {
      attributes: {
        class:
          'prose prose-lg dark:prose-invert max-w-none focus:outline-none prose-headings:font-semibold prose-h1:text-4xl prose-h1:font-bold prose-h1:mb-4 prose-h1:mt-8 prose-h2:text-2xl prose-h2:font-semibold prose-h2:mb-3 prose-h2:mt-6 text-graphon-text-main dark:text-graphon-dark-text-main prose-p:leading-relaxed prose-p:mb-4 min-h-screen'
      }
    },
    onUpdate: ({ editor }) => {
      if (activeNoteId) {
        onUpdateNote(activeNoteId, { content: editor.getHTML() })
      }
    },
    onSelectionUpdate: ({ editor }) => {
      // Show toolbar when there's a selection
      const { from, to } = editor.state.selection
      setShowToolbar(from !== to)
    }
  })

  // Sync editor content with active note
  useEffect(() => {
    if (editor && activeNote) {
      // Only update if content is different to avoid cursor jumps
      if (editor.getHTML() !== activeNote.content) {
        editor.commands.setContent(activeNote.content || '')
      }
    } else if (editor && !activeNote) {
        editor.commands.setContent('')
    }
  }, [activeNoteId, editor]) // Depend on ID mostly

  // Global keyboard shortcuts for rich text formatting
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editor) return

      // Check if editor is focused
      const isEditorFocused = editor.isFocused

      if (isEditorFocused && (e.ctrlKey || e.metaKey)) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault()
            editor.chain().focus().toggleBold().run()
            break
          case 'i':
            e.preventDefault()
            editor.chain().focus().toggleItalic().run()
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editor])

  if (!activeNoteId) {
    return (
      <div className="flex-1 h-screen flex items-center justify-center text-graphon-text-secondary dark:text-graphon-dark-text-secondary">
        <div className="text-center">
          <p>Select a note or create a new one.</p>
        </div>
      </div>
    )
  }

  if (!editor) {
    return null
  }

  const MenuButton = ({
    onClick,
    isActive = false,
    children,
    title
  }: {
    onClick: () => void
    isActive?: boolean
    children: React.ReactNode
    title: string
  }) => (
    <button
      onClick={onClick}
      title={title}
      className={`
        p-2 rounded-lg transition-smooth
        ${
          isActive
            ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400'
            : 'text-graphon-text-secondary dark:text-graphon-dark-text-secondary hover:bg-graphon-hover dark:hover:bg-graphon-dark-hover'
        }
      `}
    >
      {children}
    </button>
  )

  return (
    <div className="flex-1 h-screen overflow-hidden bg-white dark:bg-graphon-dark-bg text-graphon-text-main dark:text-graphon-dark-text-main relative">
      {/* Toolbar - Fixed at top, only visible when text selected */}
      <div
        className={`
        absolute left-0 right-0 top-0 z-40 transition-all duration-300 bg-white/80 dark:bg-graphon-dark-bg/80 backdrop-blur-xl border-b border-graphon-border dark:border-graphon-dark-border
        ${showToolbar ? 'h-16 opacity-100' : 'h-0 opacity-0 overflow-hidden'}
      `}
      >
        <div className="h-16 flex items-center justify-center">
          <div className="flex items-center space-x-1 border border-graphon-border dark:border-graphon-dark-border rounded-xl p-1.5 bg-white/50 dark:bg-graphon-dark-sidebar/50">
            <MenuButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold (Ctrl+B)"
            >
              <BoldIcon className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic (Ctrl+I)"
            >
              <ItalicIcon className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive('code')}
              title="Code"
            >
              <CodeBracketIcon className="w-4 h-4" />
            </MenuButton>

            <div className="w-px h-6 bg-graphon-border dark:bg-graphon-dark-border mx-1" />

            <MenuButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
              title="Heading 1"
            >
              <span className="text-sm font-bold px-1">H1</span>
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              title="Heading 2"
            >
              <span className="text-sm font-bold px-1">H2</span>
            </MenuButton>

            <div className="w-px h-6 bg-graphon-border dark:bg-graphon-dark-border mx-1" />

            <MenuButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="Bullet List"
            >
              <ListBulletIcon className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              isActive={editor.isActive('taskList')}
              title="Checklist"
            >
              <CheckIcon className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              title="Quote"
            >
              <Bars3BottomLeftIcon className="w-4 h-4" />
            </MenuButton>
          </div>
        </div>
      </div>

      {/* Editor Container - Graphon Style Centered */}
      <div className={`h-full overflow-y-auto ${!isSidebarVisible ? 'pt-4 md:pt-0' : ''}`}>
        <div className="w-full max-w-3xl mx-auto px-8 md:px-16 py-12">
            {/* Title Input */}
            <input
                type="text"
                value={activeNote?.title || ''}
                onChange={(e) => onUpdateNote(activeNoteId, { title: e.target.value })}
                placeholder="New page"
                className="w-full text-4xl font-bold bg-transparent border-none outline-none placeholder-gray-300 dark:placeholder-gray-600 mb-8"
            />

          {/* Editor */}
          <EditorContent editor={editor} className="graphon-editor" />
        </div>
        <div className="h-64" /> {/* Bottom spacing */}
      </div>

      {/* Task List Styles */}
      <style>{`
                .task-list {
                    list-style: none;
                    padding: 0;
                }
                .task-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.5rem;
                    margin-bottom: 0.25rem;
                }
                .task-item > label {
                    display: flex;
                    align-items: center;
                    margin-top: 0.2rem;
                }
                .task-item > label > input[type="checkbox"] {
                    width: 1.1em;
                    height: 1.1em;
                    cursor: pointer;
                }
                .graphon-editor .prose {
                    max-width: 800px;
                    margin: 0 auto;
                }
                /* Placeholder styling */
                .ProseMirror p.is-editor-empty:first-child::before {
                    color: #adb5bd;
                    content: attr(data-placeholder);
                    float: left;
                    height: 0;
                    pointer-events: none;
                }
                .dark .ProseMirror p.is-editor-empty:first-child::before {
                    color: #4b5563;
                }
            `}</style>
    </div>
  )
}
