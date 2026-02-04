import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

import authReducer from "./slices/authSlice";
import menuReducer from "./slices/menuSlice";
import allowedCurrenciesReducer from "./slices/allowedCurrenciesSlice";
import ordersReducer from "./slices/ordersSlice";

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

const authPersistConfig = {
  key: "auth",
  storage,
};

const menuPersistConfig = {
  key: "menu",
  storage,
};

const allowedCurrenciesPersistConfig = {
  key: "allowedCurrencies",
  storage,
};

const ordersPersistConfig = {
  key: "orders",
  storage,
};

const persistedAuth = persistReducer(authPersistConfig, authReducer);
const persistedMenu = persistReducer(menuPersistConfig, menuReducer);
const persistedAllowedCurrencies = persistReducer(allowedCurrenciesPersistConfig, allowedCurrenciesReducer);
const persistedOrders = persistReducer(ordersPersistConfig, ordersReducer);


export const store = configureStore({
  reducer: {
    auth: persistedAuth,
    menu: persistedMenu,
    allowedCurrencies: persistedAllowedCurrencies,
    orders: persistedOrders,
  },

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          "persist/PERSIST",
          "persist/REHYDRATE",
          "persist/PURGE",
        ],
      },
    }),
});

export const persistor = persistStore(store);
