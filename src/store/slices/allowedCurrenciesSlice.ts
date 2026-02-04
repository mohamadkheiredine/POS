import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type AllowedCurrency = {
  id: number;
  storeId?: number;
  currencyId: number;
  companyId?: number;
  rate: number;
  currencyCode: string;
  currencyName: string;
};

type AllowedCurrenciesState = {
  items: AllowedCurrency[];
  selectedCurrencyId: number | null;
  rate: number | null;
};

const initialState: AllowedCurrenciesState = {
  items: [],
  selectedCurrencyId: null,
  rate: null,
};

const allowedCurrenciesSlice = createSlice({
  name: "allowedCurrencies",

  initialState,

  reducers: {
    setAllowedCurrencies(state, action: PayloadAction<AllowedCurrency[]>) {
      state.items = action.payload;
    },

    setSelectedCurrency(
      state,
      action: PayloadAction<{ id: number; rate: number; }>
    ) {
      state.selectedCurrencyId = action.payload.id;
      state.rate = action.payload.rate;
    },
  },
});

export const { setAllowedCurrencies, setSelectedCurrency } =
  allowedCurrenciesSlice.actions;

export default allowedCurrenciesSlice.reducer;
