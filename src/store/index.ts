import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

import authReducer from "./slices/authSlice";
import menuReducer from "./slices/menuSlice";
import allowedCurrenciesReducer from "./slices/allowedCurrenciesSlice";
import ordersReducer from "./slices/ordersSlice";

// Separate list slices — each cached independently
import rolesReducer from "./slices/lists/rolesSlice";
import userTypesReducer from "./slices/lists/userTypesSlice";
import companiesReducer from "./slices/lists/companiesSlice";
import langsReducer from "./slices/lists/langsSlice";
import jobTitlesReducer from "./slices/lists/jobTitlesSlice";
import jobRolesReducer from "./slices/lists/jobRolesSlice";
import departmentsReducer from "./slices/lists/departmentsSlice";
import warehousesReducer from "./slices/lists/warehousesSlice";
import employmentTypesReducer from "./slices/lists/employmentTypesSlice";
import paymentTypesReducer from "./slices/lists/paymentTypesSlice";

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

const mk = (key: string) => ({ key, storage });

const persistedAuth             = persistReducer(mk("auth"),            authReducer);
const persistedMenu             = persistReducer(mk("menu"),            menuReducer);
const persistedAllowedCurrencies= persistReducer(mk("allowedCurrencies"), allowedCurrenciesReducer);
const persistedOrders           = persistReducer(mk("orders"),          ordersReducer);
const persistedRoles            = persistReducer(mk("roles"),           rolesReducer);
const persistedUserTypes        = persistReducer(mk("userTypes"),       userTypesReducer);
const persistedCompanies        = persistReducer(mk("companies"),       companiesReducer);
const persistedLangs            = persistReducer(mk("langs"),           langsReducer);
const persistedJobTitles        = persistReducer(mk("jobTitles"),       jobTitlesReducer);
const persistedJobRoles         = persistReducer(mk("jobRoles"),        jobRolesReducer);
const persistedDepartments      = persistReducer(mk("departments"),     departmentsReducer);
const persistedWarehouses       = persistReducer(mk("warehouses"),      warehousesReducer);
const persistedEmploymentTypes  = persistReducer(mk("employmentTypes"), employmentTypesReducer);
const persistedPaymentTypes     = persistReducer(mk("paymentTypes"),    paymentTypesReducer);

export const store = configureStore({
  reducer: {
    auth:             persistedAuth,
    menu:             persistedMenu,
    allowedCurrencies: persistedAllowedCurrencies,
    orders:           persistedOrders,
    roles:            persistedRoles,
    userTypes:        persistedUserTypes,
    companies:        persistedCompanies,
    langs:            persistedLangs,
    jobTitles:        persistedJobTitles,
    jobRoles:         persistedJobRoles,
    departments:      persistedDepartments,
    warehouses:       persistedWarehouses,
    employmentTypes:  persistedEmploymentTypes,
    paymentTypes:     persistedPaymentTypes,
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
