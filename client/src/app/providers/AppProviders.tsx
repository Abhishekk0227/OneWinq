import * as React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query/queryClient'
import { AuthProvider } from './AuthProvider'
import { ThemeProvider } from './ThemeProvider'
import { ToastContainer } from '@/components/ui/ToastContainer'
import { InstallAppPrompt } from '@/components/pwa/InstallAppPrompt'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          {children}
          <ToastContainer />
          <InstallAppPrompt />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
