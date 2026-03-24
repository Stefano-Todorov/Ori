import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Orianna — AI Content Coach",
    template: "%s | Orianna",
  },
  description:
    "AI-powered content coach for TikTok, Instagram Reels & YouTube Shorts creators. Generate scripts, track competitors, and grow faster.",
  keywords: [
    "AI content coach",
    "TikTok scripts",
    "Instagram Reels",
    "YouTube Shorts",
    "content creator tools",
    "video script generator",
  ],
  icons: {
    icon: "/brand/emoticon.svg",
    apple: "/brand/avatar.svg",
  },
  openGraph: {
    title: "Orianna — AI Content Coach",
    description:
      "AI-powered content coach for short-form video creators. Generate scripts, track competitors, and grow faster.",
    images: ["/brand/image.svg"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Orianna — AI Content Coach",
    description:
      "AI-powered content coach for short-form video creators.",
    images: ["/brand/image.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
