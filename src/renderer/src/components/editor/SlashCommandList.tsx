import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react'

import { Editor } from '@tiptap/react'

export interface CommandItemProps {
  title: string
  description?: string // Keeping optional for backward compatibility if needed, but not used in render
  shortcut?: string
  icon: React.ReactNode
  command: (params: { editor: Editor; range: any }) => void
}

interface SlashCommandListProps {
  items: CommandItemProps[]
  command: any
  editor: any
  onKeyDown?: (props: { event: KeyboardEvent }) => boolean
}

export const SlashCommandList = forwardRef((props: SlashCommandListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = useCallback(
    (index: number) => {
      const item = props.items[index]
      if (item) {
        props.command(item)
      }
    },
    [props]
  )

  useEffect(() => {
    setSelectedIndex(0)
  }, [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
        return true
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % props.items.length)
        return true
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex)
        return true
      }
      return false
    }
  }))

  return (
    <div className="z-50 h-auto max-h-82.5 w-64 overflow-y-auto rounded-xl border border-graphon-border dark:border-graphon-dark-border bg-white dark:bg-graphon-dark-sidebar shadow-2xl animate-in fade-in zoom-in-95 duration-150 p-1.5 font-sans">
      <div className="px-2 py-1.5 text-[11px] font-medium text-gray-400 dark:text-gray-500 select-none uppercase tracking-wider">
        Basic blocks
      </div>
      {props.items.map((item, index) => (
        <button
          key={index}
          className={`group flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm text-left transition-all
            ${
              index === selectedIndex
                ? 'bg-(--color-accent) text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
            }
          `}
          onClick={() => selectItem(index)}
        >
          <div className="flex items-center space-x-2.5">
            <div
              className={`flex items-center justify-center
                ${index === selectedIndex ? 'text-white' : 'text-gray-500 dark:text-gray-400'}
            `}
            >
              {item.icon}
            </div>
            <span className="font-medium">{item.title}</span>
          </div>
          {item.shortcut && (
            <span
              className={`text-[10px] font-mono tracking-tighter ${index === selectedIndex ? 'text-white/80' : 'text-gray-400 dark:text-gray-600'}`}
            >
              {item.shortcut}
            </span>
          )}
        </button>
      ))}
    </div>
  )
})

SlashCommandList.displayName = 'SlashCommandList'

export default SlashCommandList
