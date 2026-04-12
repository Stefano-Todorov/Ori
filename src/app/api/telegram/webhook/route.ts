import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getTelegramBot, getMarketingChatId, formatDraftMessage, draftKeyboard } from '@/lib/telegram'
import { postTweet, postThread } from '@/lib/twitter'

export const maxDuration = 30

// Telegram webhook — handles Approve/Edit/Skip button presses
export async function POST(req: NextRequest) {
  // Verify webhook secret
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const bot = getTelegramBot()
  const supabase = createServiceClient()
  const chatId = getMarketingChatId()

  // Handle callback queries (inline button presses)
  if (body.callback_query) {
    const { id: callbackId, data, message } = body.callback_query

    // Verify it's from the marketing chat
    if (String(message.chat.id) !== chatId) {
      await bot.telegram.answerCbQuery(callbackId, 'Unauthorized')
      return NextResponse.json({ ok: true })
    }

    const [action, postId] = (data as string).split(':')

    if (action === 'approve') {
      await handleApprove(postId, callbackId, message.message_id, chatId, bot, supabase)
    } else if (action === 'edit') {
      await handleEdit(postId, callbackId, message.message_id, chatId, bot)
    } else if (action === 'skip') {
      await handleSkip(postId, callbackId, message.message_id, chatId, bot, supabase)
    }

    return NextResponse.json({ ok: true })
  }

  // Handle text replies (edited content after user taps "Edit")
  if (body.message?.text && body.message?.reply_to_message) {
    if (String(body.message.chat.id) === chatId) {
      await handleEditReply(body.message, chatId, bot, supabase)
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true })
}

async function handleApprove(
  postId: string,
  callbackId: string,
  messageId: number,
  chatId: string,
  bot: ReturnType<typeof getTelegramBot>,
  supabase: ReturnType<typeof createServiceClient>
) {
  const { data: post } = await supabase
    .from('marketing_posts')
    .select('*')
    .eq('id', postId)
    .single()

  if (!post || post.status !== 'draft') {
    await bot.telegram.answerCbQuery(callbackId, 'Post not found or already processed')
    return
  }

  if (post.platform === 'twitter') {
    try {
      const result = post.thread_parts
        ? await postThread(post.thread_parts)
        : await postTweet(post.content)

      await supabase
        .from('marketing_posts')
        .update({
          status: 'posted',
          platform_post_id: result.id,
          platform_post_url: result.url,
          posted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)

      await bot.telegram.editMessageText(
        chatId,
        messageId,
        undefined,
        `✅ Posted to Twitter!\n\n${post.content}\n\n🔗 ${result.url}`
      )
      await bot.telegram.answerCbQuery(callbackId, 'Posted to Twitter!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await supabase
        .from('marketing_posts')
        .update({
          status: 'failed',
          error_message: msg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)

      await bot.telegram.editMessageText(
        chatId,
        messageId,
        undefined,
        `❌ Failed to post to Twitter: ${msg.slice(0, 200)}\n\nOriginal:\n${post.content}`
      )
      await bot.telegram.answerCbQuery(callbackId, `Failed: ${msg.slice(0, 60)}`)
    }
  } else if (post.platform === 'reddit') {
    // Reddit: no API posting — send copy-paste formatted text
    await supabase
      .from('marketing_posts')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)

    await bot.telegram.editMessageText(
      chatId,
      messageId,
      undefined,
      `📋 Reddit post approved — copy and post manually:\n\n` +
        `Subreddit: r/${post.subreddit}\n` +
        `Title: ${post.reddit_title}\n\n` +
        `─────────────────\n${post.content}\n─────────────────`
    )
    await bot.telegram.answerCbQuery(callbackId, 'Approved! Copy and post to Reddit.')
  }
}

async function handleEdit(
  postId: string,
  callbackId: string,
  messageId: number,
  chatId: string,
  bot: ReturnType<typeof getTelegramBot>
) {
  await bot.telegram.sendMessage(
    chatId,
    `✏️ Reply to this message with your edited text for this post.\n\nPost ID: ${postId}`,
    { reply_parameters: { message_id: messageId } }
  )
  await bot.telegram.answerCbQuery(callbackId, 'Reply with your edited text')
}

async function handleSkip(
  postId: string,
  callbackId: string,
  messageId: number,
  chatId: string,
  bot: ReturnType<typeof getTelegramBot>,
  supabase: ReturnType<typeof createServiceClient>
) {
  await supabase
    .from('marketing_posts')
    .update({ status: 'skipped', updated_at: new Date().toISOString() })
    .eq('id', postId)

  await bot.telegram.editMessageText(chatId, messageId, undefined, '⏭ Skipped')
  await bot.telegram.answerCbQuery(callbackId, 'Skipped')
}

async function handleEditReply(
  message: { text: string; reply_to_message: { text?: string; message_id: number } },
  chatId: string,
  bot: ReturnType<typeof getTelegramBot>,
  supabase: ReturnType<typeof createServiceClient>
) {
  const editedText = message.text
  const replyText = message.reply_to_message?.text || ''

  // Extract post ID from the edit prompt message
  const idMatch = replyText.match(/Post ID: ([a-f0-9-]+)/)
  if (!idMatch) {
    await bot.telegram.sendMessage(chatId, "Couldn't find the draft to edit. Try tapping Edit again.")
    return
  }

  const postId = idMatch[1]

  const { data: post } = await supabase
    .from('marketing_posts')
    .select('*')
    .eq('id', postId)
    .eq('status', 'draft')
    .single()

  if (!post) {
    await bot.telegram.sendMessage(chatId, "Couldn't find that draft (it may have been approved or skipped already).")
    return
  }

  // Update content in DB
  await supabase
    .from('marketing_posts')
    .update({ content: editedText, updated_at: new Date().toISOString() })
    .eq('id', postId)

  // Re-send with approval buttons
  const updated = { ...post, content: editedText }
  const text = formatDraftMessage(updated)
  const keyboard = draftKeyboard(postId)

  const sent = await bot.telegram.sendMessage(chatId, `✏️ Updated:\n\n${text}`, keyboard)

  // Update telegram_message_id to the new message
  await supabase
    .from('marketing_posts')
    .update({ telegram_message_id: sent.message_id })
    .eq('id', postId)
}
