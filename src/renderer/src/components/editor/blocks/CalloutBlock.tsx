import { NodeViewContent, NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import { AlertTriangle, Info, XCircle } from 'lucide-react'

export function CalloutBlock({ node: { attrs } }: NodeViewProps) {
  const type = attrs.type || 'info'
  const emoji = attrs.emoji

  const getIcon = () => {
    if (emoji) return <span>{emoji}</span>

    switch (type) {
      case 'warning':
        return <AlertTriangle size={20} />
      case 'danger':
        return <XCircle size={20} />
      case 'info':
      default:
        return <Info size={20} />
    }
  }

  const getColors = () => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400'
      case 'danger':
        return 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
      case 'info':
      default:
        return 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
    }
  }

  return (
    <NodeViewWrapper className="my-4">
      <div
        className={`flex items-start gap-3 p-4 rounded-lg border ${getColors()}`}
        data-type="callout"
      >
        <div className="shrink-0 mt-0.5 select-none opacity-80">{getIcon()}</div>

        <NodeViewContent className="flex-1 min-w-0" />
      </div>
    </NodeViewWrapper>
  )
}
