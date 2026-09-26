import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authApi } from '@/features/auth/api/auth.api'
import { toast } from '@/stores/toastStore'
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react'

const forgotSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type ForgotFormValues = z.infer<typeof forgotSchema>

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [serverError, setServerError] = React.useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (values: ForgotFormValues) => {
    setServerError(null)
    try {
      await authApi.forgotPassword(values)
      toast.success('Reset code sent to your email.')
      navigate(`/reset-password?email=${encodeURIComponent(values.email)}`)
    } catch (err: unknown) {
      const apiErr = err as { message?: string }
      setServerError(apiErr.message || 'Failed to process password reset request.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-left">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Reset password
        </h2>
        <p className="text-sm text-muted-foreground">
          Enter your registered email address to receive a secure recovery code.
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
            Account Email
          </label>
          <Input
            {...register('email')}
            type="email"
            placeholder="name@example.com"
            leftIcon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isSubmitting}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Send Reset Code
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-primary font-semibold hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Sign In</span>
        </Link>
      </div>
    </div>
  )
}
