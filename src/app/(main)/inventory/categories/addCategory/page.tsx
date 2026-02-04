"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import axios from "axios";
import { ArrowLeft, Save } from "lucide-react";
import { useAppSelector } from "@/store/hooks";

type FormErrors = {
  pc_category?: string;
  general?: string;
};

export default function AddCategoryPage() {
  const router = useRouter();

  const [pcCategory, setPcCategory] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const auth = useAppSelector((s) => s.auth.loginData);
  const g_hash = auth.g_hash;
  const user_id = auth.user_id;


  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!pcCategory.trim()) {
      newErrors.pc_category = "Category name is required";
    } else if (pcCategory.trim().length < 2) {
      newErrors.pc_category = "Category name must be at least 2 characters";
    } else if (pcCategory.trim().length > 255) {
      newErrors.pc_category = "Category name must not exceed 255 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (!user_id || !g_hash) {
      setErrors({
        general: "Authentication data missing. Please login again.",
      });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await axios.post(
        process.env.NEXT_PUBLIC_API_LINK +
          "/request/api/saveproductcategoryinfo",
        {
          user_id,
          g_hash,
          pc_category: pcCategory.trim(),
          pc_description: description.trim(),
          fk_pc_id: 0,
          pc_show_on_pos: 1, 
        }
      );

      router.push("/inventory/categories");
    } catch {
      setErrors({
        general: "Failed to save category. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
              Add Category
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Create a new inventory category
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-200"
        >
          {errors.general && (
            <div className="mb-6 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {errors.general}
            </div>
          )}

          <div className="mb-6">
            <label
              htmlFor="pc_category"
              className="block text-sm font-semibold text-gray-700"
            >
              Category Name
            </label>

            <input
              id="pc_category"
              value={pcCategory}
              onChange={(e) => setPcCategory(e.target.value)}
              placeholder="e.g. Beverages"
              className={`mt-2 w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition
                ${
                  errors.pc_category
                    ? "border-rose-500 focus:ring-rose-200"
                    : "border-gray-300 focus:border-orange-400 focus:ring-orange-200"
                }`}
            />

            {errors.pc_category && (
              <p className="mt-1 text-xs font-semibold text-rose-600">
                {errors.pc_category}
              </p>
            )}
          </div>

          <div className="mb-8">
            <label
              htmlFor="description"
              className="block text-sm font-semibold text-gray-700"
            >
              Description{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>

            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Internal description for this category"
              className="mt-2 w-full resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-orange-200"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-xl border px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {loading ? "Saving..." : "Save Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
