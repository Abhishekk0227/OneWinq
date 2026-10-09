import * as React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authApi } from '@/features/auth/api/auth.api'
import { useAuthStore } from '@/stores/authStore'
import { connectSocket } from '@/lib/socket/socketClient'
import { toast } from '@/stores/toastStore'
import { Mail, Lock, ArrowRight } from 'lucide-react'

const loginSchema = z.object({
  login: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setAuth } = useAuthStore()
  const [serverError, setServerError] = React.useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      login: '',
      password: '',
    },
  })

  const redirectParam = new URLSearchParams(location.search).get('redirect')
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || redirectParam || '/app'

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null)
    try {
      const res = await authApi.login(values)
      const { user, accessToken } = res.data

      setAuth(user, accessToken)
      connectSocket(accessToken)
      toast.success(`Welcome back, ${user.displayName}!`)
      navigate(from === '/' ? '/app' : from, { replace: true })
    } catch (err: unknown) {
      const apiErr = err as { message?: string; code?: string }
      if (apiErr.code === 'ACCOUNT_PENDING_VERIFICATION') {
        toast.warning('Please verify your email to continue.')
        navigate(`/verify-email?email=${encodeURIComponent(values.login)}`)
        return
      }
      setServerError(apiErr.message || 'Invalid credentials. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-left">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Welcome back
        </h2>
        <p className="text-sm text-muted-foreground">
          Sign in to manage your digital identities, modes, and network.
        </p>
      </div>

      {serverError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive font-medium animate-in fade-in">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">
            Email or Username
          </label>
          <Input
            {...register('login')}
            placeholder="you@domain.com or username"
            leftIcon={<Mail className="h-4 w-4" />}
            error={errors.login?.message}
            autoComplete="username"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs text-primary font-medium hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            {...register('password')}
            type="password"
            placeholder="••••••••"
            leftIcon={<Lock className="h-4 w-4" />}
            error={errors.password?.message}
            autoComplete="current-password"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isSubmitting}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Sign In
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border">
        Don't have a OneWinq identity yet?{' '}
        <Link to="/signup" className="text-primary font-semibold hover:underline">
          Create Account
        </Link>
      </div>
    </div>
  )
}
