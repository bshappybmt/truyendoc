export interface Story {
  id: string
  slug: string
  title: string
  altTitle?: string
  description: string
  thumbnail: string
  author?: string
  status: 'ongoing' | 'completed' | 'dropped'
  genres: string[]
  rating?: number
  views?: number
  updatedAt: string
  chapters: Chapter[]
}

export interface Chapter {
  id: string
  number: number
  title: string
  slug: string
  pages: string[]
  createdAt: string
}

export interface SiteConfig {
  name: string
  description: string
  url: string
  ogImage: string
}
