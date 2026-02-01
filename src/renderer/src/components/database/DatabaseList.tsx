import { useState, useEffect } from 'react'
import { PlusIcon, TrashIcon, CircleStackIcon } from '@heroicons/react/24/outline'

interface DatabaseMeta {
  id: string
  name: string
  icon: string
  createdAt: number
}

interface DatabaseListProps {
  onSelectDatabase: (id: string) => void
}

export default function DatabaseList({ onSelectDatabase }: DatabaseListProps) {
  const [databases, setDatabases] = useState<DatabaseMeta[]>([])

  useEffect(() => {
    loadDatabases()
  }, [])

  const loadDatabases = () => {
    const savedIndex = localStorage.getItem('graphon-db-index')
    if (savedIndex) {
      try {
        const parsed = JSON.parse(savedIndex)
        setDatabases(parsed)
      } catch (e) {
        console.error('Failed to load database index', e)
        setDatabases([])
      }
    }
  }

  const handleCreateDatabase = () => {
    const newId = `db_${Date.now()}`
    const newMeta: DatabaseMeta = {
      id: newId,
      name: 'New Database',
      icon: '📋',
      createdAt: Date.now()
    }

    const updatedList = [...databases, newMeta]
    setDatabases(updatedList)
    localStorage.setItem('graphon-db-index', JSON.stringify(updatedList))

    // Setup initial DB state is handled by DatabaseView when it opens empty
    // But we want to ensure it has the name/icon we just set
    // Actually, let's trigger the selection, DatabaseView will create default with this ID.
    // We might need to pass initial props to DatabaseView if we want it to match "New Database".
    onSelectDatabase(newId)
  }

  const handleDeleteDatabase = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this database?')) return

    const updatedList = databases.filter((db) => db.id !== id)
    setDatabases(updatedList)
    localStorage.setItem('graphon-db-index', JSON.stringify(updatedList))
    localStorage.removeItem(`graphon-db-${id}`)
  }

  return (
    <div className="flex-1 h-screen p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-graphon-text-main dark:text-graphon-dark-text-main mb-2">
              Databases
            </h1>
            <p className="text-graphon-text-secondary dark:text-graphon-dark-text-secondary">
              Manage your collections and verified data sources.
            </p>
          </div>
          <button
            onClick={handleCreateDatabase}
            className="flex items-center gap-2 px-4 py-2 bg-(--color-accent) hover:brightness-110 text-white font-bold rounded-lg transition-colors border border-(--color-accent)/50 shadow-sm"
          >
            <PlusIcon className="w-5 h-5" />
            Create Database
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {databases.map((db) => (
            <div
              key={db.id}
              onClick={() => onSelectDatabase(db.id)}
              className="group relative bg-white dark:bg-graphon-dark-sidebar/50 border border-graphon-border dark:border-graphon-dark-border rounded-xl p-5 cursor-pointer hover:border-(--color-accent) dark:hover:border-(--color-accent) transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 flex items-center justify-center bg-graphon-hover dark:bg-graphon-dark-hover rounded-lg text-2xl border border-graphon-border dark:border-graphon-dark-border">
                  {db.icon || <CircleStackIcon className="w-6 h-6 text-graphon-text-secondary" />}
                </div>
                <button
                  onClick={(e) => handleDeleteDatabase(e, db.id)}
                  className="p-1.5 text-graphon-text-secondary/50 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete Database"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>

              <h3 className="text-lg font-bold text-graphon-text-main dark:text-graphon-dark-text-main mb-1 truncate">
                {db.name}
              </h3>
              <p className="text-xs text-graphon-text-secondary dark:text-graphon-dark-text-secondary">
                Created {new Date(db.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}

          {databases.length === 0 && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-center border border-dashed border-graphon-border dark:border-graphon-dark-border rounded-xl">
              <CircleStackIcon className="w-16 h-16 text-graphon-text-secondary/30 mb-4" />
              <h3 className="text-lg font-semibold text-graphon-text-main dark:text-graphon-dark-text-main mb-1">
                No databases yet
              </h3>
              <p className="text-graphon-text-secondary dark:text-graphon-dark-text-secondary mb-4">
                Create your first database to start organizing Items.
              </p>
              <button
                onClick={handleCreateDatabase}
                className="text-(--color-accent) hover:underline font-bold"
              >
                Create new database
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
