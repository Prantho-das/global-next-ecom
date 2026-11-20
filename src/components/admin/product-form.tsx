"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { formatBdt } from "@/lib/money";
import { upsertProductAction } from "@/modules/catalog/actions";
import {
  generateVariantCombinations,
  slugify,
} from "@/modules/catalog/service";
import type {
  BrandItem,
  CategoryNode,
  OptionDraft,
  ProductStatus,
  VariantDraft,
} from "@/modules/catalog/types";
import { MAX_PRODUCT_OPTIONS } from "@/modules/catalog/validators";

export interface ProductFormProps {
  brands: readonly BrandItem[];
  categories: readonly CategoryNode[];
  initialProduct?: {
    id: string;
    name: string;
    slug: string;
    status: ProductStatus;
    brandId: string | null;
    categoryIds: string[];
    description: string;
    basePrice: number;
    salePrice: number | null;
    compareAtPrice: number | null;
    hasVariants: boolean;
    options: OptionDraft[];
    variants: VariantDraft[];
    seoTitle: string;
    seoDescription: string;
    vendor: string;
    productType: string;
    tags: string[];
  };
}

export function ProductForm({
  brands,
  categories,
  initialProduct,
}: ProductFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialProduct?.name ?? "");
  const [slug, setSlug] = useState(initialProduct?.slug ?? "");
  const [status, setStatus] = useState<ProductStatus>(
    initialProduct?.status ?? "draft",
  );
  const [brandId, setBrandId] = useState(initialProduct?.brandId ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(
    initialProduct?.categoryIds ?? [],
  );
  const [description, setDescription] = useState(
    initialProduct?.description ?? "",
  );
  const [basePrice, setBasePrice] = useState(
    initialProduct?.basePrice ?? 0,
  );
  const [salePrice, setSalePrice] = useState<string>(
    initialProduct?.salePrice !== null &&
      initialProduct?.salePrice !== undefined
      ? String(initialProduct.salePrice)
      : "",
  );
  const [compareAtPrice, setCompareAtPrice] = useState<string>(
    initialProduct?.compareAtPrice !== null &&
      initialProduct?.compareAtPrice !== undefined
      ? String(initialProduct.compareAtPrice)
      : "",
  );
  const [hasVariants, setHasVariants] = useState(
    initialProduct?.hasVariants ?? false,
  );
  const [options, setOptions] = useState<OptionDraft[]>(
    initialProduct?.options ?? [],
  );
  const [variants, setVariants] = useState<VariantDraft[]>(
    initialProduct?.variants ?? [
      {
        sku: "SKU-1",
        price: 0,
        compareAtPrice: null,
        costPrice: null,
        stock: 0,
        weightG: 0,
        barcode: null,
        optionValues: {},
        imageId: null,
        isDefault: true,
      },
    ],
  );
  const [seoTitle, setSeoTitle] = useState(initialProduct?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(
    initialProduct?.seoDescription ?? "",
  );
  const [vendor, setVendor] = useState(initialProduct?.vendor ?? "");
  const [productType, setProductType] = useState(
    initialProduct?.productType ?? "",
  );
  const [tagsText, setTagsText] = useState(
    initialProduct?.tags.join(", ") ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function rebuildVariants(nextOptions: OptionDraft[], nextHasVariants: boolean) {
    try {
      const generated = generateVariantCombinations({
        baseSku: slug || slugify(name || "item"),
        basePrice,
        hasVariants: nextHasVariants,
        options: nextOptions,
        existingVariants: variants,
      });
      setVariants(generated);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to build variants");
    }
  }

  function addOption() {
    if (options.length >= MAX_PRODUCT_OPTIONS) {
      return;
    }
    const next = [...options, { name: `Option ${options.length + 1}`, values: ["Default"] }];
    setOptions(next);
    rebuildVariants(next, true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const res = await upsertProductAction({
      id: initialProduct?.id,
      name,
      slug: slug.trim() || undefined,
      status,
      brandId: brandId === "" ? null : brandId,
      categoryIds,
      description,
      basePrice,
      salePrice: salePrice.trim() ? Number.parseInt(salePrice, 10) : null,
      compareAtPrice: compareAtPrice.trim()
        ? Number.parseInt(compareAtPrice, 10)
        : null,
      hasVariants,
      options: hasVariants ? options : [],
      variants,
      images: [],
      seo: {
        title: seoTitle.trim() || undefined,
        description: seoDescription.trim() || undefined,
      },
      vendor: vendor.trim() || null,
      productType: productType.trim() || null,
      tags: tagsText
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      {error !== null && (
        <div
          role="alert"
          className="card-panel red lighten-5 red-text text-darken-4"
        >
          {error}
        </div>
      )}

      <div className="row">
        <div className="col s12 l8">
          <div className="card white">
            <div className="card-content">
              <span className="card-title">Basic Info</span>
              <div className="input-field">
                <label htmlFor="prod-name" className="active">
                  Title
                </label>
                <input
                  id="prod-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setName(val);
                    if (!initialProduct) {
                      setSlug(slugify(val));
                    }
                  }}
                />
              </div>
              <div className="input-field">
                <label htmlFor="prod-desc" className="active">
                  Description
                </label>
                <textarea
                  id="prod-desc"
                  className="materialize-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="card white">
            <div className="card-content">
              <span className="card-title">Pricing (Poisha)</span>
              <div className="row">
                <div className="col s12 m4">
                  <label htmlFor="prod-base-price">
                    Base Price ({formatBdt(basePrice)})
                  </label>
                  <input
                    id="prod-base-price"
                    type="number"
                    min={0}
                    required
                    value={basePrice}
                    onChange={(e) =>
                      setBasePrice(Number.parseInt(e.target.value || "0", 10))
                    }
                  />
                </div>
                <div className="col s12 m4">
                  <label htmlFor="prod-sale-price">Sale Price</label>
                  <input
                    id="prod-sale-price"
                    type="number"
                    min={0}
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                  />
                </div>
                <div className="col s12 m4">
                  <label htmlFor="prod-compare-price">Compare-at Price</label>
                  <input
                    id="prod-compare-price"
                    type="number"
                    min={0}
                    value={compareAtPrice}
                    onChange={(e) => setCompareAtPrice(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card white">
            <div className="card-content">
              <span className="card-title">Options &amp; Variants</span>
              <label>
                <input
                  type="checkbox"
                  checked={hasVariants}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setHasVariants(checked);
                    if (!checked) {
                      rebuildVariants([], false);
                    }
                  }}
                />
                <span>This product has variants (max {MAX_PRODUCT_OPTIONS} options)</span>
              </label>

              {hasVariants && (
                <div style={{ marginTop: "16px" }}>
                  {options.map((opt, idx) => (
                    <div key={idx} className="row">
                      <div className="col s5">
                        <input
                          type="text"
                          aria-label={`Option ${idx + 1} name`}
                          value={opt.name}
                          onChange={(e) => {
                            const next = [...options];
                            next[idx] = { ...opt, name: e.target.value };
                            setOptions(next);
                          }}
                        />
                      </div>
                      <div className="col s7">
                        <input
                          type="text"
                          aria-label={`Option ${idx + 1} values`}
                          value={opt.values.join(", ")}
                          onChange={(e) => {
                            const next = [...options];
                            next[idx] = {
                              ...opt,
                              values: e.target.value
                                .split(",")
                                .map((v) => v.trim())
                                .filter((v) => v.length > 0),
                            };
                            setOptions(next);
                            rebuildVariants(next, true);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {options.length < MAX_PRODUCT_OPTIONS && (
                    <button
                      type="button"
                      className="btn-small"
                      onClick={addOption}
                    >
                      Add Option
                    </button>
                  )}
                </div>
              )}

              <table className="striped" style={{ marginTop: "16px" }}>
                <thead>
                  <tr>
                    <th>Variant</th>
                    <th>SKU</th>
                    <th>Price (Poisha)</th>
                    <th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v, idx) => (
                    <tr key={idx}>
                      <td>
                        {Object.keys(v.optionValues).length === 0
                          ? "Default"
                          : Object.values(v.optionValues).join(" / ")}
                      </td>
                      <td>
                        <input
                          type="text"
                          aria-label={`Variant ${idx + 1} SKU`}
                          value={v.sku}
                          onChange={(e) => {
                            const next = [...variants];
                            next[idx] = { ...v, sku: e.target.value };
                            setVariants(next);
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          aria-label={`Variant ${idx + 1} Price`}
                          value={v.price}
                          onChange={(e) => {
                            const next = [...variants];
                            next[idx] = {
                              ...v,
                              price: Number.parseInt(e.target.value || "0", 10),
                            };
                            setVariants(next);
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          aria-label={`Variant ${idx + 1} Stock`}
                          value={v.stock}
                          onChange={(e) => {
                            const next = [...variants];
                            next[idx] = {
                              ...v,
                              stock: Number.parseInt(e.target.value || "0", 10),
                            };
                            setVariants(next);
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card white">
            <div className="card-content">
              <span className="card-title">SEO</span>
              <div className="input-field">
                <label htmlFor="prod-slug" className="active">
                  Slug
                </label>
                <input
                  id="prod-slug"
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
              </div>
              <div className="input-field">
                <label htmlFor="prod-seo-title" className="active">
                  Meta Title ({seoTitle.length}/60)
                </label>
                <input
                  id="prod-seo-title"
                  type="text"
                  maxLength={60}
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                />
              </div>
              <div className="input-field">
                <label htmlFor="prod-seo-desc" className="active">
                  Meta Description ({seoDescription.length}/160)
                </label>
                <textarea
                  id="prod-seo-desc"
                  className="materialize-textarea"
                  maxLength={160}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                />
              </div>
              <div className="card-panel grey lighten-4">
                <strong style={{ color: "#1a0dab" }}>
                  {seoTitle || name || "Product Title"}
                </strong>
                <div style={{ color: "#006621", fontSize: "0.875rem" }}>
                  /products/{slug || "product-slug"}
                </div>
                <div style={{ color: "#545454", fontSize: "0.875rem" }}>
                  {seoDescription || "Meta description preview..."}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col s12 l4">
          <div className="card white">
            <div className="card-content">
              <span className="card-title">Organization</span>
              <div style={{ marginBottom: "12px" }}>
                <label htmlFor="prod-status">Status</label>
                <select
                  id="prod-status"
                  className="browser-default"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProductStatus)}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label htmlFor="prod-brand">Brand</label>
                <select
                  id="prod-brand"
                  className="browser-default"
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                >
                  <option value="">None</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label htmlFor="prod-cats">Categories</label>
                <select
                  id="prod-cats"
                  multiple
                  className="browser-default"
                  style={{ height: "120px" }}
                  value={categoryIds}
                  onChange={(e) =>
                    setCategoryIds(
                      Array.from(e.target.selectedOptions).map((o) => o.value),
                    )
                  }
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {"— ".repeat(c.depth)}
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="input-field">
                <label htmlFor="prod-vendor" className="active">
                  Vendor
                </label>
                <input
                  id="prod-vendor"
                  type="text"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                />
              </div>
              <div className="input-field">
                <label htmlFor="prod-type" className="active">
                  Product Type
                </label>
                <input
                  id="prod-type"
                  type="text"
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                />
              </div>
              <div className="input-field">
                <label htmlFor="prod-tags" className="active">
                  Tags (comma-separated)
                </label>
                <input
                  id="prod-tags"
                  type="text"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn waves-effect waves-light"
                disabled={saving}
                style={{ width: "100%" }}
              >
                {saving ? "Saving..." : "Save Product"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
