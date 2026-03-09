import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-500 to-purple-400 bg-clip-text text-transparent">Orianna</span>
            <span className="text-xs text-muted-foreground ml-2">AI Content Coach</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white border-0 shadow-lg shadow-purple-500/20">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-6 py-24 text-center space-y-6">
          <h1 className="text-5xl font-bold leading-tight">
            Your AI coach for<br /><span className="bg-gradient-to-r from-purple-500 to-purple-400 bg-clip-text text-transparent">short-form video</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Orianna helps TikTok, Instagram Reels, and YouTube Shorts creators plan content, generate scripts, and schedule posts — all in one place.
          </p>
          <div className="flex items-center justify-center gap-4 pt-2">
            <Link href="/signup">
              <Button size="lg" className="px-8 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white border-0 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-200 hover:-translate-y-0.5">Start for free</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="border-border text-muted-foreground hover:bg-purple-500/8 hover:text-foreground hover:border-purple-300">Log in</Button>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-center mb-12">Everything a creator needs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              title="AI Script Generator"
              description="Generate full video scripts with hook, body sections, and CTA. Pick multiple hook styles and get instant variants tailored to your niche."
            />
            <FeatureCard
              title="Content Planner"
              description="Save video ideas with hooks, captions, and inspiration. Track what's in progress, ready to film, or done — all in a visual board."
            />
            <FeatureCard
              title="Post Scheduler"
              description="Upload your videos and schedule them to post automatically to TikTok, Instagram Reels, and YouTube Shorts at the exact time you choose."
            />
            <FeatureCard
              title="AI Coach Chat"
              description="Chat with an AI coach that knows your niche, goals, past scripts, and content ideas. Get personalized advice, not generic tips."
            />
            <FeatureCard
              title="Swipe File"
              description="Save inspiring posts from any platform by URL. Build a personal library of content references to draw from when planning."
            />
            <FeatureCard
              title="Competitor Tracking"
              description="Track competitor accounts and import their top-performing posts to analyze hooks, formats, and engagement patterns."
            />
          </div>
        </section>

        {/* Platforms */}
        <section className="border-t border-border">
          <div className="max-w-5xl mx-auto px-6 py-16 text-center space-y-4">
            <h2 className="text-2xl font-bold">Publish directly to your platforms</h2>
            <p className="text-muted-foreground">
              Connect your TikTok, Instagram, and YouTube accounts and schedule posts without leaving the app.
            </p>
            <div className="flex items-center justify-center gap-8 pt-4 text-sm font-medium text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-foreground inline-block" />
                TikTok
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pink-500 inline-block" />
                Instagram Reels
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                YouTube Shorts
              </span>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border">
          <div className="max-w-5xl mx-auto px-6 py-24 text-center space-y-6">
            <h2 className="text-3xl font-bold">Ready to grow your channel?</h2>
            <p className="text-muted-foreground">Join creators using Orianna to stay consistent and grow faster.</p>
            <Link href="/signup">
              <Button size="lg" className="px-10 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white border-0 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-200 hover:-translate-y-0.5">Get started free</Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Orianna</span>
          <div className="flex gap-6">
            <Link href="/legal/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/legal/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6 rounded-xl border border-border bg-card space-y-2 transition-all duration-200 hover:border-purple-500/20 hover:shadow-lg hover:shadow-purple-500/5">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}
