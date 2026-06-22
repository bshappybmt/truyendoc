import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getChapter, getAllStories } from '@/lib/data'
import ChapterReader from './ChapterReader'

interface ReaderPageProps {
  params: Promise<{ slug: string; chapter: string }>
}

export async function generateStaticParams() {
  const stories = await getAllStories()
  const params: { slug: string; chapter: string }[] = []
  for (const story of stories) {
    for (const chapter of story.chapters) {
      params.push({ slug: story.slug, chapter: chapter.slug })
    }
  }
  return params
}

export default async function ReaderPage({ params }: ReaderPageProps) {
  const { slug, chapter: chapterSlug } = await params
  const result = await getChapter(slug, chapterSlug)

  if (!result) notFound()

  const { story, chapterIndex } = result
  const chapter = story.chapters[chapterIndex]
  const prevChapter = chapterIndex > 0 ? story.chapters[chapterIndex - 1] : null
  const nextChapter = chapterIndex < story.chapters.length - 1 ? story.chapters[chapterIndex + 1] : null

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href={`/truyen/${story.slug}`}
            className="text-white/60 hover:text-white text-sm transition-colors flex items-center gap-1"
          >
            ← {story.title}
          </Link>
          <span className="text-white/60 text-sm">
            Chương {chapter.number}
          </span>
        </div>
      </div>

      {/* Chapter reader content */}
      <ChapterReader
        storySlug={story.slug}
        chapter={chapter}
        prevChapter={prevChapter}
        nextChapter={nextChapter}
      />

      {/* Bottom bar */}
      <div className="sticky bottom-0 z-40 bg-black/80 backdrop-blur-sm border-t border-gray-800">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-center gap-4">
          {prevChapter ? (
            <Link
              href={`/truyen/${story.slug}/${prevChapter.slug}`}
              className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              ← Chương {prevChapter.number}
            </Link>
          ) : (
            <span className="px-6 py-2 bg-gray-800 text-gray-500 rounded-lg text-sm cursor-not-allowed">
              ← Chương trước
            </span>
          )}

          <Link
            href={`/truyen/${story.slug}`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm"
          >
            📋 Danh sách
          </Link>

          {nextChapter ? (
            <Link
              href={`/truyen/${story.slug}/${nextChapter.slug}`}
              className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              Chương {nextChapter.number} →
            </Link>
          ) : (
            <span className="px-6 py-2 bg-gray-800 text-gray-500 rounded-lg text-sm cursor-not-allowed">
              Chương sau →
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
