"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { deleteBrandAction, upsertBrandAction } from "@/modules/catalog/actions";
import type { BrandItem } from "@/modules/catalog/types";

export interface BrandsManagerProps {
  initialBrands: readonly BrandItem[];
}

export function BrandsManager({ initialBrands }: BrandsManagerProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const res = await upsertBrandAction({
      name,
      slug: slug.trim() || undefined,
      logoUrl: logoUrl.trim() || null,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setName("");
    setSlug("");
    setLogoUrl("");
    router.refresh();
  }

  async function handleDelete(id: string) {
    const res = await deleteBrandAction({ id });
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
            <span className="card-title">Add Brand</span>
            {error !== null && (
              <div role="alert" className="red-text">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="input-field">
                <label htmlFor="brand-name" className="active">
                  Brand Name
                </label>
                <input
                  id="brand-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="input-field">
                <label htmlFor="brand-slug" className="active">
                  Slug (optional)
                </label>
                <input
                  id="brand-slug"
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
              </div>
              <div className="input-field">
                <label htmlFor="brand-logo" className="active">
                  Logo URL (optional)
                </label>
                <input
                  id="brand-logo"
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn waves-effect waves-light"
                disabled={loading}
              >
                {loading ? "Saving..." : "Create Brand"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="col s12 m7">
        <div className="card white">
          <div className="card-content">
            <span className="card-title">Brands ({initialBrands.length})</span>
            {initialBrands.length === 0 ? (
              <p className="grey-text">No brands created yet.</p>
            ) : (
              <table className="striped responsive-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {initialBrands.map((brand) => (
                    <tr key={brand.id}>
                      <td>{brand.name}</td>
                      <td>{brand.slug}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-small red lighten-1"
                          onClick={() => handleDelete(brand.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
