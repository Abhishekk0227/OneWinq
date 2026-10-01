import { Outlet } from 'react-router-dom'
import { ScrollToTop } from '@/components/common/ScrollToTop'

export function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      <ScrollToTop />
      <Outlet />
    </div>
  )
}
