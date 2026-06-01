import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  quantity: number;
  stock: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  // Actions
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  // Computed
  getItemCount: () => number;
  getSubtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item, quantity = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            const newQty = existing.quantity + quantity;
            if (newQty > item.stock) return state;
            return {
              items: state.items.map((i) =>
                i.productId === item.productId ? { ...i, quantity: newQty } : i
              ),
            };
          }
          if (quantity > item.stock) return state;
          return {
            items: [...state.items, { ...item, quantity }],
          };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }));
      },

      updateQuantity: (productId, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.productId !== productId) };
          }
          return {
            items: state.items.map((i) =>
              i.productId === productId ? { ...i, quantity: Math.min(quantity, i.stock) } : i
            ),
          };
        });
      },

      clearCart: () => set({ items: [] }),

      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      getSubtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: "cart-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
);
