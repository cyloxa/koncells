import { create } from "zustand";

interface UIState {
  isSidebarOpen: boolean;
  isMobileMenuOpen: boolean;
  isSearchOpen: boolean;

  toggleSidebar: () => void;
  toggleMobileMenu: () => void;
  toggleSearch: () => void;
  closeAll: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: false,
  isMobileMenuOpen: false,
  isSearchOpen: false,

  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  toggleMobileMenu: () => set((s) => ({ isMobileMenuOpen: !s.isMobileMenuOpen })),
  toggleSearch: () => set((s) => ({ isSearchOpen: !s.isSearchOpen })),
  closeAll: () =>
    set({ isSidebarOpen: false, isMobileMenuOpen: false, isSearchOpen: false }),
}));
