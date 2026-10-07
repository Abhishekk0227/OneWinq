import * as React from 'react'
import { ExternalLink, Play, Video, Film } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

export interface MediaVideoItem {
  id?: string
  title: string
  subtitle?: string
  description?: string
  url?: string
  month?: number | null
  year?: number | null
  date?: string | null
  metrics?: string
  metadata?: {
    platform?: string
    thumbnailUrl?: string
    followerCount?: string
  }
}

export function parseVideoUrl(url?: string): {
  type: 'instagram' | 'youtube' | 'vimeo' | 'direct' | 'other'
  id?: string
  embedUrl?: string
  directUrl?: string
} | null {
  if (!url) return null
  const trimmed = url.trim()

  // Instagram Reels or Posts
  const igMatch = trimmed.match(/instagram\.com\/(?:reel|p|tv)\/([A-Za-z0-9_-]+)/i)
  if (igMatch) {
    return {
      type: 'instagram',
      id: igMatch[1],
      embedUrl: `https://www.instagram.com/reel/${igMatch[1]}/embed/`,
    }
  }

  // YouTube Videos, Shorts, Embeds
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i,
  )
  if (ytMatch) {
    return {
      type: 'youtube',
      id: ytMatch[1],
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`,
    }
  }

  // Vimeo
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?([0-9]+)/i)
  if (vimeoMatch) {
    return {
      type: 'vimeo',
      id: vimeoMatch[1],
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    }
  }

  // Direct Video files (.mp4, .webm, .mov, etc.)
  if (trimmed.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)) {
    return {
      type: 'direct',
      directUrl: trimmed,
    }
  }

  return { type: 'other' }
}

interface MediaVideoPostCardProps {
  media: MediaVideoItem
  onLinkClick?: (url: string, title: string) => void
}

export function MediaVideoPostCard({ media, onLinkClick }: MediaVideoPostCardProps) {
  const videoInfo = React.useMemo(() => parseVideoUrl(media.url), [media.url])
  const platform =
    media.metadata?.platform ||
    (videoInfo?.type === 'instagram'
      ? 'Instagram'
      : videoInfo?.type === 'youtube'
        ? 'YouTube'
        : videoInfo?.type === 'vimeo'
          ? 'Vimeo'
          : videoInfo?.type === 'direct'
            ? 'Video'
            : 'Media')

  const metric = media.metrics || media.metadata?.followerCount
  const href = media.url ? (media.url.startsWith('http') ? media.url : `https://${media.url}`) : ''

  const handleActionClick = () => {
    if (href && onLinkClick) {
      onLinkClick(href, media.title)
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-3 min-w-0 max-w-full overflow-hidden transition-all duration-200 hover:border-primary/30 hover:shadow-md">
      {/* Post Header */}
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {platform}
            </span>
            {metric && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {metric}
              </span>
            )}
          </div>
          <h3 className="font-bold text-sm sm:text-base text-foreground break-words [overflow-wrap:anywhere] pt-1 leading-snug">
            {media.title}
          </h3>
          {media.subtitle && (
            <p className="text-[11px] text-muted-foreground break-words [overflow-wrap:anywhere]">
              {media.subtitle}
            </p>
          )}
        </div>

        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleActionClick}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      {/* Video Preview Player */}
      <div className="pt-0.5 min-w-0">
        {videoInfo?.type === 'instagram' && videoInfo.embedUrl ? (
          <div className="w-full rounded-xl overflow-hidden border border-border bg-black/5 dark:bg-black/40 flex justify-center">
            <div
              className="w-full max-w-[420px] relative overflow-hidden rounded-xl"
              style={{
                height: 0,
                paddingBottom: 'calc(56.25% + 58px)',
              }}
            >
              <iframe
                src={videoInfo.embedUrl}
                className="absolute inset-x-0 top-0 w-full h-[480px] border-0 rounded-xl"
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                allowFullScreen
                scrolling="no"
                loading="lazy"
                title={media.title}
              />
            </div>
          </div>
        ) : videoInfo?.type === 'youtube' && videoInfo.embedUrl ? (
          <div className="w-full aspect-video rounded-xl overflow-hidden border border-border bg-black shadow-inner">
            <iframe
              src={videoInfo.embedUrl}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              title={media.title}
            />
          </div>
        ) : videoInfo?.type === 'vimeo' && videoInfo.embedUrl ? (
          <div className="w-full aspect-video rounded-xl overflow-hidden border border-border bg-black shadow-inner">
            <iframe
              src={videoInfo.embedUrl}
              className="w-full h-full border-0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              loading="lazy"
              title={media.title}
            />
          </div>
        ) : videoInfo?.type === 'direct' && videoInfo.directUrl ? (
          <div className="w-full rounded-xl overflow-hidden border border-border bg-black flex justify-center">
            <video
              src={videoInfo.directUrl}
              controls
              preload="metadata"
              className="w-full max-h-[420px] object-contain"
            />
          </div>
        ) : media.metadata?.thumbnailUrl ? (
          <a
            href={href || '#'}
            target={href ? '_blank' : '_self'}
            rel="noopener noreferrer"
            onClick={handleActionClick}
            className="group relative block w-full aspect-video rounded-xl overflow-hidden border border-border bg-muted/30"
          >
            <img
              src={media.metadata.thumbnailUrl}
              alt={media.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/35 flex items-center justify-center transition-colors group-hover:bg-black/50">
              <div className="w-12 h-12 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                <Play className="h-5 w-5 fill-current ml-0.5" />
              </div>
            </div>
          </a>
        ) : href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleActionClick}
            className="group block p-6 rounded-xl border border-dashed border-border/80 bg-muted/15 hover:bg-muted/30 hover:border-primary/40 transition-colors text-center space-y-2"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center transition-transform group-hover:scale-110">
              <Film className="h-5 w-5" />
            </div>
            <div className="text-xs font-semibold text-foreground">Click to watch video</div>
            <div className="text-[11px] text-muted-foreground truncate max-w-sm mx-auto">{href}</div>
          </a>
        ) : null}
      </div>

      {/* Caption / Description */}
      {media.description && (
        <p className="text-xs text-foreground/85 leading-relaxed whitespace-pre-line break-words [overflow-wrap:anywhere] pt-1">
          {media.description}
        </p>
      )}

      {/* Post Footer Link */}
      {href && (
        <div className="pt-2 border-t border-border/50 flex items-center justify-between">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleActionClick}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <span>Watch on {platform}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </article>
  )
}
