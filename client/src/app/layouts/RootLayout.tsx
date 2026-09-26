import { Outlet } from 'react-router-dom'

export function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      <Outlet />
    </div>
  )
}
