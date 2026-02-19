import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { logout } from "./authSlice";

/* ─────────────────────────────────────────────────────────────
 * Shared dropdown-list types (imported by any page that needs them)
 * ───────────────────────────────────────────────────────────── */
export type UsersFormDropdowns = {
  lst_roles: { role_id: number; role_name: string }[];
  lst_user_types: { ut_id: number; ut_user_type: string }[];
  lst_companies: { cd_id: number; cd_company_name: string }[];
  lst_langs: { lm_id: number; lm_lang_name: string }[];
  lst_job_titles: { jt_id: number; jt_job_title: string }[];
  lst_job_roles: { jr_id: number; jr_job_role: string }[];
  lst_departments: { sd_id: number; sd_department_title: string }[];
  lst_warehouses: { w_id: number; w_warehouse_name: string }[];
  lst_employment_type: { et_id: number; et_type: string }[];
  lst_payment_types: { pt_id: number; pt_payment_type: string }[];
};

type UsersFormState = UsersFormDropdowns & {
  /** true once data has been fetched at least once */
  loaded: boolean;
};

const initialState: UsersFormState = {
  loaded: false,
  lst_roles: [],
  lst_user_types: [],
  lst_companies: [],
  lst_langs: [],
  lst_job_titles: [],
  lst_job_roles: [],
  lst_departments: [],
  lst_warehouses: [],
  lst_employment_type: [],
  lst_payment_types: [],
};

const usersFormSlice = createSlice({
  name: "usersForm",
  initialState,
  reducers: {
    /** Cache the dropdown lists returned by getusersformdata */
    setUsersFormData(state, action: PayloadAction<UsersFormDropdowns>) {
      return { ...action.payload, loaded: true };
    },
    /** Force a re-fetch next time the form is opened */
    clearUsersFormData() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Automatically clear cached dropdowns when the user logs out
    // so a different user or changed roles always get fresh data
    builder.addCase(logout, () => initialState);
  },
});

export const { setUsersFormData, clearUsersFormData } = usersFormSlice.actions;
export default usersFormSlice.reducer;
