import { Story } from './types'

let cachedStories: Story[] | null = null

function loadStories(): Story[] {
  if (cachedStories) return cachedStories
  
  // Direct import works during build time
  try {
    // Use require for sync loading at build time
    const data = require('../../data/stories.json') as Story[]
    cachedStories = data
    return data
  } catch {
    // Fallback for runtime SSR
    try {
      const fs = require('fs')
      const path = require('path')
      const raw = fs.readFileSync(
        path.join(process.cwd(), 'data', 'stories.json'),
        'utf-8'
      )
      const data = JSON.parse(raw) as Story[]
      cachedStories = data
      return data
    } catch {
      return []
    }
  }
}

export async function getAllStories(): Promise<Story[]> {
  return loadStories()
}

export async function getStoryBySlug(slug: string): Promise<Story | null> {
  const stories = loadStories()
  return stories.find(s => s.slug === slug) || null
}

export async function getChapter(
  storySlug: string,
  chapterSlug: string
): Promise<{ story: Story; chapterIndex: number } | null> {
  const story = loadStories().find(s => s.slug === storySlug)
  if (!story) return null
  const idx = story.chapters.findIndex(c => c.slug === chapterSlug)
  if (idx === -1) return null
  return { story, chapterIndex: idx }
}
