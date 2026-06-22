'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Chapter } from '@/lib/types'

interface ChapterReaderProps {
  storySlug: string
  chapter: Chapter
  prevChapter: Chapter | null
  nextChapter: Chapter | null
}

export default function ChapterReader({
  storySlug,
  chapter,
  prevChapter,
  nextChapter,
}: ChapterReaderProps) {
  const [loaded, setLoaded] = useState<Set<number>>(new Set([0]))
  const [showSettings, setShowSettings] = useState(false)
  const [fitMode, setFitMode] = useState<'width' | 'height'>('width')

  const handleImageLoad = (index: number) => {
    setLoaded(prev => new Set(prev).add(index))
  }

  return (
    <div className="flex-1">
      <div className={`max-w-${fitMode === 'width' ? '3xl' : '5xl'} mx-auto`}>
        {chapter.pages.map((page, index) => (
          <div key={index} className="relative">
            {/* Loading placeholder */}
            {!loaded.has(index) && (
              <div className="flex items-center justify-center bg-gray-800 min-h-[300px]">
                <div className="animate-pulse flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-gray-500 text-sm">Đang tải...</span>
                </div>
              </div>
            )}
            <img
              src={page}
              alt={`Trang ${index + 1}`}
              className={`w-full ${
                fitMode === 'width' ? 'object-contain' : 'h-screen object-contain'
              } ${loaded.has(index) ? 'block' : 'hidden'}`}
              onLoad={() => handleImageLoad(index)}
              loading="lazy"
            />
          </div>
        ))}
      </div>

      {/* Navigation between chapters at bottom */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center gap-4">
          {prevChapter ? (
            <Link
              href={`/truyen/${storySlug}/${prevChapter.slug}`}
              className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm text-center"
            >
              ← Chương {prevChapter.number}
            </Link>
          ) : null}

          {nextChapter ? (
            <Link
              href={`/truyen/${storySlug}/${nextChapter.slug}`}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm text-center"
            >
              Chương {nextChapter.number} →
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}
