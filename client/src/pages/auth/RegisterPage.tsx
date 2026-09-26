import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authApi } from '@/features/auth/api/auth.api'
import { toast } from '@/stores/toastStore'
import { Mail, Lock, User, ArrowRight, AtSign } from 'lucide-react'

const registerSchema = z
  .object({
    displayName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be at most 30 characters')
      .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Username must be lowercase letters, numbers, or hyphens')
      .transform((v) => v.toLowerCase().trim()),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must include at least one uppercase letter')
      .regex(/[a-z]/, 'Must include at least one lowercase letter')
      .regex(/[0-9]/, 'Must include at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must include at least one special character (e.g. !@#$)'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const [serverError, setServerError] = React.useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  // Auto-fill suggested username when typing displayName if username is untouched
  const currentUsername = watch('username')
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setValue('displayName', val, { shouldValidate: true })
    if (!currentUsername || currentUsername.length < 3) {
      const slug = val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      if (slug.length >= 3) {
        setValue('username', slug, { shouldValidate: true })
      }
    }
  }

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null)
    try {
      await authApi.register({
        displayName: values.displayName,
        username: values.username,
        email: values.email,
        password: values.password,
      })
      toast.success('Account created! A verification code has been sent to your email.')
      navigate(`/verify-email?email=${encodeURIComponent(values.email)}`)
    } catch (err: unknown) {
      const apiErr = err as { message?: string }
      setServerError(apiErr.message || 'Failed to create account. Please check your details.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-left">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Claim your OneWinq
        </h2>
        <p className="text-sm text-muted-foreground">
          Create your digital identity home and get a permanent verified profile link.
        </p>
      </div>

      {serverError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive font-medium animate-in fade-in space-y-2">
          <div>{serverError}</div>
          {serverError.toLowerCase().includes('already exists') && (
            <div className="pt-1 flex items-center gap-3 text-xs">
              <Link
                to={`/verify-email?email=${encodeURIComponent(watch('email'))}`}
                className="underline font-semibold hover:opacity-80 text-foreground"
              >
                Verify Existing Account →
              </Link>
              <span>•</span>
              <Link to="/login" className="underline font-semibold hover:opacity-80 text-foreground">
                Sign In →
              </Link>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">
            Full Name
          </label>
          <Input
            placeholder="e.g. Kundan Kumar"
            leftIcon={<User className="h-4 w-4" />}
            error={errors.displayName?.message}
            onChange={handleNameChange}
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground">
              Unique Handle / Username
            </label>
            <span className="text-[11px] text-muted-foreground font-mono">
              onewinq.me/{watch('username') || 'handle'}
            </span>
          </div>
          <Input
            {...register('username')}
            placeholder="e.g. kundankumar"
            leftIcon={<AtSign className="h-4 w-4" />}
            error={errors.username?.message}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">
            Email Address
          </label>
          <Input
            {...register('email')}
            type="email"
            placeholder="name@example.com"
            leftIcon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">
            Create Password
          </label>
          <Input
            {...register('password')}
            type="password"
            placeholder="Min. 8 chars with upper, lower, number & symbol"
            leftIcon={<Lock className="h-4 w-4" />}
            error={errors.password?.message}
          />
          <p className="text-[11px] text-muted-foreground pt-0.5">
            Requires at least 8 characters, uppercase, lowercase, number, and special character.
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">
            Confirm Password
          </label>
          <Input
            {...register('confirmPassword')}
            type="password"
            placeholder="Re-enter your password"
            leftIcon={<Lock className="h-4 w-4" />}
            error={errors.confirmPassword?.message}
          />
        </div>

        <Button
          type="submit"
          className="w-full mt-2"
          size="lg"
          isLoading={isSubmitting}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Create Identity
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border">
        Already have a OneWinq identity?{' '}
        <Link to="/login" className="text-primary font-semibold hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  )
}
