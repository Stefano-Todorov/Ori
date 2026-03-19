import { anthropic } from './claude'

/**
 * The 10 binary eval questions for scoring short-form video scripts.
 * Each "yes" answer = 1 point, producing a score out of 10.
 * Each question also maps to a tag for pattern analysis.
 */
export const EVAL_QUESTIONS = [
  { id: 'transformation', question: 'Does the hook describe a result or transformation, not just a topic?', tag: 'transformation' },
  { id: 'curiosity_gap', question: 'Does the hook create a curiosity gap or open loop?', tag: 'curiosity-gap' },
  { id: 'scroll_stopper', question: 'Would the first line make someone stop scrolling?', tag: 'scroll-stopper' },
  { id: 'strong_opener', question: 'Does the hook avoid starting with "In this video" or similar weak openers?', tag: 'strong-opener' },
  { id: 'actionable', question: 'Is the script framed around "what you can do," not "what something is"?', tag: 'actionable' },
  { id: 'focused', question: 'Does the script stay on one single idea (not 2-3 topics)?', tag: 'focused' },
  { id: 'conversational', question: 'Does the script use conversational language, not corporate/formal tone?', tag: 'conversational' },
  { id: 'fast_payoff', question: 'Does the script deliver on the hook\'s promise quickly (not long buildup)?', tag: 'fast-payoff' },
  { id: 'clear_cta', question: 'Is there a clear, single CTA (not multiple asks)?', tag: 'clear-cta' },
  { id: 'pattern_interrupt', question: 'Does the script have a surprising element or pattern interrupt?', tag: 'pattern-interrupt' },
] as const

export type EvalQuestionId = typeof EVAL_QUESTIONS[number]['id']

export interface EvalResult {
  score: number          // 0-10
  tags: string[]         // tags from questions answered "yes"
  answers: Record<EvalQuestionId, boolean>
}

/**
 * Score a script using the 10 binary eval questions.
 * Uses Haiku for speed and cost efficiency.
 */
export async function evalScript(scriptText: string): Promise<EvalResult> {
  const questionsBlock = EVAL_QUESTIONS
    .map((q, i) => `${i + 1}. [${q.id}] ${q.question}`)
    .join('\n')

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `You are evaluating a short-form video script. Answer each question with ONLY "yes" or "no".

SCRIPT:
${scriptText}

QUESTIONS:
${questionsBlock}

Return a JSON object with the question IDs as keys and boolean values. Example:
{"transformation": true, "curiosity_gap": false, ...}

Return ONLY the JSON, no other text.`,
    }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Eval returned non-text response')
  }

  let answers: Record<string, boolean>
  try {
    answers = JSON.parse(content.text)
  } catch {
    const match = content.text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Failed to parse eval response')
    answers = JSON.parse(match[0])
  }

  const tags: string[] = []
  let score = 0

  for (const q of EVAL_QUESTIONS) {
    if (answers[q.id]) {
      score++
      tags.push(q.tag)
    }
  }

  return { score, tags, answers: answers as Record<EvalQuestionId, boolean> }
}

/**
 * Build a full script text from its parts for eval scoring.
 */
export function buildScriptText(hook: string, body: string, cta?: string | null): string {
  let text = `HOOK: ${hook}\n\nBODY:\n${body}`
  if (cta) text += `\n\nCTA: ${cta}`
  return text
}

/**
 * Generate a performance summary from scored posts for coach context.
 * Keeps it compact (~100-200 tokens) to minimize cost.
 */
export function buildPerformanceSummary(
  posts: { views: number; eval_score: number | null; eval_tags: string[] | null }[]
): string | null {
  const scored = posts.filter(p => p.eval_score != null && p.views > 0)
  if (scored.length < 5) return null // not enough data yet

  // Sort by views
  const sorted = [...scored].sort((a, b) => b.views - a.views)
  const topQuartile = sorted.slice(0, Math.max(3, Math.floor(sorted.length * 0.25)))
  const bottomQuartile = sorted.slice(-Math.max(3, Math.floor(sorted.length * 0.25)))

  // Count tag frequency in top vs bottom
  const topTags: Record<string, number> = {}
  const bottomTags: Record<string, number> = {}

  for (const p of topQuartile) {
    for (const tag of p.eval_tags ?? []) {
      topTags[tag] = (topTags[tag] ?? 0) + 1
    }
  }
  for (const p of bottomQuartile) {
    for (const tag of p.eval_tags ?? []) {
      bottomTags[tag] = (bottomTags[tag] ?? 0) + 1
    }
  }

  // Find winning and losing patterns
  const winningPatterns = Object.entries(topTags)
    .filter(([tag]) => (topTags[tag] ?? 0) > (bottomTags[tag] ?? 0))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag)

  const losingPatterns = Object.entries(bottomTags)
    .filter(([tag]) => (bottomTags[tag] ?? 0) > (topTags[tag] ?? 0))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag)

  const avgScoreTop = (topQuartile.reduce((s, p) => s + (p.eval_score ?? 0), 0) / topQuartile.length).toFixed(1)
  const avgScoreBottom = (bottomQuartile.reduce((s, p) => s + (p.eval_score ?? 0), 0) / bottomQuartile.length).toFixed(1)
  const avgViewsTop = Math.round(topQuartile.reduce((s, p) => s + p.views, 0) / topQuartile.length)
  const avgViewsBottom = Math.round(bottomQuartile.reduce((s, p) => s + p.views, 0) / bottomQuartile.length)

  return `PERFORMANCE PATTERNS (${scored.length} scored videos):
- Top performers (${topQuartile.length} videos): avg ${avgViewsTop.toLocaleString()} views, avg eval ${avgScoreTop}/10
- Bottom performers (${bottomQuartile.length} videos): avg ${avgViewsBottom.toLocaleString()} views, avg eval ${avgScoreBottom}/10
- Winning patterns: ${winningPatterns.join(', ') || 'not enough data'}
- Weak patterns: ${losingPatterns.join(', ') || 'not enough data'}
- Key insight: Scripts with ${winningPatterns[0] ?? 'higher eval scores'} consistently outperform. Lean into these patterns.`
}
