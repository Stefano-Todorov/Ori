import { Sidebar } from '@/components/layout/sidebar'
import { MobileSidebarProvider } from '@/components/layout/mobile-sidebar-context'
import { MobileHeader } from '@/components/layout/mobile-header'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileSidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <MobileHeader />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </MobileSidebarProvider>
  )
}
