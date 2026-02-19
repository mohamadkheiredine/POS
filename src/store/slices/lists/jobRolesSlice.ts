import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { logout } from "../authSlice";

export type JobRoleItem = { jr_id: number; jr_job_role: string };
type State = { loaded: boolean; items: JobRoleItem[] };

const initialState: State = { loaded: false, items: [] };

const jobRolesSlice = createSlice({
  name: "jobRoles",
  initialState,
  reducers: {
    setJobRoles(_, action: PayloadAction<JobRoleItem[]>) {
      return { loaded: true, items: action.payload };
    },
    clearJobRoles() {
      return initialState;
    },
  },
  extraReducers: (b) => {
    b.addCase(logout, () => initialState);
  },
});

export const { setJobRoles, clearJobRoles } = jobRolesSlice.actions;
export default jobRolesSlice.reducer;
