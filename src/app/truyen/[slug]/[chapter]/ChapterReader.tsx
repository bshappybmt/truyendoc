'use client'

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
  return (
    <div className="flex-1">
      <div className="max-w-3xl mx-auto">
        {chapter.pages.map((page, index) => (
          <div key={index} className="mb-2">
            <img
              src={page}
              alt={`Trang ${index + 1}`}
              className="w-full h-auto"
              style={{ minHeight: '50vh', background: '#1f2937' }}
            />
          </div>
        ))}
      </div>

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

          <Link
            href={`/truyen/${storySlug}`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm"
          >
            📋 DS
          </Link>

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
