import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface OrderState {
  selectedAddressId: string | null;
  paymentId: string | null;
}

const initialState: OrderState = {
  selectedAddressId: null,
  paymentId: null,
};

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    setAddress: (state, action: PayloadAction<string>) => {
      state.selectedAddressId = action.payload;
    },
    setPaymentId: (state, action: PayloadAction<string>) => {
      state.paymentId = action.payload;
    },
    clearOrder: (state) => {
      state.selectedAddressId = null;
      state.paymentId = null;
    },
  },
});

export const { setAddress, setPaymentId, clearOrder } = orderSlice.actions;
export default orderSlice.reducer;
