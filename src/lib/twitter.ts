import { TwitterApi } from 'twitter-api-v2'

// Lazy singleton
let client: TwitterApi | null = null

function getTwitterClient(): TwitterApi {
  if (!client) {
    client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
    })
  }
  return client
}

export async function postTweet(text: string): Promise<{ id: string; url: string }> {
  const twitter = getTwitterClient()
  const result = await twitter.v2.tweet(text)
  return {
    id: result.data.id,
    url: `https://x.com/i/status/${result.data.id}`,
  }
}

// Post a thread: first tweet, then reply chain
export async function postThread(parts: string[]): Promise<{ id: string; url: string }> {
  const twitter = getTwitterClient()
  let lastId: string | undefined
  let firstId: string | undefined

  for (const part of parts) {
    const opts = lastId ? { reply: { in_reply_to_tweet_id: lastId } } : undefined
    const result = await twitter.v2.tweet(part, opts)
    if (!firstId) firstId = result.data.id
    lastId = result.data.id
  }

  return {
    id: firstId!,
    url: `https://x.com/i/status/${firstId}`,
  }
}
