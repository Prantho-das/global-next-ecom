"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DragEvent, FormEvent } from "react";

import {
  reorderCategoriesAction,
  upsertCategoryAction,
} from "@/modules/catalog/actions";
import { slugify } from "@/modules/catalog/service";
import type { CategoryNode } from "@/modules/catalog/types";

export interface CategoriesManagerProps {
  initialCategories: readonly CategoryNode[];
}

export function CategoriesManager({
  initialCategories,
}: CategoriesManagerProps) {
  const router = useRouter();
  const [items, setItems] = useState<CategoryNode[]>([...initialCategories]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [parentId, setParentId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const res = await upsertCategoryAction({
      name,
      slug: slug.trim() || undefined,
      status,
      parentId: parentId === "" ? null : parentId,
      position: items.length,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setName("");
    setSlug("");
    setSlugTouched(false);
    setStatus("active");
    setParentId("");
    router.refresh();
  }

  async function handleToggleStatus(cat: CategoryNode) {
    const nextStatus = cat.status === "active" ? "inactive" : "active";
    const res = await upsertCategoryAction({
      id: cat.id,
      parentId: cat.parentId,
      name: cat.name,
      slug: cat.slug,
      status: nextStatus,
      position: cat.position,
    });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setItems((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, status: nextStatus } : c)),
    );
    router.refresh();
  }

  function handleDragStart(id: string) {
    setDraggedId(id);
  }

  async function handleDrop(
    event: DragEvent<HTMLLIElement>,
    targetId: string,
  ) {
    event.preventDefault();
    if (draggedId === null || draggedId === targetId) {
      return;
    }
    const next = [...items];
    const fromIdx = next.findIndex((c) => c.id === draggedId);
    const toIdx = next.findIndex((c) => c.id === targetId);
    if (fromIdx === -1 || toIdx === -1) {
      return;
    }
    const [moved] = next.splice(fromIdx, 1);
    if (moved === undefined) {
      return;
    }
    next.splice(toIdx, 0, moved);
    setItems(next);
    setDraggedId(null);

    const res = await reorderCategoriesAction({
      items: next.map((cat, idx) => ({
        id: cat.id,
        parentId: cat.parentId,
        position: idx,
      })),
    });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-5">
        <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 m-0">
            Add Category
          </h3>
          {error !== null && (
            <div
              role="alert"
              className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"
            >
              {error}
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label
                htmlFor="cat-name"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1"
              >
                Category Name
              </label>
              <input
                id="cat-name"
                type="text"
                required
                value={name}
                onChange={(e) => {
                  const val = e.target.value;
                  setName(val);
                  if (!slugTouched) {
                    setSlug(slugify(val));
                  }
                }}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
            <div>
              <label
                htmlFor="cat-slug"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1"
              >
                Category Slug
              </label>
              <input
                id="cat-slug"
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                placeholder="auto-generated-from-name"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
            <div>
              <label
                htmlFor="cat-status"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1"
              >
                Status
              </label>
              <select
                id="cat-status"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "active" | "inactive")
                }
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="cat-parent"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1"
              >
                Parent Category
              </label>
              <select
                id="cat-parent"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              >
                <option value="">None (Root)</option>
                {items.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {"— ".repeat(cat.depth)}
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-sm rounded shadow-sm transition"
            >
              {saving ? "Saving..." : "Create Category"}
            </button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-7">
        <div className="bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200/80">
            <h3 className="text-base font-bold text-slate-900 m-0">
              Category Tree ({items.length})
            </h3>
            <p className="text-xs text-slate-500 m-0">
              Drag &amp; drop items to reorder hierarchy; click status to toggle
            </p>
          </div>
          {items.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">
              No categories created yet.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 m-0 p-0 list-none">
              {items.map((cat) => (
                <li
                  key={cat.id}
                  draggable
                  onDragStart={() => handleDragStart(cat.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, cat.id)}
                  style={{ paddingLeft: `${16 + cat.depth * 20}px` }}
                  className="py-2.5 pr-4 flex items-center justify-between gap-2 hover:bg-slate-50 cursor-grab transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <i className="ti ti-grip-vertical text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-900 truncate">
                      {cat.name}
                    </span>
                    <span className="text-xs font-mono text-slate-400 truncate">
                      /{cat.slug}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(cat)}
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0 cursor-pointer ${
                      cat.status === "active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {cat.status}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
