import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { logout } from "../authSlice";

export type DepartmentItem = { sd_id: number; sd_department_title: string };
type State = { loaded: boolean; items: DepartmentItem[] };

const initialState: State = { loaded: false, items: [] };

const departmentsSlice = createSlice({
  name: "departments",
  initialState,
  reducers: {
    setDepartments(_, action: PayloadAction<DepartmentItem[]>) {
      return { loaded: true, items: action.payload };
    },
    clearDepartments() {
      return initialState;
    },
  },
  extraReducers: (b) => {
    b.addCase(logout, () => initialState);
  },
});

export const { setDepartments, clearDepartments } = departmentsSlice.actions;
export default departmentsSlice.reducer;
