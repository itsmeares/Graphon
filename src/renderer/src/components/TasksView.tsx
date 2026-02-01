import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, Circle, FileText, RefreshCw } from 'lucide-react'

interface TaskItem {
  id: string
  content: string
  completed: boolean
  filePath: string
  fileTitle: string
}

interface TasksViewProps {
  onOpenFile?: (path: string) => void
}

export default function TasksView({ onOpenFile }: TasksViewProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    try {
      const result = await window.api.getAllTasks()
      setTasks(result)
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()

    // Listen for vault index updates
    const unsubscribe = window.api.onVaultIndexUpdated(() => {
      fetchTasks()
    })

    return () => {
      unsubscribe()
    }
  }, [fetchTasks])

  const pendingTasks = tasks.filter((t) => !t.completed)
  const completedTasks = tasks.filter((t) => t.completed)

  const handleFileClick = (filePath: string) => {
    if (onOpenFile) {
      onOpenFile(filePath)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 h-full flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center select-none">
        <div className="w-16 h-16 mb-6 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />
        </div>
        <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
          No Tasks Found
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm text-center max-w-sm">
          Add tasks to your notes using markdown syntax:
          <br />
          <code className="px-2 py-1 mt-2 inline-block bg-neutral-100 dark:bg-neutral-800 rounded text-xs">
            - [ ] Your task here
          </code>
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 h-full overflow-hidden">
      <div className="h-full overflow-y-auto px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Tasks</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {pendingTasks.length} pending · {completedTasks.length} completed
          </p>
        </div>

        {/* Pending Tasks */}
        {pendingTasks.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">
              Pending
            </h2>
            <div className="space-y-2">
              {pendingTasks.map((task) => (
                <TaskCard key={task.id} task={task} onFileClick={handleFileClick} />
              ))}
            </div>
          </section>
        )}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">
              Completed
            </h2>
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <TaskCard key={task.id} task={task} onFileClick={handleFileClick} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

interface TaskCardProps {
  task: TaskItem
  onFileClick: (path: string) => void
}

function TaskCard({ task, onFileClick }: TaskCardProps) {
  return (
    <div
      className={`
        group flex items-start gap-3 p-4 rounded-xl
        bg-white dark:bg-neutral-800/50
        border border-neutral-200/50 dark:border-neutral-700/50
        hover:border-neutral-300 dark:hover:border-neutral-600
        transition-all duration-200
        ${task.completed ? 'opacity-60' : ''}
      `}
    >
      {/* Checkbox Icon */}
      <div className="mt-0.5 shrink-0">
        {task.completed ? (
          <CheckCircle2 className="w-5 h-5 text-(--color-accent)" />
        ) : (
          <Circle className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`
            text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed
            ${task.completed ? 'line-through text-neutral-500 dark:text-neutral-500' : ''}
          `}
        >
          {task.content}
        </p>

        {/* Source File Badge */}
        <button
          onClick={() => onFileClick(task.filePath)}
          className="
            mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md
            bg-neutral-100 dark:bg-neutral-700/50
            text-xs text-neutral-600 dark:text-neutral-400
            hover:bg-neutral-200 dark:hover:bg-neutral-700
            hover:text-neutral-800 dark:hover:text-neutral-200
            transition-colors duration-150
          "
        >
          <FileText className="w-3 h-3" />
          {task.fileTitle}
        </button>
      </div>
    </div>
  )
}
