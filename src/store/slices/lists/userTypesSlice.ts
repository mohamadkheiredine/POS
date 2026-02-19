import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { logout } from "../authSlice";

export type UserTypeItem = { ut_id: number; ut_user_type: string };
type State = { loaded: boolean; items: UserTypeItem[] };

const initialState: State = { loaded: false, items: [] };

const userTypesSlice = createSlice({
  name: "userTypes",
  initialState,
  reducers: {
    setUserTypes(_, action: PayloadAction<UserTypeItem[]>) {
      return { loaded: true, items: action.payload };
    },
    clearUserTypes() {
      return initialState;
    },
  },
  extraReducers: (b) => {
    b.addCase(logout, () => initialState);
  },
});

export const { setUserTypes, clearUserTypes } = userTypesSlice.actions;
export default userTypesSlice.reducer;
