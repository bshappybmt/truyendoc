import { getAllStories } from '@/lib/data'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import HomeContent from './HomeContent'

export default async function HomePage() {
  const stories = await getAllStories()
  const allGenres = [...new Set(stories.flatMap(s => s.genres))]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
        <section className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
            <h1 className="text-3xl font-bold mb-2">📚 Truyện Đọc</h1>
            <p className="text-blue-100">Kho truyện đọc online miễn phí, cập nhật mỗi ngày!</p>
          </div>
        </section>
        <HomeContent stories={stories} allGenres={allGenres} />
      </main>
      <Footer />
    </div>
  )
}
