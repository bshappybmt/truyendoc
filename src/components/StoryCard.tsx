import Link from 'next/link'
import { Story } from '@/lib/types'

export default function StoryCard({ story }: { story: Story }) {
  return (
    <Link
      href={`/truyen/${story.slug}`}
      className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 hover:border-blue-200 hover:-translate-y-1"
    >
      <div className="aspect-[3/4] bg-gray-100 relative overflow-hidden">
        <img
          src={story.thumbnail}
          alt={story.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            story.status === 'ongoing' ? 'bg-green-500 text-white' :
            story.status === 'completed' ? 'bg-blue-500 text-white' :
            'bg-gray-500 text-white'
          }`}>
            {story.status === 'ongoing' ? 'Đang tiến hành' :
             story.status === 'completed' ? 'Hoàn thành' : 'Tạm ngưng'}
          </span>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm text-gray-800 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug">
          {story.title}
        </h3>
        <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
          <span>📖 {story.chapters.length} chương</span>
          <span>👁️ {(story.views || 0).toLocaleString()}</span>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {story.genres.slice(0, 2).map(g => (
            <span key={g} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
              {g}
            </span>
          ))}
        </div>
      </div>
    </Link>
  )
}
