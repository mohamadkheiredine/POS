import { ModifierGroup } from "@/components/include/POSClient";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type MenuItem = {
  id: number;
  name: string;
  price: number;
  categoryId: number;
  currency_code: string;
  cc_id: number;
  categoryName: string;
  kitchen_station_id: number;
  modifierGroups: any[];
};

type MenuState = {
  items: MenuItem[];
  lastFetched: number | null;
};

const initialState: MenuState = {
  items: [],
  lastFetched: null,
};

const menuSlice = createSlice({
  name: "menu",

  initialState,

  reducers: {
    setMenuItems(state, action: PayloadAction<MenuItem[]>) {
      state.items = action.payload;
      state.lastFetched = Date.now();
    },

    clearMenu(state) {
      state.items = [];
      state.lastFetched = null;
    },

    updateItemModifiers(
      state,
      action: PayloadAction<{ id: number; modifierGroups: ModifierGroup[] }>,
    ) {
      state.items = state.items.map((x) =>
        x.id === action.payload.id
          ? { ...x, modifierGroups: action.payload.modifierGroups }
          : x,
      );
    },
  },
});

export const { setMenuItems, clearMenu, updateItemModifiers } = menuSlice.actions;
export default menuSlice.reducer;
