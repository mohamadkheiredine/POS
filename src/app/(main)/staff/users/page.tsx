"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  X,
  CheckCircle2,
  Users,
  User,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setRoles }           from "@/store/slices/lists/rolesSlice";
import { setUserTypes }       from "@/store/slices/lists/userTypesSlice";
import { setCompanies }       from "@/store/slices/lists/companiesSlice";
import { setLangs }           from "@/store/slices/lists/langsSlice";
import { setJobTitles }       from "@/store/slices/lists/jobTitlesSlice";
import { setJobRoles }        from "@/store/slices/lists/jobRolesSlice";
import { setDepartments }     from "@/store/slices/lists/departmentsSlice";
import { setWarehouses }      from "@/store/slices/lists/warehousesSlice";
import { setEmploymentTypes } from "@/store/slices/lists/employmentTypesSlice";
import { setPaymentTypes }    from "@/store/slices/lists/paymentTypesSlice";

type UserRecord = {
  id: number;
  username: string;
  fullname: string;
  email: string;
  phone: string;
  mobile: string;
  is_active: number;
  gender: string;
  avatar_url: string;
};

type FormState = {
  id: number | null;
  u_fullname: string;
  u_username: string;
  password: string;
  u_attendance_code: string;
  u_user_type: string;
  fk_role_id: string;
  u_lang_id: string;
  u_address: string;
  u_is_active: boolean;
  allowed_companies: number[];
  avatar_file: File | null;
  avatar_preview: string;
  // Personal
  u_gender: string;
  u_residential_area: string;
  u_email: string;
  u_date_birth: string;
  u_mobile: string;
  u_phone: string;
  u_fax: string;
  u_website: string;
  u_marital_status: string;
  u_number_of_dependencies: string;
  // Employment
  fk_company_id: string;
  u_department_id: string;
  fk_warehouse_id: string;
  u_job_role_id: string;
  u_job_title_id: string;
  u_employee_type: string;
  u_employment_date: string;
  u_daily_working_hours: string;
  u_user_sallary: string;
  u_sales_commission: string;
  u_hourly_rate: string;
  u_number_holidays: string;
  u_has_insurance: boolean;
  u_cnss_number: string;
  pm_id: string;
  pm_payment_method: string;
};

const EMPTY_FORM: FormState = {
  id: null,
  u_fullname: "",
  u_username: "",
  password: "",
  u_attendance_code: "",
  u_user_type: "",
  fk_role_id: "",
  u_lang_id: "",
  u_address: "",
  u_is_active: true,
  allowed_companies: [],
  avatar_file: null,
  avatar_preview: "",
  u_gender: "",
  u_residential_area: "",
  u_email: "",
  u_date_birth: "",
  u_mobile: "",
  u_phone: "",
  u_fax: "",
  u_website: "",
  u_marital_status: "",
  u_number_of_dependencies: "",
  fk_company_id: "",
  u_department_id: "",
  fk_warehouse_id: "",
  u_job_role_id: "",
  u_job_title_id: "",
  u_employee_type: "",
  u_employment_date: "",
  u_daily_working_hours: "9.5",
  u_user_sallary: "",
  u_sales_commission: "",
  u_hourly_rate: "",
  u_number_holidays: "0",
  u_has_insurance: false,
  u_cnss_number: "",
  pm_id: "",
  pm_payment_method: "",
};

type Tab = "info" | "personal" | "employment";

const TABS: { key: Tab; label: string }[] = [
  { key: "info", label: "User Info" },
  { key: "personal", label: "Personal" },
  { key: "employment", label: "Employment" },
];

type FieldErrors = Partial<Record<keyof FormState, string>>;

const INFO_REQ: (keyof FormState)[] = [
  "u_fullname",
  "u_username",
  "password",
  "u_user_type",
  "fk_role_id",
];
const PERSONAL_REQ: (keyof FormState)[] = ["u_email", "u_date_birth"];
const EMPLOYMENT_REQ: (keyof FormState)[] = ["u_employment_date"];

const tabHasError = (key: Tab, errs: FieldErrors): boolean => {
  if (key === "info") return INFO_REQ.some((f) => !!errs[f]);
  if (key === "personal") return PERSONAL_REQ.some((f) => !!errs[f]);
  if (key === "employment") return EMPLOYMENT_REQ.some((f) => !!errs[f]);
  return false;
};

