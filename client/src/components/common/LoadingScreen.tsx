import { Loader2 } from 'lucide-react'

export function LoadingScreen({ message = 'Loading OneWinq...' }: { message?: string }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
      <div className="relative mb-4 flex items-center justify-center">
        <div className="h-16 w-16 rounded-2xl bg-primary-soft flex items-center justify-center text-primary shadow-soft">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
    </div>
  )
}
