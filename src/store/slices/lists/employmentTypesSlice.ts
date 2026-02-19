import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { logout } from "../authSlice";

export type EmploymentTypeItem = { et_id: number; et_type: string };
type State = { loaded: boolean; items: EmploymentTypeItem[] };

const initialState: State = { loaded: false, items: [] };

const employmentTypesSlice = createSlice({
  name: "employmentTypes",
  initialState,
  reducers: {
    setEmploymentTypes(_, action: PayloadAction<EmploymentTypeItem[]>) {
      return { loaded: true, items: action.payload };
    },
    clearEmploymentTypes() {
      return initialState;
    },
  },
  extraReducers: (b) => {
    b.addCase(logout, () => initialState);
  },
});

export const { setEmploymentTypes, clearEmploymentTypes } = employmentTypesSlice.actions;
export default employmentTypesSlice.reducer;
