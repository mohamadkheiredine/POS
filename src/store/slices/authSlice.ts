import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type AllowedCurrency = {
  cc_id: number;
  cc_currency_code: string;
  cc_currency_name: string;
  ac_rate_to_original: number | string;
};

export type LoginData = {
  g_hash: string | null;
  user_id: string | null;
  user_profile_url: string | null;
  user_fullname: string | null;
  user_email: string | null;
  user_name: string | null;

  company_currency: string | null;
  currency_symbol: string | null;

  sec_currency_id: string | null;
  sec_currency_symbol: string | null;

  warehouse_id: string | null;
  exchange_rate: string | null;

  store_id: string | null;
  company_id: string | null;

  allowed_currencies: AllowedCurrency[];
};

export type AuthState = {
  isLoggedIn: boolean;

  loginData: LoginData;
};

const initialState: AuthState = {
  isLoggedIn: false,

  loginData: {
    g_hash: null,
    user_id: null,
    user_profile_url: null,
    user_fullname: null,
    user_email: null,
    user_name: null,

    company_currency: null,
    currency_symbol: null,

    sec_currency_id: null,
    sec_currency_symbol: null,

    warehouse_id: null,
    exchange_rate: null,

    store_id: null,
    company_id: null,

    allowed_currencies: [],
  },
};

const authSlice = createSlice({
  name: "auth",
  initialState,

  reducers: {
    // login success
    setAuth(state, action: PayloadAction<Partial<LoginData>>) {
      state.loginData = {
        ...state.loginData,
        ...action.payload,
      };

      state.isLoggedIn = true;
    },

    updateLoginStringField: (
      state,
      action: PayloadAction<{
        key: Exclude<keyof LoginData, "allowed_currencies">;
        value: string | null;
      }>,
    ) => {
      state.loginData[action.payload.key] = action.payload.value;
    },

    updateAllowedCurrencies: (
      state,
      action: PayloadAction<AllowedCurrency[]>,
    ) => {
      state.loginData.allowed_currencies = action.payload;
    },

    // logout
    logout() {
      return initialState;
    },
  },
});

export const { setAuth, logout, updateLoginStringField, updateAllowedCurrencies } = authSlice.actions;
export default authSlice.reducer;
