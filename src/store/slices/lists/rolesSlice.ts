import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { logout } from "../authSlice";

export type RoleItem = { role_id: number; role_name: string };
type State = { loaded: boolean; items: RoleItem[] };

const initialState: State = { loaded: false, items: [] };

const rolesSlice = createSlice({
  name: "roles",
  initialState,
  reducers: {
    setRoles(_, action: PayloadAction<RoleItem[]>) {
      return { loaded: true, items: action.payload };
    },
    clearRoles() {
      return initialState;
    },
  },
  extraReducers: (b) => {
    b.addCase(logout, () => initialState);
  },
});

export const { setRoles, clearRoles } = rolesSlice.actions;
export default rolesSlice.reducer;
