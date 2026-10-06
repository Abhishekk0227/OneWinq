import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/features/auth/api/auth.api'
import { profileApi } from '@/features/profile/api/profile.api'
import { settingsApi } from '@/features/settings/api/settings.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { toast } from '@/stores/toastStore'
import { disconnectSocket } from '@/lib/socket/socketClient'
import {
  Settings,
  Download,
  Trash2,
  CheckCircle2,
  Laptop,
  Mail,
  Eye,
  Shield,
  PauseCircle,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react'
import { useTheme } from '@/app/providers/ThemeProvider'

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const { user, setUser, logout } = useAuthStore()
  const { theme, setTheme } = useTheme()

  // Username change state
  const [newUsername, setNewUsername] = React.useState(user?.username || '')
  // Password change state
  const [currentPassword, setCurrentPassword] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmNewPassword, setConfirmNewPassword] = React.useState('')

  // Email Change state
  const [isEmailModalOpen, setIsEmailModalOpen] = React.useState(false)
  const [emailStep, setEmailStep] = React.useState<'REQUEST' | 'VERIFY'>('REQUEST')
  const [newEmail, setNewEmail] = React.useState('')
  const [emailOtp, setEmailOtp] = React.useState('')

  // Privacy state
  const [appearInDiscovery, setAppearInDiscovery] = React.useState(user?.appearInDiscovery ?? true)
  const [connectionVisibility, setConnectionVisibility] = React.useState(
    user?.connectionRequestVisibility || 'EVERYONE'
  )

  // Confirmation dialogs
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = React.useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false)

  // Fetch active sessions
  const { data: sessionsData } = useQuery({
    queryKey: queryKeys.auth.sessions,
    queryFn: () => authApi.getSessions(),
  })

  // Fetch subscription
  const { data: subData } = useQuery({
    queryKey: queryKeys.subscriptions.me,
    queryFn: () => settingsApi.getMySubscription(),
  })

  const sessions = sessionsData?.data?.sessions || []
  const subscription = subData?.data?.subscription

  // Change username mutation
  const changeUsernameMutation = useMutation({
    mutationFn: (username: string) => profileApi.changeUsername(username),
    onSuccess: (res) => {
      if (user) {
        setUser({ ...user, username: res.data.username })
      }
      toast.success(`Username updated to @${res.data.username}`)
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to update username')
    },
  })

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      toast.success('Password updated successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to update password')
    },
  })

  // Email change mutations
  const requestEmailChangeMutation = useMutation({
    mutationFn: () => settingsApi.requestEmailChange(newEmail.trim()),
    onSuccess: () => {
      toast.success(`Verification code sent to ${newEmail}`)
      setEmailStep('VERIFY')
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to send email verification code')
    },
  })

  const verifyEmailChangeMutation = useMutation({
    mutationFn: () => settingsApi.verifyEmailChange(newEmail.trim(), emailOtp.trim()),
    onSuccess: () => {
      toast.success('Login email address updated successfully.')
      if (user) {
        setUser({ ...user, email: newEmail.trim() })
      }
      setIsEmailModalOpen(false)
      setEmailStep('REQUEST')
      setNewEmail('')
      setEmailOtp('')
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Invalid verification code')
    },
  })

  // Privacy mutation
  const updatePrivacyMutation = useMutation({
    mutationFn: (payload: { appearInDiscovery?: boolean; connectionRequestVisibility?: 'EVERYONE' | 'NOBODY' }) =>
      settingsApi.updatePrivacySettings(payload),
    onSuccess: () => {
      toast.success('Privacy preferences updated.')
      if (user) {
        setUser({ ...user, appearInDiscovery, connectionRequestVisibility: connectionVisibility as any })
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to save privacy settings')
    },
  })

  // Revoke session mutation
  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => authApi.revokeSession(sessionId),
    onSuccess: () => {
      toast.success('Session revoked.')
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.sessions })
    },
  })

  // Data export mutation
  const exportMutation = useMutation({
    mutationFn: () => settingsApi.requestDataExport(),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Data export request submitted. You will be emailed a download link.')
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to request data export')
    },
  })

  // Deactivate account mutation
  const deactivateAccountMutation = useMutation({
    mutationFn: () => settingsApi.deactivateAccount(),
    onSuccess: () => {
      toast.warning('Account temporarily deactivated. Sign in again at any time to reactivate.')
      disconnectSocket()
      logout()
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to deactivate account')
    },
  })

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: () => settingsApi.deleteAccount({}),
    onSuccess: () => {
      toast.warning('Account scheduled for deletion. You will now be signed out.')
      disconnectSocket()
      logout()
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to schedule account deletion')
    },
  })

  const handleChangeUsername = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUsername.trim() || newUsername === user?.username) {return}
    changeUsernameMutation.mutate(newUsername.trim().toLowerCase())
  }

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword || !newPassword) {return}
    if (newPassword !== confirmNewPassword) {
      toast.error('New passwords do not match')
      return
    }
    changePasswordMutation.mutate()
  }

  const handleSavePrivacy = () => {
    updatePrivacyMutation.mutate({
      appearInDiscovery,
      connectionRequestVisibility: connectionVisibility as 'EVERYONE' | 'NOBODY',
    })
  }

  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage your account, handle, security, and privacy preferences.
          </p>
        </div>
      </div>

      <Tabs defaultValue="account" className="w-full space-y-6">
        <TabsList className="justify-start">
          <TabsTrigger value="account">Account & Handle</TabsTrigger>
          <TabsTrigger value="privacy">Privacy & Discovery</TabsTrigger>
          <TabsTrigger value="security">Security & Sessions</TabsTrigger>
          <TabsTrigger value="subscription">Subscription & Tier</TabsTrigger>
        </TabsList>

        {/* 1. Account & Handle */}
        <TabsContent value="account" className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-foreground pb-3 border-b border-border">
              Permanent Handle
            </h2>
            <form onSubmit={handleChangeUsername} className="space-y-4 max-w-md">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  OneWinq Username URL
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">onewinq.me/u/</span>
                  <Input
                    value={newUsername}
                    onChange={(e) =>
                      setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                    }
                    placeholder="username"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Only lowercase letters, numbers, and hyphens. Changing your handle updates your NFC and QR redirection.
                </p>
              </div>

              <Button
                type="submit"
                size="sm"
                isLoading={changeUsernameMutation.isPending}
                disabled={newUsername === user?.username || !newUsername}
              >
                Save New Handle
              </Button>
            </form>
          </div>

          <div className="rounded-3xl border border-border bg-card p-4 sm:p-8 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground">Account Details</h2>
                <p className="text-xs text-muted-foreground">Personal details associated with your OneWinq account</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEmailModalOpen(true)}
                leftIcon={<Mail className="h-3.5 w-3.5" />}
                className="w-full sm:w-auto"
              >
                Change Email Address
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-muted/30">
                <span className="text-muted-foreground">Full Display Name</span>
                <div className="text-sm font-bold text-foreground mt-0.5">{user?.displayName}</div>
              </div>
              <div className="p-4 rounded-2xl bg-muted/30">
                <span className="text-muted-foreground">Account Login Email</span>
                <div className="text-sm font-bold text-foreground mt-0.5">{user?.email}</div>
              </div>
            </div>
          </div>

          {/* Appearance & Theme Setting */}
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-4">
            <div className="pb-3 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Appearance & Interface Theme</h2>
              <p className="text-xs text-muted-foreground">Choose how OneWinq looks on this device</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border bg-card hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Sun className={`h-5 w-5 ${theme === 'light' ? 'text-primary' : 'text-amber-500'}`} />
                  {theme === 'light' && <span className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <div className="font-bold text-sm text-foreground">Light</div>
                <div className="text-xs text-muted-foreground mt-0.5">Clean, crisp white interface</div>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border bg-card hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Moon className={`h-5 w-5 ${theme === 'dark' ? 'text-primary' : 'text-primary'}`} />
                  {theme === 'dark' && <span className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <div className="font-bold text-sm text-foreground">Dark</div>
                <div className="text-xs text-muted-foreground mt-0.5">Luxurious midnight obsidian theme</div>
              </button>

              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  theme === 'system'
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border bg-card hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Monitor className={`h-5 w-5 ${theme === 'system' ? 'text-primary' : 'text-muted-foreground'}`} />
                  {theme === 'system' && <span className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <div className="font-bold text-sm text-foreground">System</div>
                <div className="text-xs text-muted-foreground mt-0.5">Sync with your device settings</div>
              </button>
            </div>
          </div>
        </TabsContent>

        {/* 2. Privacy & Discovery */}
        <TabsContent value="privacy" className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-4 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground">Discovery & Search Visibility</h2>
                <p className="text-xs text-muted-foreground">Control how peer professionals find and connect with you.</p>
              </div>
              <Button
                size="sm"
                isLoading={updatePrivacyMutation.isPending}
                onClick={handleSavePrivacy}
                className="w-full sm:w-auto"
              >
                Save Preferences
              </Button>
            </div>

            <div className="space-y-4">
              <label className="flex items-start gap-3 p-4 rounded-2xl bg-muted/30 border border-border/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={appearInDiscovery}
                  onChange={(e) => setAppearInDiscovery(e.target.checked)}
                  className="mt-0.5 rounded text-primary focus:ring-primary h-4 w-4"
                />
                <div>
                  <div className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    <span>Appear in Network Discovery & Search</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    When enabled, other verified professionals can search for your profile by name, skills, and profession. If disabled, your profile remains accessible only via direct link.
                  </p>
                </div>
              </label>

              <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 space-y-2">
                <div className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Who can send connection requests</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Select permission boundaries for unsolicited connection requests.
                </p>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="connectionVisibility"
                      value="EVERYONE"
                      checked={connectionVisibility === 'EVERYONE'}
                      onChange={() => setConnectionVisibility('EVERYONE')}
                      className="text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>Everyone on OneWinq</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="connectionVisibility"
                      value="NOBODY"
                      checked={connectionVisibility === 'NOBODY'}
                      onChange={() => setConnectionVisibility('NOBODY')}
                      className="text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>Nobody (Private Network)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-foreground pb-2 border-b border-border">
              Download Your Personal Data (GDPR / DPDP)
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You own your digital identity. Request a complete JSON archive of your profiles, credentials, connections, messages, and card telemetry.
            </p>
            <div>
              <Button
                variant="outline"
                size="sm"
                isLoading={exportMutation.isPending}
                onClick={() => exportMutation.mutate()}
                leftIcon={<Download className="h-3.5 w-3.5" />}
              >
                Request Complete Data Archive
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 sm:p-8 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-destructive pb-2 border-b border-destructive/20">
              Danger Zone
            </h2>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border">
              <div>
                <div className="text-sm font-bold text-foreground">Temporarily Deactivate Account</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Hides your public profiles, cards, and discovery presence without wiping your historical records.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeactivateModalOpen(true)}
                leftIcon={<PauseCircle className="h-4 w-4" />}
              >
                Deactivate Account
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-destructive/20">
              <div>
                <div className="text-sm font-bold text-destructive">Permanently Delete Account</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Initiates a 30-day cooling-off deletion period, after which all profile records and personal data are permanently expunged.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteModalOpen(true)}
                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              >
                Delete Account
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* 3. Security & Sessions */}
        <TabsContent value="security" className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-foreground pb-3 border-b border-border">
              Change Password
            </h2>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Current Password</label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Confirm New Password</label>
                <Input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>

              <Button
                type="submit"
                size="sm"
                isLoading={changePasswordMutation.isPending}
                disabled={!currentPassword || !newPassword}
              >
                Update Password
              </Button>
            </form>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground">Active Sessions</h2>
                <p className="text-xs text-muted-foreground">Devices currently authenticated to your account</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => authApi.revokeOtherSessions().then(() => queryClient.invalidateQueries({ queryKey: queryKeys.auth.sessions }))}
              >
                Log Out All Other Devices
              </Button>
            </div>

            <div className="space-y-3">
              {sessions.map((sess) => (
                <div
                  key={sess._id || sess.id}
                  className="flex items-center justify-between p-4 rounded-2xl border border-border bg-muted/20"
                >
                  <div className="flex items-center gap-3">
                    <Laptop className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-sm font-bold text-foreground">
                        {sess.userAgent ? sess.userAgent.split(' ')[0] : 'Web Browser'}
                        {sess.isCurrent && (
                          <Badge variant="subtle" className="ml-2 text-[10px]">
                            Current Device
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Last active: {new Date(sess.lastUsedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {!sess.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      isLoading={revokeSessionMutation.isPending}
                      onClick={() => revokeSessionMutation.mutate(sess._id || sess.id || '')}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* 4. Subscription & Tier */}
        <TabsContent value="subscription" className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                  Current Plan
                </div>
                <h2 className="text-2xl font-extrabold text-foreground mt-1">
                  {subscription?.tier || 'FREE'} Tier
                </h2>
              </div>
              <Badge variant="success" className="px-3 py-1 text-xs uppercase font-bold">
                {subscription?.status || 'ACTIVE'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-muted/30 space-y-2">
                <span className="text-xs font-semibold text-foreground">Included Features</span>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    <span>Multiple Professional Personas</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    <span>Private & Timed Mode Switching</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    <span>Real-World NFC Hardware Sync</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-primary-soft/40 border border-primary/20 space-y-3 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Need Enterprise Hardware?</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Deploy OneWinq physical cards for your entire team or organization with centralized access.
                  </p>
                </div>
                <Button variant="subtle" size="sm" className="w-full">
                  Contact Enterprise Sales
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Email Change Modal */}
      <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
        <div className="space-y-4">
          <DialogHeader>
            <DialogTitle>Update Login Email Address</DialogTitle>
            <DialogDescription>
              {emailStep === 'REQUEST'
                ? 'Enter your new email address. A 6-digit confirmation code will be sent.'
                : `Enter the 6-digit verification code sent to ${newEmail}.`}
            </DialogDescription>
          </DialogHeader>

          {emailStep === 'REQUEST' ? (
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">New Email Address</label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Verification OTP</label>
                <Input
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit code"
                  className="font-mono tracking-widest text-center text-lg"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsEmailModalOpen(false)}>
              Cancel
            </Button>
            {emailStep === 'REQUEST' ? (
              <Button
                size="sm"
                isLoading={requestEmailChangeMutation.isPending}
                disabled={!newEmail.trim() || newEmail === user?.email}
                onClick={() => requestEmailChangeMutation.mutate()}
              >
                Send Verification Code
              </Button>
            ) : (
              <Button
                size="sm"
                isLoading={verifyEmailChangeMutation.isPending}
                disabled={emailOtp.length !== 6}
                onClick={() => verifyEmailChangeMutation.mutate()}
              >
                Confirm Email Change
              </Button>
            )}
          </DialogFooter>
        </div>
      </Dialog>

      {/* Account Deactivation Confirmation */}
      <ConfirmDialog
        open={isDeactivateModalOpen}
        onOpenChange={setIsDeactivateModalOpen}
        title="Temporarily Deactivate Account"
        description="Your public profile, cards, and discovery listings will be hidden immediately. You can reactivate your account at any time simply by signing in."
        confirmText="Deactivate Account"
        variant="destructive"
        isLoading={deactivateAccountMutation.isPending}
        onConfirm={() => deactivateAccountMutation.mutate()}
      />

      {/* Account Deletion Confirmation */}
      <ConfirmDialog
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title="Schedule Account Deletion"
        description="Are you certain you wish to delete your OneWinq digital identity? This action cannot be undone after the 30-day grace period."
        confirmText="Schedule Deletion"
        variant="destructive"
        isLoading={deleteAccountMutation.isPending}
        onConfirm={() => deleteAccountMutation.mutate()}
      />
    </div>
  )
}
