// Welcome email sequence templates for Orianna
// These return HTML strings for use with Resend

const baseStyle = `
  body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: #e4e4e7; }
  .container { max-width: 560px; margin: 0 auto; padding: 40px 24px; }
  .logo { font-size: 24px; font-weight: 700; background: linear-gradient(135deg, #7c3aed, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  h1 { font-size: 28px; font-weight: 800; color: white; margin: 0 0 16px; line-height: 1.2; }
  p { font-size: 15px; line-height: 1.7; color: #a1a1aa; margin: 0 0 16px; }
  .btn { display: inline-block; background: linear-gradient(135deg, #7c3aed, #9333ea); color: white !important; font-weight: 600; font-size: 15px; padding: 14px 32px; border-radius: 10px; text-decoration: none; margin: 8px 0 24px; }
  .card { background: #12121a; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px; margin: 16px 0; }
  .card h3 { font-size: 16px; font-weight: 700; color: white; margin: 0 0 8px; }
  .card p { font-size: 14px; margin: 0; }
  .footer { border-top: 1px solid rgba(255,255,255,0.06); margin-top: 40px; padding-top: 24px; }
  .footer p { font-size: 12px; color: #52525b; }
`

function wrap(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${baseStyle}</style></head>
<body><div class="container">
  <div style="margin-bottom: 32px;"><span class="logo">Orianna</span></div>
  ${content}
  <div class="footer">
    <p>You're receiving this because you signed up for Orianna.</p>
  </div>
</div></body></html>`
}

export function welcomeEmail(name: string, appUrl: string): { subject: string; html: string } {
  return {
    subject: 'Welcome to Orianna — let\'s plan your first week of content',
    html: wrap(`
      <h1>Welcome to Orianna, ${name || 'creator'}!</h1>
      <p>You just joined the AI content coach that helps you plan, script, and publish short-form content without the burnout.</p>
      <p>Here's how to get the most out of Orianna in your first 10 minutes:</p>

      <div class="card">
        <h3>1. Complete your profile</h3>
        <p>Tell Orianna your niche, platforms, and goals. This is how the AI personalizes everything for you.</p>
      </div>

      <div class="card">
        <h3>2. Try the Script Generator</h3>
        <p>Enter any topic and get a ready-to-film script with hooks, body, CTAs, and hashtags. Pick your favorite variant.</p>
      </div>

      <div class="card">
        <h3>3. Install the Chrome Extension</h3>
        <p>Save trending videos while you scroll TikTok and Instagram. Build a personal inspiration library.</p>
      </div>

      <a href="${appUrl}/dashboard" class="btn">Open your dashboard</a>

      <p>If you have any questions, just reply to this email. I read everything.</p>
      <p style="color: #e4e4e7; font-weight: 600;">— Stefano, founder of Orianna</p>
    `),
  }
}

export function featureHighlightEmail(name: string, appUrl: string): { subject: string; html: string } {
  return {
    subject: 'Did you try the Script Generator yet?',
    html: wrap(`
      <h1>Your first script is one click away</h1>
      <p>Hey ${name || 'there'}, just checking in. The Script Generator is Orianna's most popular feature — and you haven't tried it yet.</p>

      <p>Here's what creators are doing with it:</p>

      <div class="card">
        <h3>Turn any idea into a filmable script</h3>
        <p>Just type a topic like "morning routine for busy moms" and Orianna gives you multiple hooks, a full script body, CTAs, and hashtags — all personalized to your niche.</p>
      </div>

      <div class="card">
        <h3>Multiple variants to choose from</h3>
        <p>Don't like the first hook? Orianna generates alternatives so you can pick the one that feels most natural to you.</p>
      </div>

      <a href="${appUrl}/dashboard/scripts" class="btn">Generate your first script</a>

      <p>Pro tip: Start with the "Surprise me" button if you're not sure what to film. Orianna will suggest something based on what's trending in your niche.</p>
    `),
  }
}

export function upgradeNudgeEmail(name: string, appUrl: string): { subject: string; html: string } {
  return {
    subject: 'You\'ve been creating great content — here\'s how to do more',
    html: wrap(`
      <h1>You're off to a great start, ${name || 'creator'}</h1>
      <p>It's been a week since you joined Orianna. Creators who stick with it see real results — more consistent posting, better hooks, and less time planning.</p>

      <p>Your free Starter plan includes:</p>
      <div class="card">
        <h3>Starter (Free)</h3>
        <p>3 coach messages and 1 script generation per month</p>
      </div>

      <p>If you're ready to level up, Plus unlocks more AI, video downloads, and more competitors — for just $5.99/mo:</p>
      <div class="card">
        <h3>Plus — $5.99/mo</h3>
        <p>25 coach messages, 10 scripts, 10 competitors tracked, and 30 video downloads per month. Or save with yearly billing at $4.17/mo.</p>
      </div>

      <a href="${appUrl}/dashboard/settings" class="btn">View plans & upgrade</a>

      <p>No pressure — the free plan isn't going anywhere. But if you're serious about growing your channel, Plus pays for itself in time saved.</p>
    `),
  }
}
