export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-500 to-purple-400 bg-clip-text text-transparent">Orianna</h1>
          <p className="text-muted-foreground mt-2">Your AI content coach</p>
        </div>
        {children}
      </div>
    </div>
  )
}
