import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { logout } from "../authSlice";

export type CompanyItem = { cd_id: number; cd_company_name: string };
type State = { loaded: boolean; items: CompanyItem[] };

const initialState: State = { loaded: false, items: [] };

const companiesSlice = createSlice({
  name: "companies",
  initialState,
  reducers: {
    setCompanies(_, action: PayloadAction<CompanyItem[]>) {
      return { loaded: true, items: action.payload };
    },
    clearCompanies() {
      return initialState;
    },
  },
  extraReducers: (b) => {
    b.addCase(logout, () => initialState);
  },
});

export const { setCompanies, clearCompanies } = companiesSlice.actions;
export default companiesSlice.reducer;
