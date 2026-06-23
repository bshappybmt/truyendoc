import { Story } from './types'
import storiesData from '../../data/stories.json'

export async function getAllStories(): Promise<Story[]> {
  return storiesData as Story[]
}

export async function getStoryBySlug(slug: string): Promise<Story | null> {
  const stories = storiesData as Story[]
  return stories.find(s => s.slug === slug) || null
}

export async function getChapter(
  storySlug: string,
  chapterSlug: string
): Promise<{ story: Story; chapterIndex: number } | null> {
  const stories = storiesData as Story[]
  const story = stories.find(s => s.slug === storySlug)
  if (!story) return null
  const idx = story.chapters.findIndex(c => c.slug === chapterSlug)
  if (idx === -1) return null
  return { story, chapterIndex: idx }
}
