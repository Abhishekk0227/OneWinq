import * as React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authApi } from '@/features/auth/api/auth.api'
import { toast } from '@/stores/toastStore'
import { KeyRound, Lock, ArrowRight } from 'lucide-react'

const resetSchema = z
  .object({
    email: z.string().email(),
    code: z.string().min(6, 'Reset code must be 6 digits').max(6, 'Reset code must be 6 digits'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must include at least one uppercase letter')
      .regex(/[0-9]/, 'Password must include at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ResetFormValues = z.infer<typeof resetSchema>

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const emailParam = searchParams.get('email') || ''

  const [serverError, setServerError] = React.useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: emailParam,
      code: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  React.useEffect(() => {
    if (emailParam) {
      setValue('email', emailParam)
    }
  }, [emailParam, setValue])

  const onSubmit = async (values: ResetFormValues) => {
    setServerError(null)
    try {
      await authApi.resetPassword({
        email: values.email,
        code: values.code,
        newPassword: values.newPassword,
      })
      toast.success('Password updated successfully! You can now sign in.')
      navigate('/login')
    } catch (err: unknown) {
      const apiErr = err as { message?: string }
      setServerError(apiErr.message || 'Failed to reset password. Please verify your code.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-left">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Create new password
        </h2>
        <p className="text-sm text-muted-foreground">
          Enter the recovery code sent to your email and set a new password.
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
            6-Digit Reset Code
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

        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">
            New Password
          </label>
          <Input
            {...register('newPassword')}
            type="password"
            placeholder="Min. 8 chars with uppercase & number"
            leftIcon={<Lock className="h-4 w-4" />}
            error={errors.newPassword?.message}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">
            Confirm Password
          </label>
          <Input
            {...register('confirmPassword')}
            type="password"
            placeholder="Confirm new password"
            leftIcon={<Lock className="h-4 w-4" />}
            error={errors.confirmPassword?.message}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isSubmitting}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Update Password & Sign In
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border">
        <Link to="/login" className="text-primary font-semibold hover:underline">
          Cancel and return to Sign In
        </Link>
      </div>
    </div>
  )
}
