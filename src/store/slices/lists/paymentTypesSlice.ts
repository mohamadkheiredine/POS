import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { logout } from "../authSlice";

export type PaymentTypeItem = { pt_id: number; pt_payment_type: string };
type State = { loaded: boolean; items: PaymentTypeItem[] };

const initialState: State = { loaded: false, items: [] };

const paymentTypesSlice = createSlice({
  name: "paymentTypes",
  initialState,
  reducers: {
    setPaymentTypes(_, action: PayloadAction<PaymentTypeItem[]>) {
      return { loaded: true, items: action.payload };
    },
    clearPaymentTypes() {
      return initialState;
    },
  },
  extraReducers: (b) => {
    b.addCase(logout, () => initialState);
  },
});

export const { setPaymentTypes, clearPaymentTypes } = paymentTypesSlice.actions;
export default paymentTypesSlice.reducer;
