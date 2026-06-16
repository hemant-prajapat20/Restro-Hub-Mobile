import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CartItem {
  item: any; // Using any for MenuItem
  quantity: number;
}

interface CartState {
  businessId: string | null;
  businessName: string | null;
  items: CartItem[];
}

const loadState = (): CartState => {
  try {
    const serializedState = localStorage.getItem('cartState');
    if (serializedState === null) {
      return {
        businessId: null,
        businessName: null,
        items: [],
      };
    }
    return JSON.parse(serializedState);
  } catch (err) {
    return {
      businessId: null,
      businessName: null,
      items: [],
    };
  }
};

const saveState = (state: CartState) => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem('cartState', serializedState);
  } catch (err) {
    // Ignore write errors
  }
};

const initialState: CartState = loadState();

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<{ businessId: string; businessName: string; item: any }>) => {
      const { businessId, businessName, item } = action.payload;

      if (state.businessId && state.businessId !== businessId) {
        // Business mismatch, clear cart first
        state.businessId = businessId;
        state.businessName = businessName;
        state.items = [{ item, quantity: 1 }];
      } else {
        // Same business or empty cart
        if (!state.businessId) {
          state.businessId = businessId;
          state.businessName = businessName;
        }

        const existingItem = state.items.find((i) => i.item._id === item._id);
        if (existingItem) {
          existingItem.quantity += 1;
        } else {
          state.items.push({ item, quantity: 1 });
        }
      }
      saveState(state);
    },
    removeFromCart: (state, action: PayloadAction<{ itemId: string }>) => {
      const { itemId } = action.payload;
      const existingItemIndex = state.items.findIndex((i) => i.item._id === itemId);

      if (existingItemIndex !== -1) {
        if (state.items[existingItemIndex].quantity > 1) {
          state.items[existingItemIndex].quantity -= 1;
        } else {
          state.items.splice(existingItemIndex, 1);
        }
      }

      // If cart becomes empty, reset business binding
      if (state.items.length === 0) {
        state.businessId = null;
        state.businessName = null;
      }
      saveState(state);
    },
    clearCart: (state) => {
      state.items = [];
      state.businessId = null;
      state.businessName = null;
      saveState(state);
    },
  },
});

export const { addToCart, removeFromCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