export default function UsersPage() {
  const dispatch = useAppDispatch();
  const auth     = useAppSelector((s) => s.auth.loginData);
  const user_id  = auth.user_id;
  const g_hash   = auth.g_hash;
  const store_id = auth.store_id;

  // Individual list caches from Redux
  const rolesState           = useAppSelector((s) => s.roles);
  const userTypesState       = useAppSelector((s) => s.userTypes);
  const companiesState       = useAppSelector((s) => s.companies);
  const langsState           = useAppSelector((s) => s.langs);
  const jobTitlesState       = useAppSelector((s) => s.jobTitles);
  const jobRolesState        = useAppSelector((s) => s.jobRoles);
  const departmentsState     = useAppSelector((s) => s.departments);
  const warehousesState      = useAppSelector((s) => s.warehouses);
  const employmentTypesState = useAppSelector((s) => s.employmentTypes);
  const paymentTypesState    = useAppSelector((s) => s.paymentTypes);

  const [users, setUsers]               = useState<UserRecord[]>([]);
  const [search, setSearch]             = useState("");
  const [loading, setLoading]           = useState(false);
  const [currentPage, setCurrentPage]   = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalActive, setTotalActive]   = useState(0);
  const [totalInactive, setTotalInactive] = useState(0);
  const [drawer, setDrawer]             = useState<{ open: boolean; isEdit: boolean }>({
    open: false,
    isEdit: false,
  });
  const [form, setForm]                 = useState<FormState>(EMPTY_FORM);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [activeTab, setActiveTab]       = useState<Tab>("info");
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState("");
  const [fieldErrors, setFieldErrors]   = useState<FieldErrors>({});
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── Auth params ── */
  const authParams = { user_id: user_id!, g_hash: g_hash! };

  /* ── Users table ── */
  const loadUsers = async (page: number, query: string) => {
    setLoading(true);
    try {
      const { data } = await api.get(
        `${process.env.NEXT_PUBLIC_API_LINK}/request/api/getlistusers`,
        { params: { user_id, g_hash, page_number: page, search_query: query } }
      );
      if (data.is_error === 0) {
        setUsers(data.lst_users || []);
        setTotalPages(data.total_pages || 1);
        setTotalRecords(data.total_records || 0);
        setTotalActive(data.total_active || 0);
        setTotalInactive(data.total_inactive || 0);
        setCurrentPage(page);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user_id && g_hash) loadUsers(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user_id, g_hash]);

  useEffect(() => {
    if (!user_id || !g_hash) return;
    const timer = setTimeout(() => loadUsers(1, search), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    loadUsers(page, search);
  };

  /* ─────────────────────────────────────────────────────────────
   * Individual list fetchers — each dispatches to its own slice
   * ───────────────────────────────────────────────────────────── */
  const API = process.env.NEXT_PUBLIC_API_LINK;

  const fetchRoles = async () => {
    const { data } = await api.get(`${API}/request/api/lists/roles`, { params: authParams });
    if (data.is_error === 0) dispatch(setRoles(data.items));
  };
  const fetchUserTypes = async () => {
    const { data } = await api.get(`${API}/request/api/lists/usertypes`, { params: authParams });
    if (data.is_error === 0) dispatch(setUserTypes(data.items));
  };
  const fetchCompanies = async () => {
    const { data } = await api.get(`${API}/request/api/lists/companies`, { params: authParams });
    if (data.is_error === 0) dispatch(setCompanies(data.items));
  };
  const fetchLangs = async () => {
    const { data } = await api.get(`${API}/request/api/lists/langs`, { params: authParams });
    if (data.is_error === 0) dispatch(setLangs(data.items));
  };
  const fetchJobTitles = async () => {
    const { data } = await api.get(`${API}/request/api/lists/jobtitles`, { params: authParams });
    if (data.is_error === 0) dispatch(setJobTitles(data.items));
  };
  const fetchJobRoles = async () => {
    const { data } = await api.get(`${API}/request/api/lists/jobroles`, { params: authParams });
    if (data.is_error === 0) dispatch(setJobRoles(data.items));
  };
  const fetchDepartments = async () => {
    const { data } = await api.get(`${API}/request/api/lists/departments`, { params: authParams });
    if (data.is_error === 0) dispatch(setDepartments(data.items));
  };
  const fetchWarehouses = async () => {
    const { data } = await api.get(`${API}/request/api/lists/warehouses`, { params: authParams });
    if (data.is_error === 0) dispatch(setWarehouses(data.items));
  };
  const fetchEmploymentTypes = async () => {
    const { data } = await api.get(`${API}/request/api/lists/employmenttypes`, { params: authParams });
    if (data.is_error === 0) dispatch(setEmploymentTypes(data.items));
  };
  const fetchPaymentTypes = async () => {
    const { data } = await api.get(`${API}/request/api/lists/paymenttypes`, { params: authParams });
    if (data.is_error === 0) dispatch(setPaymentTypes(data.items));
  };

  /**
   * Fetch only the lists that are not yet cached in Redux.
   * All missing lists are fetched in parallel.
   */
  const ensureDropdowns = async () => {
    const tasks: Promise<void>[] = [];
    if (!rolesState.loaded)           tasks.push(fetchRoles());
    if (!userTypesState.loaded)       tasks.push(fetchUserTypes());
    if (!companiesState.loaded)       tasks.push(fetchCompanies());
    if (!langsState.loaded)           tasks.push(fetchLangs());
    if (!jobTitlesState.loaded)       tasks.push(fetchJobTitles());
    if (!jobRolesState.loaded)        tasks.push(fetchJobRoles());
    if (!departmentsState.loaded)     tasks.push(fetchDepartments());
    if (!warehousesState.loaded)      tasks.push(fetchWarehouses());
    if (!employmentTypesState.loaded) tasks.push(fetchEmploymentTypes());
    if (!paymentTypesState.loaded)    tasks.push(fetchPaymentTypes());
    if (tasks.length > 0) await Promise.all(tasks);
  };

  /** Fetch user-specific edit data (no lists) */
  const fetchEditUserData = async (editUserId: number) => {
    try {
      const { data } = await api.get(
        `${API}/request/api/getusereditdata`,
        { params: { ...authParams, edit_user_id: editUserId } }
      );
      if (data.is_error === 0) return data;
    } catch {
      // ignore
    }
    return null;
  };

  /* ── Open Add ── */
  const openAdd = async () => {
    setForm(EMPTY_FORM);
    setError("");
    setFieldErrors({});
    setActiveTab("info");
    setDrawer({ open: true, isEdit: false });

    setLoadingDropdowns(true);
    await ensureDropdowns();
    setLoadingDropdowns(false);

    // Generate a local 5-digit PIN (same range as the backend rand)
    const pin = String(Math.floor(10000 + Math.random() * 90000));
    setForm((f) => ({ ...f, u_attendance_code: pin }));
  };

  /* ── Open Edit ── */
  const openEdit = async (u: UserRecord) => {
    setError("");
    setFieldErrors({});
    setActiveTab("info");
    setForm({
      ...EMPTY_FORM,
      id: u.id,
      u_username: u.username,
      u_fullname: u.fullname,
      u_email: u.email || "",
      u_phone: u.phone || "",
      u_mobile: u.mobile || "",
      u_gender: u.gender || "",
      u_is_active: u.is_active === 1,
      avatar_file: null,
      avatar_preview: u.avatar_url || "",
    });
    setDrawer({ open: true, isEdit: true });

    setLoadingDropdowns(true);
    // Fetch missing lists + user-specific data in parallel
    const [editData] = await Promise.all([
      fetchEditUserData(u.id),
      ensureDropdowns(),
    ]);
    setLoadingDropdowns(false);

    if (editData) {
      const ui = editData.edit_user_info || {};
      const pm = editData.payroll_payment_method || {};
      setForm((f) => ({
        ...f,
        u_attendance_code:        ui.u_attendance_code || "",
        u_user_type:              String(ui.u_user_type ?? ""),
        fk_role_id:               String(ui.fk_role_id ?? ""),
        u_lang_id:                String(ui.u_lang_id ?? ""),
        u_address:                ui.u_address || "",
        allowed_companies:        (editData.allowed_companies || []).map(Number),
        u_residential_area:       ui.u_residential_area || "",
        u_date_birth:             ui.u_date_birth ? String(ui.u_date_birth).split("T")[0] : "",
        u_fax:                    ui.u_fax || "",
        u_website:                ui.u_website || "",
        u_marital_status:         String(ui.u_marital_status ?? ""),
        u_number_of_dependencies: String(ui.u_number_of_dependencies ?? ""),
        fk_company_id:            String(ui.fk_company_id ?? ""),
        u_department_id:          String(ui.u_department_id ?? ""),
        fk_warehouse_id:          String(ui.fk_warehouse_id ?? ""),
        u_job_role_id:            String(ui.u_job_role_id ?? ""),
        u_job_title_id:           String(ui.u_job_title_id ?? ""),
        u_employee_type:          String(ui.u_employee_type ?? ""),
        u_employment_date:        ui.u_employment_date ? String(ui.u_employment_date).split("T")[0] : "",
        u_daily_working_hours:    String(ui.u_daily_working_hours ?? "9.5"),
        u_user_sallary:           String(ui.u_user_sallary ?? ""),
        u_sales_commission:       String(ui.u_sales_commission ?? ""),
        u_hourly_rate:            String(ui.u_hourly_rate ?? ""),
        u_number_holidays:        String(ui.u_number_holidays ?? "0"),
        u_has_insurance:          ui.u_has_insurance == 1,
        u_cnss_number:            ui.u_cnss_number || "",
        pm_id:                    String(pm.pm_id ?? ""),
        pm_payment_method:        String(pm.pm_payment_method ?? ""),
      }));
    }
  };

  const closeDrawer = () => {
    setDrawer({ open: false, isEdit: false });
    setFieldErrors({});
  };

  /* ── Avatar ── */
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((f) => ({
      ...f,
      avatar_file: file,
      avatar_preview: URL.createObjectURL(file),
    }));
  };

  /* ── Allowed companies toggle ── */
  const toggleCompany = (id: number) => {
    setForm((f) => ({
      ...f,
      allowed_companies: f.allowed_companies.includes(id)
        ? f.allowed_companies.filter((c) => c !== id)
        : [...f.allowed_companies, id],
    }));
  };

  /* ── Save ── */
  const handleSave = async () => {
    const errs: FieldErrors = {};
    if (!form.u_fullname.trim()) errs.u_fullname = "Full name is required";
    if (!form.u_username.trim()) errs.u_username = "Username is required";
    if (!drawer.isEdit && !form.password.trim())
      errs.password = "Password is required for new users";
    if (!form.u_user_type) errs.u_user_type = "User type is required";
    if (!form.fk_role_id)  errs.fk_role_id  = "Role is required";
    if (!form.u_email.trim()) errs.u_email = "Email is required";
    if (!form.u_date_birth)   errs.u_date_birth = "Date of birth is required";
    if (!form.u_employment_date) errs.u_employment_date = "Employment date is required";

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      if (INFO_REQ.some((f) => !!errs[f]))            setActiveTab("info");
      else if (PERSONAL_REQ.some((f) => !!errs[f]))   setActiveTab("personal");
      else                                             setActiveTab("employment");
      return;
    }

    setFieldErrors({});
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("user_id", user_id || "");
      fd.append("g_hash",  g_hash  || "");
      if (form.id)  fd.append("id",       String(form.id));
      if (!form.id) fd.append("store_id", store_id || "");

      fd.append("u_fullname",        form.u_fullname);
      fd.append("u_username",        form.u_username);
      if (form.password) fd.append("password", form.password);
      fd.append("u_attendance_code", form.u_attendance_code);
      fd.append("u_user_type",       form.u_user_type);
      fd.append("fk_role_id",        form.fk_role_id);
      fd.append("u_lang_id",         form.u_lang_id);
      fd.append("u_address",         form.u_address);
      fd.append("u_is_active",       form.u_is_active ? "1" : "0");
      fd.append("allowed_companies", JSON.stringify(form.allowed_companies));
      if (form.avatar_file) fd.append("u_profile_pic", form.avatar_file);

      fd.append("u_gender",                  form.u_gender);
      fd.append("u_residential_area",        form.u_residential_area);
      fd.append("u_email",                   form.u_email);
      fd.append("u_date_birth",              form.u_date_birth);
      fd.append("u_mobile",                  form.u_mobile);
      fd.append("u_phone",                   form.u_phone);
      fd.append("u_fax",                     form.u_fax);
      fd.append("u_website",                 form.u_website);
      fd.append("u_marital_status",          form.u_marital_status);
      fd.append("u_number_of_dependencies",  form.u_number_of_dependencies);

      fd.append("fk_company_id",       form.fk_company_id);
      fd.append("u_department_id",     form.u_department_id);
      fd.append("fk_warehouse_id",     form.fk_warehouse_id);
      fd.append("u_job_role_id",       form.u_job_role_id);
      fd.append("u_job_title_id",      form.u_job_title_id);
      fd.append("u_employee_type",     form.u_employee_type);
      fd.append("u_employment_date",   form.u_employment_date);
      fd.append("u_daily_working_hours", form.u_daily_working_hours);
      fd.append("u_user_sallary",      form.u_user_sallary);
      fd.append("u_sales_commission",  form.u_sales_commission);
      fd.append("u_hourly_rate",       form.u_hourly_rate);
      fd.append("u_number_holidays",   form.u_number_holidays);
      fd.append("u_has_insurance",     form.u_has_insurance ? "1" : "0");
      fd.append("u_cnss_number",       form.u_cnss_number);
      fd.append("pm_id",               form.pm_id);
      fd.append("pm_payment_method",   form.pm_payment_method);

      const { data } = await api.post(
        `${API}/request/api/saveuser`,
        fd
      );

      if (data.is_error === 0) {
        closeDrawer();
        loadUsers(currentPage, search);
      } else {
        setError(data.error_msg || "Failed to save user.");
      }
    } catch {
      setError("Request failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /* ── Field helper ── */
  const setField =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      if (fieldErrors[key])
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
    };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-6">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs text-gray-500">Admin · Staff</div>
            <h1 className="text-3xl font-extrabold text-gray-900">Users</h1>
            <p className="mt-0.5 text-sm text-gray-600">
              Manage system users and access.
            </p>
          </div>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-500 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:brightness-105"
          >
            <Plus className="h-4 w-4" /> Add User
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard icon={<Users className="h-6 w-6 text-indigo-500" />}  title="Total Users" value={totalRecords} />
          <SummaryCard icon={<Shield className="h-6 w-6 text-emerald-500" />} title="Active"      value={totalActive} />
          <SummaryCard icon={<User className="h-6 w-6 text-purple-500" />}   title="Inactive"    value={totalInactive} />
        </div>

        {/* Search */}
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, username or email…"
            className="w-full rounded-2xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 focus:outline-none"
          />
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm">
          {loading ? (
            <div className="py-16 text-center text-gray-400">Loading…</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500 border-b border-gray-200">
                <tr className="[&>th]:py-3 [&>th]:px-4 font-medium">
                  <th>User</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="[&>td]:px-4 [&>td]:py-3 hover:bg-gray-50 transition-colors"
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        {u.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={u.avatar_url}
                            alt={u.fullname}
                            className="h-9 w-9 rounded-full object-cover ring-2 ring-white shadow-sm"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                            {u.fullname.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-semibold text-gray-900">{u.fullname}</span>
                      </div>
                    </td>
                    <td className="text-gray-600">{u.username}</td>
                    <td className="text-gray-600">{u.email || "—"}</td>
                    <td className="text-gray-600">{u.phone || "—"}</td>
                    <td>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
                          u.is_active === 1
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : "bg-gray-100 text-gray-500 ring-gray-200"
                        }`}
                      >
                        {u.is_active === 1 ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => openEdit(u)}
                        className="rounded-lg border border-gray-200 bg-white p-1.5 hover:bg-gray-50"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5 text-gray-600" />
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-14 text-center text-gray-400">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-500">
                Page <span className="font-semibold">{currentPage}</span> of{" "}
                <span className="font-semibold">{totalPages}</span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-600" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (totalPages <= 7) return true;
                    if (p === 1 || p === totalPages) return true;
                    if (Math.abs(p - currentPage) <= 2) return true;
                    return false;
                  })
                  .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1)
                      acc.push("…");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === "…" ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-gray-400 text-sm">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => goToPage(p as number)}
                        disabled={loading}
                        className={`min-w-[32px] rounded-lg border px-2 py-1 text-xs font-medium transition ${
                          p === currentPage
                            ? "border-indigo-500 bg-indigo-600 text-white"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        } disabled:cursor-not-allowed`}
                      >
                        {p}
                      </button>
                    )
                  )}

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                  className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 pt-2">
          © {new Date().getFullYear()}{" "}
          <span className="font-semibold">TitanPOS®</span> — Staff Management
        </p>
      </div>

      {/* ── Drawer ── */}
      {drawer.open && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/30" onClick={closeDrawer} />
          <div className="h-full w-full max-w-lg overflow-hidden bg-white shadow-2xl flex flex-col">

            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b px-5 py-4 shrink-0">
              <h2 className="font-bold text-gray-900">
                {drawer.isEdit ? "Edit User" : "Add New User"}
              </h2>
              <button onClick={closeDrawer} className="rounded-lg p-1 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b shrink-0">
              {TABS.map((tab) => {
                const hasErr = tabHasError(tab.key, fieldErrors);
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-2.5 text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1 ${
                      activeTab === tab.key
                        ? "border-b-2 border-indigo-600 text-indigo-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab.label}
                    {hasErr && (
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-auto p-5">
              {loadingDropdowns && (
                <div className="mb-3 text-xs text-indigo-500 text-center animate-pulse">
                  Loading form data…
                </div>
              )}

              {error && (
                <div className="mb-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* ── Tab 1: User Info ── */}
              {activeTab === "info" && (
                <div className="space-y-4">
                  {/* Avatar */}
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="h-20 w-20 rounded-full overflow-hidden ring-2 ring-indigo-200 cursor-pointer bg-indigo-50 flex items-center justify-center"
                      onClick={() => fileRef.current?.click()}
                    >
                      {form.avatar_preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={form.avatar_preview} alt="avatar" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-8 w-8 text-indigo-300" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      {form.avatar_preview ? "Change Photo" : "Upload Photo"}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Field label="Full Name *">
                        <input value={form.u_fullname} onChange={setField("u_fullname")} className={inputCls(fieldErrors.u_fullname)} placeholder="John Doe" />
                        {fieldErrors.u_fullname && <ErrMsg msg={fieldErrors.u_fullname} />}
                      </Field>
                    </div>

                    <div>
                      <Field label="Username *">
                        <input value={form.u_username} onChange={setField("u_username")} className={inputCls(fieldErrors.u_username)} placeholder="johndoe" />
                        {fieldErrors.u_username && <ErrMsg msg={fieldErrors.u_username} />}
                      </Field>
                    </div>

                    <div>
                      <Field label={drawer.isEdit ? "Password (leave blank to keep)" : "Password *"}>
                        <input type="password" value={form.password} onChange={setField("password")} className={inputCls(fieldErrors.password)} placeholder="••••••••" />
                        {fieldErrors.password && <ErrMsg msg={fieldErrors.password} />}
                      </Field>
                    </div>

                    <div>
                      <Field label="Attendance PIN (5-digit)">
                        <input value={form.u_attendance_code} onChange={setField("u_attendance_code")} className={INPUT} maxLength={5} placeholder="12345" />
                      </Field>
                    </div>

                    <div>
                      <Field label="User Type *">
                        <select value={form.u_user_type} onChange={setField("u_user_type")} className={inputCls(fieldErrors.u_user_type)}>
                          <option value="">— Select —</option>
                          {userTypesState.items.map((t) => (
                            <option key={t.ut_id} value={t.ut_id}>{t.ut_user_type}</option>
                          ))}
                        </select>
                        {fieldErrors.u_user_type && <ErrMsg msg={fieldErrors.u_user_type} />}
                      </Field>
                    </div>

                    <div>
                      <Field label="Role *">
                        <select value={form.fk_role_id} onChange={setField("fk_role_id")} className={inputCls(fieldErrors.fk_role_id)}>
                          <option value="">— Select —</option>
                          {rolesState.items.map((r) => (
                            <option key={r.role_id} value={r.role_id}>{r.role_name}</option>
                          ))}
                        </select>
                        {fieldErrors.fk_role_id && <ErrMsg msg={fieldErrors.fk_role_id} />}
                      </Field>
                    </div>

                    <div>
                      <Field label="Language">
                        <select value={form.u_lang_id} onChange={setField("u_lang_id")} className={INPUT}>
                          <option value="">— Select —</option>
                          {langsState.items.map((l) => (
                            <option key={l.lm_id} value={l.lm_id}>{l.lm_lang_name}</option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    <div className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id="u_is_active"
                        checked={form.u_is_active}
                        onChange={(e) => setForm((f) => ({ ...f, u_is_active: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                      />
                      <label htmlFor="u_is_active" className="text-sm text-gray-700 select-none">Active User</label>
                    </div>

                    <div className="col-span-2">
                      <Field label="Address">
                        <textarea value={form.u_address} onChange={setField("u_address")} className={INPUT + " resize-none"} rows={2} placeholder="Street, City, Country" />
                      </Field>
                    </div>

                    {/* Allowed Companies */}
                    {companiesState.items.length > 0 && (
                      <div className="col-span-2">
                        <label className="text-xs text-gray-600 mb-1 block">Allowed Companies</label>
                        <div className="max-h-32 overflow-auto rounded-lg border border-gray-200 p-2 space-y-1">
                          {companiesState.items.map((c) => (
                            <label key={c.cd_id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                              <input
                                type="checkbox"
                                checked={form.allowed_companies.includes(c.cd_id)}
                                onChange={() => toggleCompany(c.cd_id)}
                                className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600"
                              />
                              <span className="text-gray-700">{c.cd_company_name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Tab 2: Personal ── */}
              {activeTab === "personal" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Field label="Gender">
                      <select value={form.u_gender} onChange={setField("u_gender")} className={INPUT}>
                        <option value="">— Select —</option>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="O">Other</option>
                      </select>
                    </Field>
                  </div>

                  <div>
                    <Field label="Date of Birth *">
                      <input type="date" value={form.u_date_birth} onChange={setField("u_date_birth")} className={inputCls(fieldErrors.u_date_birth)} />
                      {fieldErrors.u_date_birth && <ErrMsg msg={fieldErrors.u_date_birth} />}
                    </Field>
                  </div>

                  <div>
                    <Field label="Email *">
                      <input type="email" value={form.u_email} onChange={setField("u_email")} className={inputCls(fieldErrors.u_email)} placeholder="john@example.com" />
                      {fieldErrors.u_email && <ErrMsg msg={fieldErrors.u_email} />}
                    </Field>
                  </div>

                  <div>
                    <Field label="Phone">
                      <input value={form.u_phone} onChange={setField("u_phone")} className={INPUT} placeholder="+1 234 567 8900" />
                    </Field>
                  </div>

                  <div>
                    <Field label="Mobile">
                      <input value={form.u_mobile} onChange={setField("u_mobile")} className={INPUT} placeholder="+1 234 567 8900" />
                    </Field>
                  </div>

                  <div>
                    <Field label="Fax">
                      <input value={form.u_fax} onChange={setField("u_fax")} className={INPUT} placeholder="Fax number" />
                    </Field>
                  </div>

                  <div className="col-span-2">
                    <Field label="Website">
                      <input value={form.u_website} onChange={setField("u_website")} className={INPUT} placeholder="https://example.com" />
                    </Field>
                  </div>

                  <div>
                    <Field label="Marital Status">
                      <select value={form.u_marital_status} onChange={setField("u_marital_status")} className={INPUT}>
                        <option value="">— Select —</option>
                        <option value="1">Single</option>
                        <option value="2">Married</option>
                        <option value="3">Divorced</option>
                        <option value="4">Widowed</option>
                        <option value="5">Other</option>
                      </select>
                    </Field>
                  </div>

                  <div>
                    <Field label="No. of Dependents">
                      <input type="number" min="0" value={form.u_number_of_dependencies} onChange={setField("u_number_of_dependencies")} className={INPUT} placeholder="0" />
                    </Field>
                  </div>

                  <div className="col-span-2">
                    <Field label="Residential Area">
                      <input value={form.u_residential_area} onChange={setField("u_residential_area")} className={INPUT} placeholder="City / Area" />
                    </Field>
                  </div>
                </div>
              )}

              {/* ── Tab 3: Employment ── */}
              {activeTab === "employment" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Field label="Company">
                      <select value={form.fk_company_id} onChange={setField("fk_company_id")} className={INPUT}>
                        <option value="">— Select —</option>
                        {companiesState.items.map((c) => (
                          <option key={c.cd_id} value={c.cd_id}>{c.cd_company_name}</option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div>
                    <Field label="Department">
                      <select value={form.u_department_id} onChange={setField("u_department_id")} className={INPUT}>
                        <option value="">— Select —</option>
                        {departmentsState.items.map((d) => (
                          <option key={d.sd_id} value={d.sd_id}>{d.sd_department_title}</option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div>
                    <Field label="Warehouse">
                      <select value={form.fk_warehouse_id} onChange={setField("fk_warehouse_id")} className={INPUT}>
                        <option value="">— Select —</option>
                        {warehousesState.items.map((w) => (
                          <option key={w.w_id} value={w.w_id}>{w.w_warehouse_name}</option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div>
                    <Field label="Job Role">
                      <select value={form.u_job_role_id} onChange={setField("u_job_role_id")} className={INPUT}>
                        <option value="">— Select —</option>
                        {jobRolesState.items.map((r) => (
                          <option key={r.jr_id} value={r.jr_id}>{r.jr_job_role}</option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div>
                    <Field label="Job Title">
                      <select value={form.u_job_title_id} onChange={setField("u_job_title_id")} className={INPUT}>
                        <option value="">— Select —</option>
                        {jobTitlesState.items.map((t) => (
                          <option key={t.jt_id} value={t.jt_id}>{t.jt_job_title}</option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div>
                    <Field label="Employee Type">
                      <select value={form.u_employee_type} onChange={setField("u_employee_type")} className={INPUT}>
                        <option value="">— Select —</option>
                        {employmentTypesState.items.map((e) => (
                          <option key={e.et_id} value={e.et_id}>{e.et_type}</option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div>
                    <Field label="Employment Date *">
                      <input type="date" value={form.u_employment_date} onChange={setField("u_employment_date")} className={inputCls(fieldErrors.u_employment_date)} />
                      {fieldErrors.u_employment_date && <ErrMsg msg={fieldErrors.u_employment_date} />}
                    </Field>
                  </div>

                  <div>
                    <Field label="Daily Working Hours">
                      <input type="number" step="0.5" min="0" value={form.u_daily_working_hours} onChange={setField("u_daily_working_hours")} className={INPUT} placeholder="9.5" />
                    </Field>
                  </div>

                  <div>
                    <Field label="Salary">
                      <input type="number" min="0" value={form.u_user_sallary} onChange={setField("u_user_sallary")} className={INPUT} placeholder="0.00" />
                    </Field>
                  </div>

                  <div>
                    <Field label="Sales Commission (%)">
                      <input type="number" min="0" max="100" value={form.u_sales_commission} onChange={setField("u_sales_commission")} className={INPUT} placeholder="0" />
                    </Field>
                  </div>

                  <div>
                    <Field label="Hourly Rate">
                      <input type="number" min="0" value={form.u_hourly_rate} onChange={setField("u_hourly_rate")} className={INPUT} placeholder="0.00" />
                    </Field>
                  </div>

                  <div>
                    <Field label="Number of Holidays">
                      <input type="number" min="0" value={form.u_number_holidays} onChange={setField("u_number_holidays")} className={INPUT} placeholder="0" />
                    </Field>
                  </div>

                  <div>
                    <Field label="CNSS Number">
                      <input value={form.u_cnss_number} onChange={setField("u_cnss_number")} className={INPUT} placeholder="CNSS number" />
                    </Field>
                  </div>

                  <div>
                    <Field label="Payment Method">
                      <select value={form.pm_payment_method} onChange={setField("pm_payment_method")} className={INPUT}>
                        <option value="">— Select —</option>
                        {paymentTypesState.items.map((p) => (
                          <option key={p.pt_id} value={p.pt_id}>{p.pt_payment_type}</option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div className="col-span-2 flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="u_has_insurance"
                      checked={form.u_has_insurance}
                      onChange={(e) => setForm((f) => ({ ...f, u_has_insurance: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                    />
                    <label htmlFor="u_has_insurance" className="text-sm text-gray-700 select-none">Has Insurance</label>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="flex justify-end gap-2 border-t px-5 py-4 shrink-0">
              <button onClick={closeDrawer} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Helpers ── */
const INPUT =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none";

const inputCls = (err?: string) =>
  `mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
    err
      ? "border-red-400 bg-red-50 focus:border-red-400"
      : "border-gray-200 focus:border-indigo-400"
  }`;

function ErrMsg({ msg }: { msg: string }) {
  return <p className="mt-1 text-xs text-red-500">{msg}</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-gray-600">{label}</label>
      {children}
    </div>
  );
}

function SummaryCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm p-4 flex items-center gap-3">
      <div className="rounded-xl bg-indigo-50 p-3">{icon}</div>
      <div>
        <div className="text-xs text-gray-500">{title}</div>
        <div className="text-lg font-bold text-gray-900">{value}</div>
      </div>
    </div>
  );
}
