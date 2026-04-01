export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-muted-foreground mt-2">Last updated: March 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Introduction</h2>
          <p className="text-muted-foreground leading-relaxed">
            Orianna (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is an AI-powered content coaching platform for social media creators.
            This Privacy Policy explains how we collect, use, and protect your information when you use our service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Information We Collect</h2>
          <ul className="text-muted-foreground space-y-2 list-disc list-inside leading-relaxed">
            <li><strong>Account information:</strong> Email address, display name, content niche and goals you provide during onboarding</li>
            <li><strong>Social media tokens:</strong> OAuth access tokens for TikTok and Instagram used solely to publish content on your behalf</li>
            <li><strong>Content data:</strong> Scripts, video ideas, captions, and hashtags you create within the app</li>
            <li><strong>Video files:</strong> Videos you upload for scheduled posting, stored securely and deleted after publication</li>
            <li><strong>Usage data:</strong> Basic analytics about how you use the platform to improve the service</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. How We Use Your Information</h2>
          <ul className="text-muted-foreground space-y-2 list-disc list-inside leading-relaxed">
            <li>To provide AI coaching and script generation services</li>
            <li>To publish posts to your connected social media accounts at the times you schedule</li>
            <li>To personalize AI suggestions based on your niche and content goals</li>
            <li>To improve our platform and fix bugs</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Third-Party Services</h2>
          <p className="text-muted-foreground leading-relaxed">
            We integrate with the following platforms on your behalf using OAuth authorization:
          </p>
          <ul className="text-muted-foreground space-y-2 list-disc list-inside leading-relaxed">
            <li><strong>TikTok:</strong> To publish videos via the TikTok Content Posting API</li>
            <li><strong>Instagram (Meta):</strong> To publish Reels via the Instagram Graph API</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            We only request the minimum permissions required to publish content. We do not sell or share your social media credentials.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Chrome Extension</h2>
          <p className="text-muted-foreground leading-relaxed">
            The Orianna Chrome extension enhances the platform by letting you save content inspiration
            while browsing TikTok and Instagram. Here is what the extension accesses and how:
          </p>
          <ul className="text-muted-foreground space-y-2 list-disc list-inside leading-relaxed">
            <li><strong>Page content extraction:</strong> When you click &quot;Save&quot; on a TikTok or Instagram page, the extension reads publicly visible post metadata from the current page — including the caption, hashtags, view/like/comment counts, thumbnail URL, and creator handle. This data is only captured when you explicitly choose to save a post.</li>
            <li><strong>Authentication tokens:</strong> The extension stores your Orianna login session (access token, refresh token, and email) in local browser storage to keep you signed in. These are never shared with third parties.</li>
            <li><strong>Permissions used:</strong> The extension uses <em>activeTab</em> (to read the current page when you click Save), <em>storage</em> (to store your login session locally), <em>tabs</em> (to detect when you&apos;re on a supported site), and <em>scripting</em> (to extract post data from the page). It only runs on tiktok.com and instagram.com.</li>
            <li><strong>Data sent to our servers:</strong> When you save a post, the extracted metadata is sent to Orianna&apos;s servers and stored in your account as part of your swipe file. No data is collected passively or in the background — the extension only acts when you interact with it.</li>
            <li><strong>No browsing history or personal data:</strong> The extension does not track your browsing history, collect personal information beyond your Orianna login, or run any background data collection.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Data Security</h2>
          <p className="text-muted-foreground leading-relaxed">
            We use Supabase for secure data storage with row-level security policies ensuring you can only access your own data.
            OAuth tokens are stored encrypted and are used only to perform actions you explicitly authorize.
            You can disconnect any social account at any time from Settings, which immediately revokes our access.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Data Retention</h2>
          <p className="text-muted-foreground leading-relaxed">
            Video files uploaded for scheduling are retained in storage and can be deleted by you at any time.
            Your account data is retained as long as your account is active.
            You may request deletion of your account and all associated data by contacting us.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Your Rights</h2>
          <p className="text-muted-foreground leading-relaxed">
            You have the right to access, correct, or delete your personal data at any time.
            You can disconnect social accounts and revoke our access at any point through Settings.
            To request full account deletion, contact us directly.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you have questions about this Privacy Policy or how we handle your data, please contact us through the app or at the email address on file with your account.
          </p>
        </section>
      </div>
    </div>
  )
}
