export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-bold mb-3">📚 Truyện Đọc</h3>
            <p className="text-sm leading-relaxed">
              Kho truyện đọc online miễn phí, cập nhật liên tục mỗi ngày.
            </p>
          </div>
          <div>
            <h3 className="text-white font-bold mb-3">Liên kết</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/" className="hover:text-white transition-colors">Trang chủ</a></li>
              <li><a href="/?sort=views" className="hover:text-white transition-colors">Phổ biến</a></li>
              <li><a href="/?sort=newest" className="hover:text-white transition-colors">Mới cập nhật</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-bold mb-3">Thể loại</h3>
            <div className="flex flex-wrap gap-2 text-sm">
              {['Romance', 'Comedy', 'Drama', 'Fantasy', 'Action', 'Adult', 'Harem', 'School Life'].map(g => (
                <a key={g} href={`/?genre=${g}`} className="hover:text-white transition-colors">
                  {g}
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-4 text-center text-xs">
          © {new Date().getFullYear()} Truyện Đọc. Built with ❤️
        </div>
      </div>
    </footer>
  )
}
