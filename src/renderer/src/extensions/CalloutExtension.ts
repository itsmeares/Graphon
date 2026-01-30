import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { CalloutBlock } from '../components/editor/blocks/CalloutBlock'

export interface CalloutOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: () => ReturnType
      toggleCallout: () => ReturnType
    }
  }
}

export const CalloutExtension = Node.create<CalloutOptions>({
  name: 'callout',

  group: 'block',

  content: 'block+',

  draggable: true,

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: (element) => element.getAttribute('data-callout-type'),
        renderHTML: (attributes) => ({
          'data-callout-type': attributes.type
        })
      },
      emoji: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-emoji'),
        renderHTML: (attributes) => {
          if (!attributes.emoji) return {}
          return {
            'data-emoji': attributes.emoji
          }
        }
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'callout' }),
      0
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutBlock)
  },

  addCommands() {
    return {
      setCallout:
        () =>
        ({ commands }) => {
          return commands.wrapIn(this.name)
        },
      toggleCallout:
        () =>
        ({ commands }) => {
          return commands.toggleWrap(this.name)
        }
    }
  }
})
