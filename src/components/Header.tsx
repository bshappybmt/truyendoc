import Link from 'next/link'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="text-2xl">📚</span>
          <span className="text-xl font-bold text-white group-hover:text-blue-200 transition-colors">
            Truyện Đọc
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-white/80">
          <Link href="/" className="hover:text-white transition-colors">Trang chủ</Link>
        </nav>
      </div>
    </header>
  )
}
