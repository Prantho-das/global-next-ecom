"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DragEvent, FormEvent } from "react";

import {
  reorderCategoriesAction,
  upsertCategoryAction,
} from "@/modules/catalog/actions";
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
  const [parentId, setParentId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const res = await upsertCategoryAction({
      name,
      parentId: parentId === "" ? null : parentId,
      position: items.length,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setName("");
    setParentId("");
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
    <div className="row">
      <div className="col s12 m5">
        <div className="card white">
          <div className="card-content">
            <span className="card-title">Add Category</span>
            {error !== null && (
              <div role="alert" className="red-text">
                {error}
              </div>
            )}
            <form onSubmit={handleCreate}>
              <div className="input-field">
                <label htmlFor="cat-name" className="active">
                  Category Name
                </label>
                <input
                  id="cat-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label htmlFor="cat-parent">Parent Category</label>
                <select
                  id="cat-parent"
                  className="browser-default"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
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
                className="btn waves-effect waves-light"
                disabled={saving}
              >
                {saving ? "Saving..." : "Create Category"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="col s12 m7">
        <div className="card white">
          <div className="card-content">
            <span className="card-title">
              Category Tree (Drag &amp; Drop Reorder)
            </span>
            {items.length === 0 ? (
              <p className="grey-text">No categories created yet.</p>
            ) : (
              <ul className="collection">
                {items.map((cat) => (
                  <li
                    key={cat.id}
                    draggable
                    onDragStart={() => handleDragStart(cat.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, cat.id)}
                    className="collection-item"
                    style={{
                      paddingLeft: `${16 + cat.depth * 24}px`,
                      cursor: "grab",
                    }}
                  >
                    <strong>{cat.name}</strong>{" "}
                    <span className="grey-text">({cat.path})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
