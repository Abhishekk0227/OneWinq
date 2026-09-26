import { create } from 'zustand'

interface UIState {
  isSidebarCollapsed: boolean
  isMobileMenuOpen: boolean
  activeModal: string | null
  modalData: unknown
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setMobileMenuOpen: (open: boolean) => void
  openModal: (modalId: string, data?: unknown) => void
  closeModal: () => void
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarCollapsed: false,
  isMobileMenuOpen: false,
  activeModal: null,
  modalData: null,

  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  setSidebarCollapsed: (isSidebarCollapsed) =>
    set({ isSidebarCollapsed }),

  setMobileMenuOpen: (isMobileMenuOpen) =>
    set({ isMobileMenuOpen }),

  openModal: (activeModal, modalData = null) =>
    set({ activeModal, modalData }),

  closeModal: () =>
    set({ activeModal: null, modalData: null }),
}))
