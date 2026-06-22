import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getStoryBySlug, getAllStories } from '@/lib/data'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

interface StoryPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const stories = await getAllStories()
  return stories.map(s => ({ slug: s.slug }))
}

export default async function StoryPage({ params }: StoryPageProps) {
  const { slug } = await params
  const story = await getStoryBySlug(slug)
  if (!story) notFound()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-6 w-full">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-400 mb-4">
          <Link href="/" className="hover:text-blue-600">Trang chủ</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-600">{story.title}</span>
        </nav>

        {/* Story info */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="md:flex">
            {/* Thumbnail */}
            <div className="md:w-72 shrink-0">
              <img
                src={story.thumbnail}
                alt={story.title}
                className="w-full md:w-72 h-96 md:h-auto object-cover"
              />
            </div>

            {/* Info */}
            <div className="p-6 flex-1">
              <h1 className="text-2xl font-bold text-gray-800 mb-1">{story.title}</h1>
              {story.altTitle && (
                <p className="text-sm text-gray-400 mb-3">{story.altTitle}</p>
              )}

              <div className="flex flex-wrap gap-3 mb-4 text-sm">
                <span className={`px-2 py-0.5 rounded-full font-medium text-white ${
                  story.status === 'ongoing' ? 'bg-green-500' :
                  story.status === 'completed' ? 'bg-blue-500' : 'bg-gray-500'
                }`}>
                  {story.status === 'ongoing' ? 'Đang tiến hành' :
                   story.status === 'completed' ? 'Hoàn thành' : 'Tạm ngưng'}
                </span>
                <span className="text-gray-500">📖 {story.chapters.length} chương</span>
                <span className="text-gray-500">👁️ {(story.views || 0).toLocaleString()}</span>
                {story.author && <span className="text-gray-500">✍️ {story.author}</span>}
                <span className="text-gray-500">🕐 {story.updatedAt}</span>
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {story.genres.map(g => (
                  <Link
                    key={g}
                    href={`/?genre=${g}`}
                    className="px-2.5 py-1 text-xs bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                  >
                    {g}
                  </Link>
                ))}
              </div>

              {/* Description */}
              <div className="text-sm text-gray-600 leading-relaxed">
                <h3 className="font-semibold text-gray-700 mb-1">Giới thiệu:</h3>
                <p>{story.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chapter list */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">📋 Danh sách chương</h2>
          </div>
          {story.chapters.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {[...story.chapters].reverse().map(ch => (
                <Link
                  key={ch.id}
                  href={`/truyen/${story.slug}/${ch.slug}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Chương {ch.number}: {ch.title}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{ch.createdAt}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">
              Chưa có chương nào
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
