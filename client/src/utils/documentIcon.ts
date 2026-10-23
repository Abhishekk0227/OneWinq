import {
  FileUser,
  FolderKanban,
  GraduationCap,
  BookOpen,
  IdCard,
  CreditCard,
  Car,
  Plane,
  Vote,
  FileText,
  type LucideIcon,
} from 'lucide-react'

export interface DocumentTypeMeta {
  icon: LucideIcon
  tag: string
  label: string
  colorClass: string
}

export function getDocumentTypeMeta(typeOrSubtitle?: string, mimeType?: string, url?: string): DocumentTypeMeta {
  const norm = (typeOrSubtitle || '').toLowerCase().trim()

  if (norm.includes('resume') || norm.includes('cv') || norm.includes('curriculum')) {
    return {
      icon: FileUser,
      tag: 'RESUME',
      label: 'Resume / CV',
      colorClass: 'from-blue-500/15 via-blue-500/10 to-muted text-blue-600 dark:text-blue-400 border-blue-500/30',
    }
  }

  if (norm.includes('portfolio')) {
    return {
      icon: FolderKanban,
      tag: 'PORT',
      label: 'Portfolio Document',
      colorClass: 'from-purple-500/15 via-purple-500/10 to-muted text-purple-600 dark:text-purple-400 border-purple-500/30',
    }
  }

  if (norm.includes('degree') || norm.includes('diploma') || norm.includes('certificate')) {
    return {
      icon: GraduationCap,
      tag: 'DEGREE',
      label: 'Degree Certificate',
      colorClass: 'from-amber-500/15 via-amber-500/10 to-muted text-amber-600 dark:text-amber-400 border-amber-500/30',
    }
  }

  if (norm.includes('marksheet') || norm.includes('transcript') || norm.includes('academic')) {
    return {
      icon: BookOpen,
      tag: 'GRADE',
      label: 'Marksheet / Transcript',
      colorClass: 'from-emerald-500/15 via-emerald-500/10 to-muted text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    }
  }

  if (norm.includes('aadhaar') || norm.includes('aadhar')) {
    return {
      icon: IdCard,
      tag: 'UIDAI',
      label: 'Aadhaar Card',
      colorClass: 'from-orange-500/15 via-orange-500/10 to-muted text-orange-600 dark:text-orange-400 border-orange-500/30',
    }
  }

  if (norm.includes('pan')) {
    return {
      icon: CreditCard,
      tag: 'PAN',
      label: 'PAN Card',
      colorClass: 'from-cyan-500/15 via-cyan-500/10 to-muted text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
    }
  }

  if (norm.includes('driving') || norm.includes('license') || norm.includes('licence')) {
    return {
      icon: Car,
      tag: 'DL',
      label: 'Driving License',
      colorClass: 'from-indigo-500/15 via-indigo-500/10 to-muted text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
    }
  }

  if (norm.includes('passport')) {
    return {
      icon: Plane,
      tag: 'PASS',
      label: 'Passport',
      colorClass: 'from-teal-500/15 via-teal-500/10 to-muted text-teal-600 dark:text-teal-400 border-teal-500/30',
    }
  }

  if (norm.includes('voter') || norm.includes('election')) {
    return {
      icon: Vote,
      tag: 'VOTER',
      label: 'Voter ID Card',
      colorClass: 'from-rose-500/15 via-rose-500/10 to-muted text-rose-600 dark:text-rose-400 border-rose-500/30',
    }
  }

  // Fallback by file extension or mime type
  const isPdf = mimeType?.includes('pdf') || url?.toLowerCase().endsWith('.pdf')
  const isImg = mimeType?.startsWith('image/') || norm.includes('image')

  return {
    icon: FileText,
    tag: isPdf ? 'PDF' : isImg ? 'IMG' : 'DOC',
    label: typeOrSubtitle || 'Document',
    colorClass: 'from-primary/15 via-primary/10 to-muted text-primary border-primary/25',
  }
}
