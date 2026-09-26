import * as React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authApi } from '@/features/auth/api/auth.api'
import { toast } from '@/stores/toastStore'
import { KeyRound, Mail, ArrowRight, RotateCw } from 'lucide-react'

const verifySchema = z.object({
  email: z.string().email('Please enter a valid email'),
  code: z.string().min(6, 'Verification code must be 6 digits').max(6, 'Verification code must be 6 digits'),
})

type VerifyFormValues = z.infer<typeof verifySchema>

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const emailParam = searchParams.get('email') || ''

  const [serverError, setServerError] = React.useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = React.useState(0)
  const [isResending, setIsResending] = React.useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VerifyFormValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      email: emailParam,
      code: '',
    },
  })

  React.useEffect(() => {
    if (emailParam) {
      setValue('email', emailParam)
    }
  }, [emailParam, setValue])

  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const currentEmail = watch('email')

  const handleResend = async () => {
    if (!currentEmail || resendCooldown > 0) {return}
    setIsResending(true)
    try {
      await authApi.resendVerification(currentEmail)
      toast.success('A new verification code has been sent to your email.')
      setResendCooldown(60)
    } catch (err: unknown) {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to resend code')
    } finally {
      setIsResending(false)
    }
  }

  const onSubmit = async (values: VerifyFormValues) => {
    setServerError(null)
    try {
      await authApi.verifyEmail(values)
      toast.success('Email verified successfully! You can now sign in.')
      navigate('/login')
    } catch (err: unknown) {
      const apiErr = err as { message?: string }
      setServerError(apiErr.message || 'Invalid or expired code. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-left">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Verify your email
        </h2>
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit verification code to{' '}
          <strong className="text-foreground">{currentEmail || 'your email'}</strong>.
        </p>
      </div>

      {serverError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive font-medium animate-in fade-in">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {!emailParam && (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Email Address
            </label>
            <Input
              {...register('email')}
              placeholder="name@example.com"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
            />
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">
            6-Digit Verification Code
          </label>
          <Input
            {...register('code')}
            placeholder="123456"
            className="tracking-widest text-center text-lg font-mono"
            maxLength={6}
            leftIcon={<KeyRound className="h-4 w-4" />}
            error={errors.code?.message}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isSubmitting}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Verify & Continue
        </Button>
      </form>

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border">
        <span>Didn't receive the code?</span>
        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0 || isResending}
          className="inline-flex items-center gap-1 text-primary font-semibold hover:underline disabled:opacity-50"
        >
          <RotateCw className={`h-3 w-3 ${isResending ? 'animate-spin' : ''}`} />
          <span>
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
          </span>
        </button>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        <Link to="/login" className="hover:underline">
          Return to Login
        </Link>
      </div>
    </div>
  )
}
