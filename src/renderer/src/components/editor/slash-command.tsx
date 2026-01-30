import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import {
  Text,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Minus,
  Image as ImageIcon
} from 'lucide-react'
import SlashCommandList from './SlashCommandList'
import { Editor, Range } from '@tiptap/core'

interface CommandProps {
  editor: Editor
  range: Range
}

export const renderItems = () => {
  let component: ReactRenderer<any> | null = null
  let popup: any | null = null

  return {
    onStart: (props: { editor: Editor; clientRect: (() => DOMRect) | null }) => {
      component = new ReactRenderer(SlashCommandList, {
        props,
        editor: props.editor
      })

      if (!props.clientRect) {
        return
      }

      // @ts-ignore
      popup = tippy('body', {
        getReferenceClientRect: props.clientRect,
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: 'manual',
        placement: 'bottom-start'
      })
    },

    onUpdate: (props: { editor: Editor; clientRect: (() => DOMRect) | null }) => {
      component?.updateProps(props)

      if (!props.clientRect) {
        return
      }

      popup?.[0].setProps({
        getReferenceClientRect: props.clientRect
      })
    },

    onKeyDown: (props: { event: KeyboardEvent }) => {
      if (props.event.key === 'Escape') {
        popup?.[0].hide()
        return true
      }

      // @ts-ignore
      return component?.ref?.onKeyDown(props)
    },

    onExit: () => {
      popup?.[0].destroy()
      component?.destroy()
    }
  }
}

const CommandItems = [
  {
    title: 'Text',
    shortcut: '',
    icon: <Text size={16} />,
    command: ({ editor, range }: CommandProps) => {
      editor.chain().focus().deleteRange(range).toggleNode('paragraph', 'paragraph').run()
    }
  },
  {
    title: 'Heading 1',
    shortcut: '#',
    icon: <Heading1 size={16} />,
    command: ({ editor, range }: CommandProps) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
    }
  },
  {
    title: 'Heading 2',
    shortcut: '##',
    icon: <Heading2 size={16} />,
    command: ({ editor, range }: CommandProps) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
    }
  },
  {
    title: 'Heading 3',
    shortcut: '###',
    icon: <Heading3 size={16} />,
    command: ({ editor, range }: CommandProps) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run()
    }
  },
  {
    title: 'Bulleted list',
    shortcut: '-',
    icon: <List size={16} />,
    command: ({ editor, range }: CommandProps) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run()
    }
  },
  {
    title: 'Numbered list',
    shortcut: '1.',
    icon: <ListOrdered size={16} />,
    command: ({ editor, range }: CommandProps) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run()
    }
  },
  {
    title: 'To-do list',
    shortcut: '[]',
    icon: <CheckSquare size={16} />,
    command: ({ editor, range }: CommandProps) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run()
    }
  },
  {
    title: 'Quote',
    shortcut: '>',
    icon: <Quote size={16} />,
    command: ({ editor, range }: CommandProps) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run()
    }
  },
  {
    title: 'Code',
    shortcut: '```',
    icon: <Code size={16} />,
    command: ({ editor, range }: CommandProps) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
    }
  },
  {
    title: 'Divider',
    shortcut: '---',
    icon: <Minus size={16} />,
    command: ({ editor, range }: CommandProps) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run()
    }
  },
  {
    title: 'Image',
    shortcut: '',
    icon: <ImageIcon size={16} />,
    command: ({ editor, range }: CommandProps) => {
      ;(editor.chain().focus().deleteRange(range) as any)
        .setImage({ src: 'https://source.unsplash.com/random/800x600' })
        .run()
    }
  },
  {
    title: 'Callout',
    shortcut: '/callout',
    icon: <div className="text-base">💡</div>,
    command: ({ editor, range }: CommandProps) => {
      ;(editor.chain().focus().deleteRange(range) as any)
        .insertContent({
          type: 'callout',
          attrs: {
            type: 'info',
            emoji: '💡'
          },
          content: [{ type: 'paragraph' }]
        })
        .run()
    }
  },
  {
    title: 'Warning',
    shortcut: '/warning',
    icon: <div className="text-base">⚠️</div>,
    command: ({ editor, range }: CommandProps) => {
      ;(editor.chain().focus().deleteRange(range) as any)
        .insertContent({
          type: 'callout',
          attrs: {
            type: 'warning',
            emoji: '⚠️'
          },
          content: [{ type: 'paragraph' }]
        })
        .run()
    }
  },
  {
    title: 'Danger',
    shortcut: '/danger',
    icon: <div className="text-base">🚨</div>,
    command: ({ editor, range }: CommandProps) => {
      ;(editor.chain().focus().deleteRange(range) as any)
        .insertContent({
          type: 'callout',
          attrs: {
            type: 'danger',
            emoji: '🚨'
          },
          content: [{ type: 'paragraph' }]
        })
        .run()
    }
  }
]

export const getSuggestionItems = ({ query }: { query: string }) => {
  return CommandItems.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 10)
}

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: { editor: Editor; range: Range; props: any }) => {
          props.command({ editor, range })
        },
        items: getSuggestionItems,
        render: renderItems
      }
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion
      })
    ]
  }
})
