import { readFileSync } from 'fs'
import { join } from 'path'

const KNOWLEDGE_DIR = join(process.cwd(), 'knowledge')

const cache = new Map<string, string>()

/**
 * Load a knowledge file by name (without extension).
 * Cached in memory after first read.
 */
export function loadKnowledge(name: string): string {
  if (cache.has(name)) return cache.get(name)!
  const content = readFileSync(join(KNOWLEDGE_DIR, `${name}.md`), 'utf-8')
  cache.set(name, content)
  return content
}

/**
 * Load multiple knowledge files and combine them with separators.
 */
export function loadKnowledgeBundle(names: string[]): string {
  return names.map((name) => {
    const content = loadKnowledge(name)
    return `--- REFERENCE: ${name} ---\n${content}`
  }).join('\n\n')
}

/**
 * Get platform-specific algorithm section from the full algorithms file.
 * Returns the full file if platform not found.
 */
export function loadPlatformKnowledge(platform: string): string {
  const full = loadKnowledge('platform-algorithms')
  const platformKey = platform.toLowerCase()

  const sectionMap: Record<string, string> = {
    tiktok: '## TikTok',
    instagram: '## Instagram Reels',
    youtube: '## YouTube Shorts',
  }

  const header = sectionMap[platformKey]
  if (!header) return full

  const start = full.indexOf(header)
  if (start === -1) return full

  // Find next ## section or ## Cross-Platform
  const nextSection = full.indexOf('\n## ', start + header.length)
  const section = nextSection === -1 ? full.slice(start) : full.slice(start, nextSection)

  // Always include cross-platform insights
  const crossPlatform = full.indexOf('## Cross-Platform Insights')
  const crossSection = crossPlatform !== -1 ? full.slice(crossPlatform) : ''

  return `${section}\n\n${crossSection}`
}
