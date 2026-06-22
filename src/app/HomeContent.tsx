'use client'

import { useState, useMemo } from 'react'
import { Story } from '@/lib/types'
import StoryCard from '@/components/StoryCard'

export default function HomeContent({
  stories,
  allGenres,
}: {
  stories: Story[]
  allGenres: string[]
}) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'default' | 'views' | 'newest'>('default')
  const [selectedGenre, setSelectedGenre] = useState('')

  const filtered = useMemo(() => {
    let result = [...stories]

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.altTitle?.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
      )
    }

    if (selectedGenre) {
      result = result.filter(s =>
        s.genres.some(g => g.toLowerCase() === selectedGenre.toLowerCase())
      )
    }

    if (sort === 'views') {
      result.sort((a, b) => (b.views || 0) - (a.views || 0))
    } else if (sort === 'newest') {
      result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    }

    return result
  }, [stories, search, sort, selectedGenre])

  return (
    <>
      {/* Search bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="🔍 Tìm truyện..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Sort + Genre filter */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1">
          {[
            { key: 'default', label: 'Tất cả' },
            { key: 'views', label: '👁️ Xem nhiều' },
            { key: 'newest', label: '🆕 Mới nhất' },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setSort(opt.key as typeof sort)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                sort === opt.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Genre pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedGenre('')}
          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
            !selectedGenre
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-blue-50'
          }`}
        >
          Tất cả
        </button>
        {allGenres.map(g => (
          <button
            key={g}
            onClick={() => setSelectedGenre(g)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              selectedGenre === g
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-blue-50'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-400 mb-4">{filtered.length} truyện</p>

      {/* Story grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map(story => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-4">🔍</p>
          <p>Không tìm thấy truyện nào</p>
        </div>
      )}
    </>
  )
}
