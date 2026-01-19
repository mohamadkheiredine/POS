"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Boxes,
  Pencil,
  Trash2,
  Layers,
} from "lucide-react";

type Category = {
  pc_id: number;
  title: string;
  description?: string;
  show_on_pos: number;
};

export default function CategoriesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    setLoading(true);
    setErrorMsg("");

    axios
      .get(
        process.env.NEXT_PUBLIC_API_LINK +
          "/request/api/products/getlistcategories",
        {
          params: {
            user_id: Number(localStorage.getItem("user_id")),
            g_hash: localStorage.getItem("g_hash"),
            category_id: 0,
          },
        }
      )
      .then((res) => {
        const raw = res.data.categories || {};
        const list: Category[] = Object.values(raw);
        setCategories(list);
      })
      .catch(() => setErrorMsg("Failed to load categories"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return categories.filter((c) =>
      c.title.toLowerCase().includes(q.toLowerCase())
    );
  }, [categories, q]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const deleteCategory = async (pc_id: number) => {
    if (!confirm("Delete this category?")) return;

    await axios.delete(
      process.env.NEXT_PUBLIC_API_LINK + "/request/api/deletecategory",
      {
        params: {
          user_id: Number(localStorage.getItem("user_id")),
          g_hash: localStorage.getItem("g_hash"),
          category_id: pc_id,
        },
      }
    );

    setCategories((prev) => prev.filter((c) => c.pc_id !== pc_id));
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white px-4 py-6">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
              Inventory · Categories
            </h1>
            <p className="text-sm text-gray-600">Manage product categories</p>

            {loading && (
              <p className="mt-2 text-sm text-gray-500">Loading categories…</p>
            )}

            {!!errorMsg && (
              <p className="mt-2 text-sm font-semibold text-rose-700">
                {errorMsg}
              </p>
            )}
          </div>

          <button
            onClick={() => router.push("/inventory/categories/addCategory")}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" /> Add Category
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search category…"
              className="w-72 rounded-2xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-white text-left text-gray-500">
              <tr className="[&>th]:py-3 [&>th]:px-3">
                <th>Category</th>
                <th>Description</th>
                <th className="text-right"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {pageItems.map((c) => (
                <tr key={c.pc_id} className="[&>td]:px-3 [&>td]:py-3">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-gray-50 text-gray-400">
                        <Boxes className="h-5 w-5" />
                      </div>
                      <div className="font-semibold text-gray-900">
                        {c.title}
                      </div>
                    </div>
                  </td>

                  <td className="text-gray-600">{c.description || "—"}</td>


                  <td className="text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() =>
                          router.push(
                            `/inventory/categories/${c.pc_id}/products`
                          )
                        }
                        className="rounded-lg border px-2 py-1 text-xs"
                        title="View products"
                      >
                        <Layers className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() =>
                          router.push(
                            `/inventory/categories/${c.pc_id}/edit`
                          )
                        }
                        className="rounded-lg border px-2 py-1 text-xs"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => deleteCategory(c.pc_id)}
                        className="rounded-lg border px-2 py-1 text-xs text-rose-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {pageItems.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-14 text-center text-sm text-gray-500"
                  >
                    No categories found…
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <div className="text-gray-600">
              Page {page} / {pages} · {filtered.length} category(s)
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>

              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 disabled:opacity-50"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500">
          © {new Date().getFullYear()}{" "}
          <span className="font-semibold">TitanPOS®</span>
        </p>
      </div>
    </div>
  );
}
