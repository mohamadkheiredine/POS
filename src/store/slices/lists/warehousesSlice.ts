import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { logout } from "../authSlice";

export type WarehouseItem = { w_id: number; w_warehouse_name: string };
type State = { loaded: boolean; items: WarehouseItem[] };

const initialState: State = { loaded: false, items: [] };

const warehousesSlice = createSlice({
  name: "warehouses",
  initialState,
  reducers: {
    setWarehouses(_, action: PayloadAction<WarehouseItem[]>) {
      return { loaded: true, items: action.payload };
    },
    clearWarehouses() {
      return initialState;
    },
  },
  extraReducers: (b) => {
    b.addCase(logout, () => initialState);
  },
});

export const { setWarehouses, clearWarehouses } = warehousesSlice.actions;
export default warehousesSlice.reducer;
