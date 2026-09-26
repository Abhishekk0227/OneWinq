import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/features/admin/api/admin.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { toast } from '@/stores/toastStore'
import { useAuthStore } from '@/stores/authStore'
import { Search, Shield, ShieldOff, UserCog, ChevronDown } from 'lucide-react'

const ROLE_OPTIONS = [
  { value: 'USER', label: 'User', color: 'text-white/70', bg: 'bg-white/10' },
  { value: 'SUPPORT', label: 'Support', color: 'text-sky-400', bg: 'bg-sky-500/20' },
  { value: 'ADMIN', label: 'Admin', color: 'text-violet-400', bg: 'bg-violet-500/20' },
  { value: 'SUPER_ADMIN', label: 'Super Admin', color: 'text-amber-400', bg: 'bg-amber-500/20' },
]

export default function AdminUsersPage() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuthStore()
  const canManageRoles = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN'
  const [searchTerm, setSearchTerm] = React.useState('')
  const [roleModal, setRoleModal] = React.useState<{ id: string; displayName: string; currentRole: string } | null>(null)
  const [selectedRole, setSelectedRole] = React.useState('USER')
  const [suspendModal, setSuspendModal] = React.useState<{ id: string; displayName: string; action: 'SUSPENDED' | 'ACTIVE' } | null>(null)
  const [suspendReason, setSuspendReason] = React.useState('')

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.admin.users({ search: searchTerm }),
    queryFn: () => adminApi.listUsers({ q: searchTerm || undefined, limit: 50 }),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason: string }) =>
      adminApi.updateUserStatus(id, status, reason),
    onSuccess: () => {
      toast.success('User status updated.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setSuspendModal(null)
      setSuspendReason('')
    },
    onError: () => {
      toast.error('Failed to update user status')
    },
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      adminApi.updateUserRole(id, role),
    onSuccess: () => {
      toast.success('User role updated.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setRoleModal(null)
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to update user role')
    },
  })

  const users = data?.data?.users || []

  const getRoleStyle = (role: string) => {
    const found = ROLE_OPTIONS.find((r) => r.value === role)
    return found ? { color: found.color, bg: found.bg } : { color: 'text-white/70', bg: 'bg-white/10' }
  }

  if (isLoading) {
    return <LoadingScreen message="Loading platform users..." />
  }

  return (
    <div className="space-y-6 text-left max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Platform Users</h1>
          <p className="text-xs text-white/60">Inspect accounts, modify moderation states, and manage roles.</p>
        </div>

        <div className="w-full sm:w-72">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search email or username..."
            leftIcon={<Search className="h-4 w-4" />}
            className="bg-[#14141c] border-white/10 text-white"
          />
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#14141c] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-white/60 uppercase text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Joined</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => {
                const uId = u._id || u.id
                const roleStyle = getRoleStyle(u.role || 'USER')
                return (
                  <tr key={uId} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white">{u.displayName}</div>
                      <div className="text-white/50 text-[11px]">@{u.username} • {u.email}</div>
                    </td>
                    <td className="p-4">
                      {canManageRoles ? (
                        <button
                          onClick={() => {
                            setRoleModal({ id: uId || '', displayName: u.displayName, currentRole: u.role || 'USER' })
                            setSelectedRole(u.role || 'USER')
                          }}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${roleStyle.bg} ${roleStyle.color} hover:opacity-80 transition-opacity cursor-pointer`}
                        >
                          {u.role || 'USER'}
                          <ChevronDown className="h-2.5 w-2.5" />
                        </button>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${roleStyle.bg} ${roleStyle.color}`}>
                          {u.role || 'USER'}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.accountState === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : u.accountState === 'SUSPENDED'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {u.accountState}
                      </span>
                    </td>
                    <td className="p-4 text-white/50">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {u.accountState === 'ACTIVE' ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-[11px] px-2.5"
                          leftIcon={<ShieldOff className="h-3 w-3" />}
                          onClick={() => {
                            setSuspendModal({ id: uId || '', displayName: u.displayName, action: 'SUSPENDED' })
                            setSuspendReason('')
                          }}
                        >
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-[11px] px-2.5"
                          leftIcon={<Shield className="h-3 w-3" />}
                          onClick={() =>
                            updateStatusMutation.mutate({ id: uId || '', status: 'ACTIVE', reason: 'Admin reactivation' })
                          }
                        >
                          Reactivate
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Assignment Modal */}
      <Dialog open={!!roleModal} onOpenChange={() => setRoleModal(null)}>
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            Assign Role
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Change the platform role for <strong className="text-white">{roleModal?.displayName}</strong>. This is a
            privileged action and is audit-logged.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-4">
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedRole(opt.value)}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedRole === opt.value
                  ? 'border-primary bg-primary/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <div className={`text-xs font-bold ${opt.color}`}>{opt.label}</div>
              <div className="text-[10px] text-white/40 mt-0.5">
                {opt.value === 'USER' && 'Standard platform user'}
                {opt.value === 'SUPPORT' && 'Access to support tickets'}
                {opt.value === 'ADMIN' && 'Full admin panel access'}
                {opt.value === 'SUPER_ADMIN' && 'Unrestricted platform control'}
              </div>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setRoleModal(null)} className="border-white/15 bg-white/5 text-white hover:bg-white/10">
            Cancel
          </Button>
          <Button
            isLoading={updateRoleMutation.isPending}
            disabled={selectedRole === roleModal?.currentRole}
            onClick={() => {
              if (roleModal) updateRoleMutation.mutate({ id: roleModal.id, role: selectedRole })
            }}
          >
            Assign {selectedRole.replace('_', ' ')}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Suspend Confirmation Modal */}
      <Dialog open={!!suspendModal} onOpenChange={() => setSuspendModal(null)}>
        <DialogHeader>
          <DialogTitle className="text-white">Suspend User</DialogTitle>
          <DialogDescription className="text-white/60">
            Suspending <strong className="text-white">{suspendModal?.displayName}</strong> will revoke all active sessions and block access.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-2">
          <label className="text-xs font-semibold text-white/80">Reason for suspension (required)</label>
          <input
            type="text"
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="e.g. Violation of community guidelines..."
            className="w-full bg-[#181822] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setSuspendModal(null)} className="border-white/15 bg-white/5 text-white hover:bg-white/10">
            Cancel
          </Button>
          <Button
            variant="destructive"
            isLoading={updateStatusMutation.isPending}
            disabled={suspendReason.trim().length < 3}
            onClick={() => {
              if (suspendModal)
                updateStatusMutation.mutate({ id: suspendModal.id, status: 'SUSPENDED', reason: suspendReason })
            }}
          >
            Confirm Suspend
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
