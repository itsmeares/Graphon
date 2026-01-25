import { memo } from 'react'
import type { ViewType, ViewConfig } from '../../types'
import {
  TableCellsIcon,
  ViewColumnsIcon,
  Squares2X2Icon,
  ChartBarIcon,
  ListBulletIcon,
  MapIcon,
  CalendarIcon,
  ClockIcon,
  PresentationChartLineIcon,
  IdentificationIcon
} from '@heroicons/react/24/outline'

interface ViewSwitcherProps {
  views: ViewConfig[]
  currentViewId: string
  onViewChange: (viewId: string) => void
  onAddView?: (type: ViewType) => void
}

const VIEW_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  table: TableCellsIcon,
  board: ViewColumnsIcon,
  gallery: Squares2X2Icon,
  list: ListBulletIcon,
  chart: ChartBarIcon,
  timeline: ClockIcon,
  feed: PresentationChartLineIcon,
  map: MapIcon,
  calendar: CalendarIcon,
  form: IdentificationIcon
}

const VIEW_ORDER = [
  'table',
  'board',
  'gallery',
  'list',
  'chart',
  'timeline',
  'feed',
  'map',
  'calendar',
  'form'
]

const VIEW_LABELS: Record<string, string> = {
  table: 'Table',
  board: 'Board',
  gallery: 'Gallery',
  list: 'List',
  chart: 'Chart',
  timeline: 'Timeline',
  feed: 'Feed',
  map: 'Map',
  calendar: 'Calendar',
  form: 'Form builder'
}

const ViewSwitcher = memo(function ViewSwitcher({
  views,
  currentViewId,
  onViewChange,
  onAddView
}: ViewSwitcherProps) {
  return (
    <div className="flex items-center space-x-0.5 overflow-x-auto no-scrollbar">
      {VIEW_ORDER.map((type) => {
        const Icon = VIEW_ICONS[type]
        const view = views.find((v) => v.type === type)
        const isActive = view && view.id === currentViewId

        return (
          <button
            key={type}
            onClick={() => view && onViewChange(view.id)}
            className={`
                            flex items-center gap-1.5 px-2 py-1 rounded-md text-[13px] font-medium whitespace-nowrap
                            transition-all duration-100 group
                            ${
                              isActive
                                ? 'bg-black/5 dark:bg-white/5 text-graphon-text-main dark:text-[#dfdfdf] border border-black/5 dark:border-white/10 shadow-sm'
                                : 'text-graphon-text-secondary dark:text-[#9b9b9b] hover:bg-black/5 dark:hover:bg-white/5 hover:text-graphon-text-main dark:hover:text-[#dfdfdf]'
                            }
                            ${!view ? 'opacity-40 cursor-not-allowed' : ''}
                        `}
            disabled={!view}
          >
            <Icon
              className={`w-4 h-4 ${isActive ? 'text-graphon-text-main dark:text-white' : 'text-graphon-text-secondary/70 dark:text-[#9b9b9b]/70 group-hover:text-graphon-text-main dark:group-hover:text-[#dfdfdf]'}`}
            />
            <span>{VIEW_LABELS[type]}</span>
          </button>
        )
      })}

      {/* Add View Button */}
      {onAddView && (
        <button
          className="p-1.5 text-graphon-text-secondary dark:text-[#9b9b9b] hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors ml-1"
          title="Add View"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
    </div>
  )
})

export default ViewSwitcher
