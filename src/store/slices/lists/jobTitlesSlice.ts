import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { logout } from "../authSlice";

export type JobTitleItem = { jt_id: number; jt_job_title: string };
type State = { loaded: boolean; items: JobTitleItem[] };

const initialState: State = { loaded: false, items: [] };

const jobTitlesSlice = createSlice({
  name: "jobTitles",
  initialState,
  reducers: {
    setJobTitles(_, action: PayloadAction<JobTitleItem[]>) {
      return { loaded: true, items: action.payload };
    },
    clearJobTitles() {
      return initialState;
    },
  },
  extraReducers: (b) => {
    b.addCase(logout, () => initialState);
  },
});

export const { setJobTitles, clearJobTitles } = jobTitlesSlice.actions;
export default jobTitlesSlice.reducer;
