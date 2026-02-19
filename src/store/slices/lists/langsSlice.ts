import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { logout } from "../authSlice";

export type LangItem = { lm_id: number; lm_lang_name: string };
type State = { loaded: boolean; items: LangItem[] };

const initialState: State = { loaded: false, items: [] };

const langsSlice = createSlice({
  name: "langs",
  initialState,
  reducers: {
    setLangs(_, action: PayloadAction<LangItem[]>) {
      return { loaded: true, items: action.payload };
    },
    clearLangs() {
      return initialState;
    },
  },
  extraReducers: (b) => {
    b.addCase(logout, () => initialState);
  },
});

export const { setLangs, clearLangs } = langsSlice.actions;
export default langsSlice.reducer;
