import { create } from 'zustand'
import { VISIBILITY_MODE, type VisibilityMode } from '@/constants/app.constants'

interface ProfileViewState {
  previewMode: VisibilityMode
  isPreviewModalOpen: boolean
  setPreviewMode: (mode: VisibilityMode) => void
  setPreviewModalOpen: (open: boolean) => void
}

export const useProfileViewStore = create<ProfileViewState>((set) => ({
  previewMode: VISIBILITY_MODE.PUBLIC,
  isPreviewModalOpen: false,

  setPreviewMode: (previewMode) => set({ previewMode }),
  setPreviewModalOpen: (isPreviewModalOpen) => set({ isPreviewModalOpen }),
}))
