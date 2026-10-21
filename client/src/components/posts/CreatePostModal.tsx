import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postsApi } from '@/features/posts/api/posts.api'
import { mediaApi } from '@/features/media/api/media.api'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { useOrganizationContextStore } from '@/stores/organizationContextStore'
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { toast } from '@/stores/toastStore'
import {
  Image as ImageIcon,
  Video,
  X,
  Globe,
  Users,
  User,
  Send,
  Loader2,
  Building2,
  ChevronDown,
  Check,
  Briefcase,
} from 'lucide-react'
import type { PostMedia } from '@/types/posts.types'

interface PostingProfile {
  type: 'PERSONAL' | 'ORGANIZATION'
  orgId?: string
  name: string
  handle: string
  avatarUrl?: string | null
}

export function CreatePostModal() {
  const navigate = useNavigate()
  const { activeModal, closeModal } = useUIStore()
  const { user } = useAuthStore()
  const { activeContext, memberships } = useOrganizationContextStore()
  const queryClient = useQueryClient()

  const isOpen = activeModal === 'CREATE_POST'

  const [content, setContent] = React.useState('')
  const [mediaList, setMediaList] = React.useState<PostMedia[]>([])
  const [isUploading, setIsUploading] = React.useState(false)
  const [visibility, setVisibility] = React.useState<'PUBLIC' | 'CONNECTIONS_ONLY'>('PUBLIC')
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = React.useState(false)

  // Build available posting profiles (Personal + any Organization user is member of)
  const availableProfiles = React.useMemo<PostingProfile[]>(() => {
    const list: PostingProfile[] = [
      {
        type: 'PERSONAL',
        name: user?.displayName || user?.username || 'Personal',
        handle: user?.username ? `@${user.username}` : '@you',
        avatarUrl: user?.avatarUrl,
      },
    ]

    // Add active organization if currently in org context
    if (activeContext.type === 'ORGANIZATION') {
      list.push({
        type: 'ORGANIZATION',
        orgId: activeContext.organizationId,
        name: activeContext.name,
        handle: `@${activeContext.slug}`,
        avatarUrl: activeContext.logoUrl,
      })
    }

    // Add other memberships if not already included
    for (const m of memberships) {
      const org = m.organization as any
      const orgId = org?.id || org?._id
      if (org && orgId && orgId !== (activeContext.type === 'ORGANIZATION' ? activeContext.organizationId : '')) {
        list.push({
          type: 'ORGANIZATION',
          orgId,
          name: org.name,
          handle: `@${org.slug}`,
          avatarUrl: org.logoUrl || org.branding?.logoUrl,
        })
      }
    }

    return list
  }, [user, activeContext, memberships])

  const [selectedProfile, setSelectedProfile] = React.useState<PostingProfile>(() => {
    if (activeContext.type === 'ORGANIZATION') {
      return {
        type: 'ORGANIZATION',
        orgId: activeContext.organizationId,
        name: activeContext.name,
        handle: `@${activeContext.slug}`,
        avatarUrl: activeContext.logoUrl,
      }
    }
    return {
      type: 'PERSONAL',
      name: user?.displayName || user?.username || 'Personal',
      handle: user?.username ? `@${user.username}` : '@you',
      avatarUrl: user?.avatarUrl,
    }
  })

  // Synchronize when modal opens or active context updates
  React.useEffect(() => {
    if (isOpen) {
      if (activeContext.type === 'ORGANIZATION') {
        setSelectedProfile({
          type: 'ORGANIZATION',
          orgId: activeContext.organizationId,
          name: activeContext.name,
          handle: `@${activeContext.slug}`,
          avatarUrl: activeContext.logoUrl,
        })
      } else {
        setSelectedProfile({
          type: 'PERSONAL',
          name: user?.displayName || user?.username || 'Personal',
          handle: user?.username ? `@${user.username}` : '@you',
          avatarUrl: user?.avatarUrl,
        })
      }
    }
  }, [isOpen, activeContext, user])

  const dropdownRef = React.useRef<HTMLDivElement | null>(null)
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProfileDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const imageInputRef = React.useRef<HTMLInputElement | null>(null)
  const videoInputRef = React.useRef<HTMLInputElement | null>(null)

  const createPostMutation = useMutation({
    mutationFn: (payload: {
      content: string
      media: PostMedia[]
      visibility: string
      organizationId?: string | null
      authorType?: 'USER' | 'ORGANIZATION'
    }) => postsApi.createPost(payload),
    onSuccess: () => {
      toast.success(
        selectedProfile.type === 'ORGANIZATION'
          ? `Post published on behalf of ${selectedProfile.name}!`
          : 'Your post is published and visible to the network!'
      )
      setContent('')
      setMediaList([])
      closeModal()
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['publicOrgPosts'] })
      queryClient.invalidateQueries({ queryKey: ['org'] })
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string; response?: { data?: { message?: string } } }
      toast.error(apiErr.response?.data?.message || apiErr.message || 'Failed to publish post')
    },
  })

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'IMAGE' | 'VIDEO') => {
    const files = e.target.files
    if (!files || files.length === 0) return

    try {
      setIsUploading(true)
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const uploaded = await mediaApi.uploadFile(file, 'POST_MEDIA' as any)
        setMediaList((prev) => [
          ...prev,
          {
            type,
            url: uploaded.publicUrl,
            mediaId: uploaded.mediaId,
          },
        ])
      }
      toast.success(`${type === 'IMAGE' ? 'Image' : 'Video'} attached`)
    } catch {
      toast.error(`Failed to upload ${type.toLowerCase()}. Please check file size and format.`)
    } finally {
      setIsUploading(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
      if (videoInputRef.current) videoInputRef.current.value = ''
    }
  }

  const handleRemoveMedia = (index: number) => {
    setMediaList((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() && mediaList.length === 0) {
      toast.error('Please write something or attach media to post.')
      return
    }

    if (selectedProfile.type === 'ORGANIZATION') {
      createPostMutation.mutate({
        content: content.trim(),
        media: mediaList,
        visibility: 'PUBLIC',
        organizationId: selectedProfile.orgId,
        authorType: 'ORGANIZATION',
      })
    } else {
      createPostMutation.mutate({
        content: content.trim(),
        media: mediaList,
        visibility,
        organizationId: null,
        authorType: 'USER',
      })
    }
  }

  const isPostingAsOrg = selectedProfile.type === 'ORGANIZATION'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <div className="relative min-w-0">
        <DialogHeader className="pb-3 border-b border-border pr-8">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-primary-soft flex items-center justify-center text-primary shrink-0">
              {isPostingAsOrg ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground truncate">
                {isPostingAsOrg ? `Create Company Update` : `Create New Post`}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground line-clamp-1 sm:line-clamp-none">
                {isPostingAsOrg
                  ? `Broadcasting update on behalf of ${selectedProfile.name} to followers and the network.`
                  : `Broadcast insights, milestones, or questions to your professional circle.`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Quick link to Post a Job when in Organization Mode */}
        {isPostingAsOrg && (
          <div className="mt-3 flex items-center justify-between p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Briefcase className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <span className="text-foreground font-medium truncate">
                Recruiting talent for {selectedProfile.name}?
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                closeModal()
                navigate('/app/org/jobs?action=create')
              }}
              className="text-purple-600 dark:text-purple-400 font-bold hover:underline shrink-0 ml-2 cursor-pointer flex items-center gap-1"
            >
              Post a Job Opening →
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-3 sm:pt-4">
          {/* Author snippet & Visibility picker */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Interactive Profile Selector */}
            <div className="relative min-w-0" ref={dropdownRef}>
              {availableProfiles.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-2xl border border-border/80 hover:border-primary/50 bg-card/60 hover:bg-card text-left transition-all shadow-2xs group cursor-pointer"
                >
                  {isPostingAsOrg ? (
                    <div className="h-8 w-8 rounded-xl border border-border bg-white dark:bg-card flex items-center justify-center overflow-hidden shrink-0">
                      {selectedProfile.avatarUrl ? (
                        <img src={selectedProfile.avatarUrl} alt={selectedProfile.name} className="h-full w-full object-contain" />
                      ) : (
                        <Building2 className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  ) : (
                    <Avatar
                      size="sm"
                      src={selectedProfile.avatarUrl}
                      fallback={selectedProfile.name}
                      alt={selectedProfile.name}
                      className="shrink-0"
                    />
                  )}
                  <div className="leading-tight min-w-0 pr-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-bold text-foreground truncate max-w-[140px] sm:max-w-[200px]">
                        {selectedProfile.name}
                      </span>
                      {isPostingAsOrg && (
                        <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-1 py-0.2 rounded font-semibold uppercase tracking-wider">
                          Company
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate max-w-[140px] sm:max-w-[200px] flex items-center gap-1">
                      <span>{selectedProfile.handle}</span>
                      <span className="text-primary font-medium group-hover:underline text-[10px]">• Switch</span>
                    </div>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors ml-0.5" />
                </button>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar
                    size="sm"
                    src={selectedProfile.avatarUrl}
                    fallback={selectedProfile.name}
                    alt={selectedProfile.name}
                    className="shrink-0"
                  />
                  <div className="leading-tight min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-foreground truncate max-w-[130px] sm:max-w-[200px]">
                      {selectedProfile.name}
                    </div>
                    <div className="text-[11px] sm:text-xs text-muted-foreground truncate max-w-[130px] sm:max-w-[200px]">
                      {selectedProfile.handle}
                    </div>
                  </div>
                </div>
              )}

              {/* Dropdown Menu for Profile Selection */}
              {isProfileDropdownOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-72 rounded-2xl border border-border bg-popover/95 backdrop-blur-md p-1.5 shadow-xl z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Post as profile:
                  </div>
                  <div className="space-y-1">
                    {availableProfiles.map((prof, idx) => {
                      const isSelected =
                        (prof.type === 'PERSONAL' && selectedProfile.type === 'PERSONAL') ||
                        (prof.type === 'ORGANIZATION' &&
                          selectedProfile.type === 'ORGANIZATION' &&
                          prof.orgId === selectedProfile.orgId)
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedProfile(prof)
                            setIsProfileDropdownOpen(false)
                          }}
                          className={`w-full flex items-center justify-between gap-2.5 p-2 rounded-xl text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'hover:bg-muted text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {prof.type === 'ORGANIZATION' ? (
                              <div className="h-7 w-7 rounded-lg border border-border bg-white dark:bg-card flex items-center justify-center overflow-hidden shrink-0">
                                {prof.avatarUrl ? (
                                  <img src={prof.avatarUrl} alt={prof.name} className="h-full w-full object-contain" />
                                ) : (
                                  <Building2 className="h-3.5 w-3.5 text-primary" />
                                )}
                              </div>
                            ) : (
                              <Avatar
                                size="sm"
                                src={prof.avatarUrl}
                                fallback={prof.name}
                                alt={prof.name}
                                className="h-7 w-7 shrink-0"
                              />
                            )}
                            <div className="min-w-0 leading-tight">
                              <div className="text-xs font-bold truncate">{prof.name}</div>
                              <div className="text-[10px] text-muted-foreground truncate">{prof.handle}</div>
                            </div>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Visibility Mode Selector */}
            {isPostingAsOrg ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-primary/10 border border-primary/20 text-xs font-semibold text-primary shrink-0">
                <Globe className="h-3 w-3" />
                <span>Public Broadcast</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 p-0.5 sm:p-1 rounded-xl bg-muted/60 border border-border text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setVisibility('PUBLIC')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-all text-xs ${
                    visibility === 'PUBLIC'
                      ? 'bg-card text-foreground shadow-sm font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Globe className="h-3 w-3" />
                  <span>Public</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('CONNECTIONS_ONLY')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-all text-xs ${
                    visibility === 'CONNECTIONS_ONLY'
                      ? 'bg-card text-foreground shadow-sm font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Users className="h-3 w-3" />
                  <span>Network</span>
                </button>
              </div>
            )}
          </div>

          {/* Text Area */}
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What would you like to share with the community today?"
              rows={4}
              maxLength={5000}
              className="w-full resize-none rounded-2xl border border-border bg-card p-3 sm:p-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all custom-scrollbar leading-relaxed"
            />
            <div className="text-[11px] text-muted-foreground/70 text-right pr-1">
              {content.length}/5000
            </div>
          </div>

          {/* Media Attachments Preview */}
          {mediaList.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1 custom-scrollbar">
              {mediaList.map((media, idx) => (
                <div
                  key={idx}
                  className="group relative rounded-xl overflow-hidden border border-border bg-muted aspect-video flex items-center justify-center"
                >
                  {media.type === 'IMAGE' ? (
                    <img
                      src={media.url}
                      alt="Uploaded media"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={media.url}
                      className="w-full h-full object-cover"
                      controls
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(idx)}
                    className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/75 text-white flex items-center justify-center opacity-90 hover:opacity-100 hover:bg-black transition-opacity"
                    title="Remove media"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Hidden File Inputs */}
          <input
            type="file"
            ref={imageInputRef}
            onChange={(e) => handleMediaUpload(e, 'IMAGE')}
            accept="image/*"
            multiple
            className="hidden"
          />
          <input
            type="file"
            ref={videoInputRef}
            onChange={(e) => handleMediaUpload(e, 'VIDEO')}
            accept="video/*"
            className="hidden"
          />

          {/* Action Toolbar */}
          <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isUploading}
                onClick={() => imageInputRef.current?.click()}
                className="text-xs text-muted-foreground hover:text-foreground h-8 sm:h-9 px-2 sm:px-2.5"
                leftIcon={<ImageIcon className="h-4 w-4 text-primary" />}
              >
                Photo
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isUploading}
                onClick={() => videoInputRef.current?.click()}
                className="text-xs text-muted-foreground hover:text-foreground h-8 sm:h-9 px-2 sm:px-2.5"
                leftIcon={<Video className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
              >
                Video
              </Button>
              {isUploading && (
                <div className="flex items-center gap-1.5 text-xs text-primary font-medium pl-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  <span>Uploading...</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={closeModal}
                className="flex-1 sm:flex-initial text-xs sm:text-sm h-8 sm:h-9 px-3"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={createPostMutation.isPending}
                disabled={isUploading || (!content.trim() && mediaList.length === 0)}
                className="flex-1 sm:flex-initial text-xs sm:text-sm h-8 sm:h-9 px-3.5 font-bold shadow-md shadow-primary/20 bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 whitespace-nowrap"
                leftIcon={<Send className="h-3.5 w-3.5" />}
              >
                Publish Post
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Dialog>
  )
}
