import { useToastStore, type ToastType } from '@/stores/toastStore'
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const toastIcons: Record<ToastType, React.ReactNode> = {
  default: null,
  success: <CheckCircle2 className="h-5 w-5 text-success shrink-0" />,
  warning: <AlertTriangle className="h-5 w-5 text-warning shrink-0" />,
  error: <AlertCircle className="h-5 w-5 text-destructive shrink-0" />,
  info: <Info className="h-5 w-5 text-info shrink-0" />,
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) {return null}

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-xl text-card-foreground animate-in slide-in-from-bottom-5 duration-200',
            toast.type === 'error' && 'border-destructive/30',
            toast.type === 'success' && 'border-success/30'
          )}
        >
          {toastIcons[toast.type]}
          <div className="flex-1 text-sm">
            {toast.title && <div className="font-semibold text-foreground mb-0.5">{toast.title}</div>}
            <div className="text-muted-foreground">{toast.description}</div>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
