import * as React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { connectionsApi } from '@/features/connections/api/connections.api'
import { queryKeys } from '@/lib/query/queryKeys'
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { Avatar } from '@/components/ui/Avatar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Search, UserPlus, Users, MessageSquare, ArrowRight } from 'lucide-react'
import type { ConnectionUserSummary } from '@/types/networking.types'

interface NewChatModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectUser: (targetUserId: string) => void
  isStarting?: boolean
}

export function NewChatModal({
  open,
  onOpenChange,
  onSelectUser,
  isStarting,
}: NewChatModalProps) {
  const [searchTerm, setSearchTerm] = React.useState('')

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.connections.list(),
    queryFn: () => connectionsApi.getConnections({ limit: 100 }),
    enabled: open,
  })

  const connections = data?.data?.connections || []

  const filtered = React.useMemo(() => {
    if (!searchTerm.trim()) return connections
    const q = searchTerm.toLowerCase().trim()
    return connections.filter((item) => {
      const u = item.user as ConnectionUserSummary
      if (!u) return false
      const name = (u.displayName || '').toLowerCase()
      const uname = (u.username || '').toLowerCase()
      const headline = (u.headline || '').toLowerCase()
      const prof = (u.primaryProfession || '').toLowerCase()
      return name.includes(q) || uname.includes(q) || headline.includes(q) || prof.includes(q)
    })
  }, [connections, searchTerm])

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-md">
      <DialogHeader>
        <div className="flex items-center gap-2 text-primary mb-1">
          <UserPlus className="h-5 w-5" />
          <DialogTitle>Start Conversation</DialogTitle>
        </div>
        <DialogDescription>
          Select a verified connection to start messaging.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 pt-1">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search connections by name or role..."
            className="pl-9 text-xs"
            autoFocus
          />
        </div>

        {/* Connections List */}
        <div className="max-h-72 overflow-y-auto divide-y divide-border/60 custom-scrollbar pr-1">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Loading your connections...
            </div>
          ) : connections.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="h-10 w-10 mx-auto rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
                <Users className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">No connections yet</p>
                <p className="text-xs text-muted-foreground">
                  You can only direct message people you are connected with.
                </p>
              </div>
              <Link to="/app/network" onClick={() => onOpenChange(false)}>
                <Button size="sm" variant="subtle" className="mt-2" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                  Discover People
                </Button>
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No matching connection found for "{searchTerm}".
            </div>
          ) : (
            filtered.map((item) => {
              const u = item.user as ConnectionUserSummary
              if (!u) return null
              const userId = u._id || u.id || ''
              return (
                <button
                  key={item._id || item.id}
                  type="button"
                  disabled={isStarting}
                  onClick={() => onSelectUser(userId)}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={u.avatarUrl || undefined}
                      fallback={u.displayName || u.username || 'User'}
                      alt={u.displayName || u.username || 'User'}
                      size="sm"
                      className="rounded-xl shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                        {u.displayName || u.username}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {u.primaryProfession || u.headline || (u.username ? `@${u.username}` : '')}
                      </div>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <MessageSquare className="h-3.5 w-3.5" />
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </Dialog>
  )
}
