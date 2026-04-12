import { Telegraf, Markup } from 'telegraf'

// Lazy singleton — Telegraf in webhook mode (no .launch(), stateless for Vercel)
let bot: Telegraf | null = null

export function getTelegramBot(): Telegraf {
  if (!bot) {
    bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!)
  }
  return bot
}

export function getMarketingChatId(): string {
  return process.env.MARKETING_TELEGRAM_CHAT_ID!
}

// Format a marketing draft for Telegram display
export function formatDraftMessage(post: {
  platform: string
  content_type: string
  content: string
  subreddit?: string | null
  reddit_title?: string | null
}): string {
  const platformEmoji = post.platform === 'twitter' ? '🐦' : '🟠'
  const typeLabel = post.content_type.replace(/_/g, ' ')

  const header = post.platform === 'reddit'
    ? `${platformEmoji} Reddit Draft — r/${post.subreddit}\n📌 ${post.reddit_title}\nType: ${typeLabel}`
    : `${platformEmoji} Twitter Draft — ${typeLabel}`

  return `${header}\n\n─────────────────\n${post.content}\n─────────────────`
}

// Inline keyboard for draft approval
export function draftKeyboard(postId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Approve & Post', `approve:${postId}`),
      Markup.button.callback('✏️ Edit', `edit:${postId}`),
    ],
    [
      Markup.button.callback('⏭ Skip', `skip:${postId}`),
    ],
  ])
}

// Send a draft to Telegram and return the message ID
export async function sendDraft(post: {
  id: string
  platform: string
  content_type: string
  content: string
  subreddit?: string | null
  reddit_title?: string | null
}): Promise<number> {
  const tg = getTelegramBot()
  const chatId = getMarketingChatId()
  const text = formatDraftMessage(post)
  const keyboard = draftKeyboard(post.id)

  const sent = await tg.telegram.sendMessage(chatId, text, keyboard)
  return sent.message_id
}
