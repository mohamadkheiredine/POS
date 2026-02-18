import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type LocalOrder = {
  orderId: string;
  tableIds: number[];
  items: OrderItem[];
  isHeld?: boolean;
  isPaid?: boolean;
  customer?: any;
  mergedMeta?: {
    primaryTable: number;
    mergedAt: number;
  };
  checkoutDraft?: boolean;
};

type AppliedModifier = {
  groupId: number;
  optionId: number;
  qty: number;
};

type OrderItem = {
  uid: string;
  itemId: number;
  name: string;
  basePrice: number;
  qty: number;
  stationId: number;
  note?: string;
  modifiers: AppliedModifier[];
  priceExtra: number;
  sentToKitchen: boolean;
};

type OrdersState = {
  orders: LocalOrder[];
};

export const createEmptyOrder = (id: string): LocalOrder => ({
  orderId: id,

  tableIds: [0],

  items: [],

  customer: {
    customer_id: null,
    name: "",
    phone: "",
    address: "",
  },

  checkoutDraft: false,

  isHeld: false,
  isPaid: false,
});

const initialState: OrdersState = {
  orders: [] as LocalOrder[],
};

const ordersSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    // update if exist w iza laa 3mal insert
    upsertOrder(state, action: PayloadAction<LocalOrder>) {
      const base = createEmptyOrder(action.payload.orderId);

      const safePayload: LocalOrder = {
        ...base,

        ...action.payload,

        tableIds: Array.isArray(action.payload.tableIds)
          ? action.payload.tableIds
          : [action.payload.tableIds || 0],

        items: Array.isArray(action.payload.items) ? action.payload.items : [],

        customer: {
          ...base.customer,
          ...(action.payload.customer || {}),
        },
      };

      const i = state.orders.findIndex(
        (o) => o.orderId === action.payload.orderId,
      );

      if (i === -1) {
        state.orders.push(safePayload);
      } else {
        state.orders[i] = safePayload;
      }
    },

    // mtl upsertorder bss for many orders,  mnst3mlo bl /sync l2n momken nred aktar mn order
    upsertManyOrders(state, action: PayloadAction<LocalOrder[]>) {
      for (const o of action.payload) {
        const i = state.orders.findIndex((x) => x.orderId === o.orderId);
        if (i === -1) {
          state.orders.push(o);
        } else {
          state.orders[i] = { ...state.orders[i], ...o };
        }
      }
    },

    // solve ids problem
    // mhemme for createemptyorder
    replaceOrderId(
      state,
      action: PayloadAction<{ tempId: string; realId: string }>,
    ) {
      const { tempId, realId } = action.payload;
      const i = state.orders.findIndex((o) => o.orderId === tempId);
      if (i === -1) {
        return;
      }

      // if real already exists -> merge into real, remove temp
      const j = state.orders.findIndex((o) => o.orderId === realId);
      if (j !== -1) {
        state.orders[j] = {
          ...state.orders[j],
          ...state.orders[i],
          orderId: realId,
          customer: {
            ...createEmptyOrder(realId).customer,
            ...(state.orders[i].customer || {}),
          },

          items: [
            ...(state.orders[j].items ?? []),
            ...(state.orders[i].items ?? []),
          ],
          tableIds: Array.from(
            new Set([
              ...(state.orders[j].tableIds ?? []),
              ...(state.orders[i].tableIds ?? []),
            ]),
          ),
        };
        state.orders.splice(i, 1);
      } else {
        // 3mal rename lal order id mn temp lal real id
        state.orders[i] = { ...state.orders[i], orderId: realId };
      }
    },

    updateOrderItems(
      state,
      action: PayloadAction<{ id: string; items: OrderItem[] }>,
    ) {
      const o = state.orders.find((x) => x.orderId === action.payload.id);
      if (!o) {
        return;
      }
      o.items = action.payload.items;
    },

    removeOrder(state, action: PayloadAction<string>) {
      state.orders = state.orders.filter((o) => o.orderId !== action.payload);
    },

    // Replace all synced orders (removes paid/deleted orders not in the new list)
    // Keeps local-only orders that haven't been synced to the server yet
    // Preserves unsent items when merging with server state
    replaceAllSyncedOrders(state, action: PayloadAction<LocalOrder[]>) {
      const synced = action.payload;
      const syncedIds = new Set(synced.map((o) => o.orderId));
      const localMap = new Map(state.orders.map((o) => [o.orderId, o]));

      // Merge synced orders: keep server data but preserve any local unsent items
      const merged = synced.map((serverOrder) => {
        const local = localMap.get(serverOrder.orderId);
        if (!local) return serverOrder; // new order from another browser

        const localUnsent = (local.items ?? []).filter((i) => !i.sentToKitchen);
        if (localUnsent.length === 0) return serverOrder; // no local work, use server

        // Merge: server items (all sent) + local unsent items the user is building
        return {
          ...serverOrder,
          items: [...(serverOrder.items ?? []), ...localUnsent],
          // Preserve local table assignment & customer if user set them locally
          tableIds: local.tableIds[0] !== 0 ? local.tableIds : serverOrder.tableIds,
          customer: local.customer ?? serverOrder.customer,
          checkoutDraft: local.checkoutDraft || serverOrder.checkoutDraft,
        };
      });

      // Keep orders not in sync response if they have local-only state
      const keepLocal = state.orders.filter((o) => {
        if (syncedIds.has(o.orderId)) return false; // already merged above
        if (o.orderId.startsWith("tmp_")) return true; // temp order, not on server yet
        const hasUnsent = o.items?.some((item) => !item.sentToKitchen);
        if (hasUnsent) return true; // user is building this order locally
        return false; // not on server + no local changes → was paid/deleted, remove it
      });

      state.orders = [...merged, ...keepLocal];
    },
  },
});

export const {
  upsertOrder,
  upsertManyOrders,
  replaceOrderId,
  removeOrder,
  updateOrderItems,
  replaceAllSyncedOrders,
} = ordersSlice.actions;

export default ordersSlice.reducer;
