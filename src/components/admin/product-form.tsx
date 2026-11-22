"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { DragEvent, FormEvent, KeyboardEvent } from "react";

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

export interface ImageDraft {
  id?: string;
  url: string;
  alt: string;
  position: number;
}

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
    images?: ImageDraft[];
    options: OptionDraft[];
    variants: VariantDraft[];
    seoTitle: string;
    seoDescription: string;
    vendor: string;
    productType: string;
    tags: string[];
  };
}

const INPUT_CLS =
  "w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition";
const LABEL_CLS =
  "block text-xs font-semibold text-slate-600 mb-1";

function toTakaInput(poisha: number | null | undefined): string {
  if (poisha === null || poisha === undefined) {
    return "";
  }
  return String(Math.round(poisha) / 100);
}

function toPoisha(takaStr: string): number {
  const n = Number.parseFloat(takaStr);
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return Math.round(n * 100);
}

export function ProductForm({
  brands,
  categories,
  initialProduct,
}: ProductFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);

  const [name, setName] = useState(initialProduct?.name ?? "");
  const [slug, setSlug] = useState(initialProduct?.slug ?? "");
  const [status, setStatus] = useState<ProductStatus>(
    initialProduct?.status ?? "active",
  );
  const [brandId, setBrandId] = useState(initialProduct?.brandId ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(
    initialProduct?.categoryIds ?? [],
  );
  const [catSearch, setCatSearch] = useState("");
  const [description, setDescription] = useState(
    initialProduct?.description ?? "",
  );

  const [images, setImages] = useState<ImageDraft[]>(
    initialProduct?.images ?? [],
  );
  const [showUrlBox, setShowUrlBox] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const [basePriceTaka, setBasePriceTaka] = useState(
    initialProduct !== undefined ? toTakaInput(initialProduct.basePrice) : "0",
  );
  const [salePriceTaka, setSalePriceTaka] = useState(
    toTakaInput(initialProduct?.salePrice),
  );
  const [compareAtPriceTaka, setCompareAtPriceTaka] = useState(
    toTakaInput(initialProduct?.compareAtPrice),
  );

  const [trackQty, setTrackQty] = useState(true);
  const [continueSelling, setContinueSelling] = useState(false);
  const [isPhysical, setIsPhysical] = useState(true);
  const [weightUnit, setWeightUnit] = useState<"g" | "kg">("g");

  const [hasVariants, setHasVariants] = useState(
    initialProduct?.hasVariants ?? false,
  );
  const [options, setOptions] = useState<OptionDraft[]>(
    initialProduct?.options ?? [],
  );
  const [editingOption, setEditingOption] = useState<Record<number, boolean>>(
    {},
  );
  const [optionInputs, setOptionInputs] = useState<string[]>(
    (initialProduct?.options ?? []).map(() => ""),
  );
  const [variants, setVariants] = useState<VariantDraft[]>(
    initialProduct?.variants ?? [
      {
        sku: "",
        price: 0,
        compareAtPrice: null,
        costPrice: null,
        stock: 0,
        weightG: 500,
        barcode: null,
        optionValues: {},
        imageId: null,
        isDefault: true,
      },
    ],
  );
  const [bulkPriceTaka, setBulkPriceTaka] = useState("");
  const [bulkStock, setBulkStock] = useState("");
  const [variantImagePickerIdx, setVariantImagePickerIdx] = useState<number | null>(null);

  const [seoOpen, setSeoOpen] = useState(false);
  const [seoTitle, setSeoTitle] = useState(initialProduct?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(
    initialProduct?.seoDescription ?? "",
  );

  const [vendor, setVendor] = useState(initialProduct?.vendor ?? "");
  const [productType, setProductType] = useState(
    initialProduct?.productType ?? "",
  );
  const [tags, setTags] = useState<string[]>(initialProduct?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [onlineStore, setOnlineStore] = useState(true);
  const [posChannel, setPosChannel] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const basePricePoisha = toPoisha(basePriceTaka);
  const defaultVariant = variants.find((v) => v.isDefault) ?? variants[0];
  const effectivePoisha =
    salePriceTaka.trim() !== "" ? toPoisha(salePriceTaka) : basePricePoisha;
  const defaultCost = defaultVariant?.costPrice ?? 0;
  const profit = effectivePoisha - defaultCost;
  const marginPct =
    effectivePoisha > 0 && defaultCost > 0
      ? Math.round((profit / effectivePoisha) * 100)
      : null;

  function applyFormat(cmd: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    if (editorRef.current !== null) {
      setDescription(editorRef.current.innerHTML);
    }
  }

  async function uploadFiles(fileList: FileList | null) {
    if (fileList === null || fileList.length === 0) {
      return;
    }
    setUploading(true);
    setError(null);
    const uploaded: ImageDraft[] = [];
    for (const file of Array.from(fileList)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || data.url === undefined) {
        setError(data.error ?? `Failed to upload ${file.name}`);
      } else {
        uploaded.push({
          id: crypto.randomUUID(),
          url: data.url,
          alt: name || file.name,
          position: images.length + uploaded.length,
        });
      }
    }
    if (uploaded.length > 0) {
      setImages((prev) => [...prev, ...uploaded]);
    }
    setUploading(false);
  }

  function handleDropFiles(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    void uploadFiles(e.dataTransfer.files);
  }

  function addImageFromUrl() {
    const url = newImageUrl.trim();
    if (url === "") {
      return;
    }
    setImages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), url, alt: name, position: prev.length },
    ]);
    setNewImageUrl("");
    setShowUrlBox(false);
  }

  function removeImage(idx: number) {
    setImages((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((img, i) => ({ ...img, position: i })),
    );
  }

  function moveImageToFirst(idx: number) {
    if (idx <= 0 || idx >= images.length) {
      return;
    }
    const next = [...images];
    const [picked] = next.splice(idx, 1);
    if (picked === undefined) {
      return;
    }
    next.unshift(picked);
    setImages(next.map((img, i) => ({ ...img, position: i })));
  }

  function rebuildVariants(nextOptions: OptionDraft[], nextHasVariants: boolean) {
    const validOptions = nextOptions.filter((o) => o.values.length > 0);
    if (nextHasVariants && validOptions.length === 0) {
      return;
    }
    try {
      const generated = generateVariantCombinations({
        baseSku: slug || slugify(name || "item"),
        basePrice: basePricePoisha,
        hasVariants: nextHasVariants,
        options: validOptions,
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
    const presets = ["Size", "Color", "Material"];
    const nextName = presets[options.length] ?? `Option ${options.length + 1}`;
    const nextIdx = options.length;
    const next = [...options, { name: nextName, values: [] }];
    setOptions(next);
    setOptionInputs([...optionInputs, ""]);
    setEditingOption((prev) => ({ ...prev, [nextIdx]: true }));
  }

  function removeOption(idx: number) {
    const next = options.filter((_, i) => i !== idx);
    setOptions(next);
    setOptionInputs(optionInputs.filter((_, i) => i !== idx));
    if (next.length === 0) {
      setHasVariants(false);
      rebuildVariants([], false);
    } else {
      rebuildVariants(next, true);
    }
  }

  function addOptionValue(idx: number, rawVal: string) {
    const val = rawVal.trim();
    if (val === "") {
      return;
    }
    const opt = options[idx];
    if (opt === undefined || opt.values.includes(val)) {
      return;
    }
    const next = [...options];
    next[idx] = { ...opt, values: [...opt.values, val] };
    setOptions(next);
    const nextInputs = [...optionInputs];
    nextInputs[idx] = "";
    setOptionInputs(nextInputs);
    rebuildVariants(next, true);
  }

  function removeOptionValue(optIdx: number, valIdx: number) {
    const opt = options[optIdx];
    if (opt === undefined) {
      return;
    }
    const next = [...options];
    next[optIdx] = {
      ...opt,
      values: opt.values.filter((_, i) => i !== valIdx),
    };
    setOptions(next);
    rebuildVariants(next, true);
  }

  function updateSingleVariant(patch: Partial<VariantDraft>) {
    setVariants((prev) => {
      const first = prev[0];
      if (first === undefined) {
        return prev;
      }
      return [{ ...first, ...patch }, ...prev.slice(1)];
    });
  }

  function applyBulkVariants() {
    setVariants((prev) =>
      prev.map((v) => ({
        ...v,
        price: bulkPriceTaka.trim() !== "" ? toPoisha(bulkPriceTaka) : v.price,
        stock:
          bulkStock.trim() !== ""
            ? Number.parseInt(bulkStock, 10) || 0
            : v.stock,
      })),
    );
    setBulkPriceTaka("");
    setBulkStock("");
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = tagInput.replace(/,/g, "").trim();
      if (val !== "" && !tags.includes(val)) {
        setTags((prev) => [...prev, val]);
      }
      setTagInput("");
    }
  }

  function toggleCategory(id: string) {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
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
      basePrice: basePricePoisha,
      salePrice: salePriceTaka.trim() ? toPoisha(salePriceTaka) : null,
      compareAtPrice: compareAtPriceTaka.trim()
        ? toPoisha(compareAtPriceTaka)
        : null,
      hasVariants,
      options: hasVariants ? options : [],
      variants: variants.map((v) => ({
        ...v,
        weightG: isPhysical ? v.weightG : 0,
      })),
      images: images.map((img, idx) => ({
        id: img.id,
        url: img.url,
        alt: img.alt,
        position: idx,
      })),
      seo: {
        title: seoTitle.trim() || undefined,
        description: seoDescription.trim() || undefined,
      },
      vendor: vendor.trim() || null,
      productType: productType.trim() || null,
      tags,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.push("/admin/products");
    router.refresh();
  }

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(catSearch.toLowerCase()),
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/80 rounded px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/products"
            className="p-1.5 rounded border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            aria-label="Back to products"
          >
            <i className="ti ti-arrow-left text-base" />
          </Link>
          <span className="font-bold text-slate-900 text-sm">
            {initialProduct ? name || "Edit product" : "Add product"}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 uppercase">
            {status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/products"
            className="px-3 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Discard
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded text-xs font-semibold shadow-sm transition"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {error !== null && (
        <div
          role="alert"
          className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2"
        >
          <i className="ti ti-alert-triangle text-base shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-3">
            <div>
              <label htmlFor="prod-name" className={LABEL_CLS}>
                Title
              </label>
              <input
                id="prod-name"
                type="text"
                required
                placeholder="Short sleeve t-shirt"
                className={INPUT_CLS}
                value={name}
                onChange={(e) => {
                  const val = e.target.value;
                  setName(val);
                  if (!initialProduct) {
                    const nextSlug = slugify(val);
                    setSlug(nextSlug);
                    if (!hasVariants && variants[0] !== undefined) {
                      updateSingleVariant({
                        sku: nextSlug ? `${nextSlug.toUpperCase()}-01` : "SKU-1",
                      });
                    }
                  }
                }}
              />
            </div>

            <div>
              <div className={LABEL_CLS}>Description</div>
              <div className="border border-slate-300 rounded overflow-hidden">
                <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 bg-slate-50 border-b border-slate-200">
                  <button
                    type="button"
                    onClick={() => applyFormat("bold")}
                    className="px-2 py-1 rounded text-xs font-bold text-slate-600 hover:bg-slate-200"
                    title="Bold"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat("italic")}
                    className="px-2 py-1 rounded text-xs italic text-slate-600 hover:bg-slate-200"
                    title="Italic"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat("underline")}
                    className="px-2 py-1 rounded text-xs underline text-slate-600 hover:bg-slate-200"
                    title="Underline"
                  >
                    U
                  </button>
                  <span className="h-4 w-px bg-slate-300 mx-1" />
                  <button
                    type="button"
                    onClick={() => applyFormat("insertUnorderedList")}
                    className="px-2 py-1 rounded text-xs text-slate-600 hover:bg-slate-200"
                    title="Bullet list"
                  >
                    • List
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat("insertOrderedList")}
                    className="px-2 py-1 rounded text-xs text-slate-600 hover:bg-slate-200"
                    title="Numbered list"
                  >
                    1. List
                  </button>
                </div>
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => setDescription(e.currentTarget.innerHTML)}
                  dangerouslySetInnerHTML={{
                    __html: initialProduct?.description ?? "",
                  }}
                  className="min-h-[120px] p-3 text-sm text-slate-900 focus:outline-none bg-white"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 m-0">Media</h3>
              <button
                type="button"
                onClick={() => setShowUrlBox((p) => !p)}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                {showUrlBox ? "Cancel URL" : "Add from URL"}
              </button>
            </div>

            {showUrlBox && (
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  className={INPUT_CLS}
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                />
                <button
                  type="button"
                  onClick={addImageFromUrl}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold whitespace-nowrap"
                >
                  Add
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={(e) => void uploadFiles(e.target.files)}
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDropFiles}
              className={`border-2 border-dashed rounded p-5 text-center transition ${
                dragActive
                  ? "border-indigo-500 bg-indigo-50/50"
                  : "border-slate-300 bg-slate-50/50"
              }`}
            >
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
                >
                  {uploading ? "Uploading..." : "Upload new"}
                </button>
                <span className="text-xs text-slate-500">
                  or drag and drop images here
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Accepts JPG, PNG, WEBP, AVIF (max 5MB)
              </div>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {images.map((img, idx) => (
                  <div
                    key={`${img.url}-${idx}`}
                    className={`relative border border-slate-200 rounded overflow-hidden bg-slate-50 ${
                      idx === 0 ? "sm:col-span-2 sm:row-span-2" : ""
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={img.alt || name || "Product image"}
                      className={`w-full object-cover ${
                        idx === 0 ? "h-48" : "h-24"
                      }`}
                    />
                    {idx === 0 ? (
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-bold uppercase">
                        Primary
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => moveImageToFirst(idx)}
                        className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-white/90 text-slate-700 text-[10px] font-semibold hover:bg-white shadow-sm"
                      >
                        Set primary
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded bg-white/90 text-rose-600 hover:bg-white flex items-center justify-center shadow-sm"
                      title="Remove"
                    >
                      <i className="ti ti-trash text-xs" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 m-0">Pricing</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="prod-base-price" className={LABEL_CLS}>
                  Price (৳)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1.5 text-slate-400 text-sm">
                    ৳
                  </span>
                  <input
                    id="prod-base-price"
                    type="number"
                    step="0.01"
                    min={0}
                    required
                    className={`${INPUT_CLS} pl-7`}
                    value={basePriceTaka}
                    onChange={(e) => {
                      setBasePriceTaka(e.target.value);
                      if (!hasVariants) {
                        updateSingleVariant({ price: toPoisha(e.target.value) });
                      }
                    }}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="prod-compare-price" className={LABEL_CLS}>
                  Compare-at price (৳)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1.5 text-slate-400 text-sm">
                    ৳
                  </span>
                  <input
                    id="prod-compare-price"
                    type="number"
                    step="0.01"
                    min={0}
                    className={`${INPUT_CLS} pl-7`}
                    value={compareAtPriceTaka}
                    onChange={(e) => setCompareAtPriceTaka(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="prod-sale-price" className={LABEL_CLS}>
                  Sale price (৳)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1.5 text-slate-400 text-sm">
                    ৳
                  </span>
                  <input
                    id="prod-sale-price"
                    type="number"
                    step="0.01"
                    min={0}
                    className={`${INPUT_CLS} pl-7`}
                    value={salePriceTaka}
                    onChange={(e) => setSalePriceTaka(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {!hasVariants && defaultVariant !== undefined && (
              <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="prod-cost-price" className={LABEL_CLS}>
                    Cost per item (৳)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1.5 text-slate-400 text-sm">
                      ৳
                    </span>
                    <input
                      id="prod-cost-price"
                      type="number"
                      step="0.01"
                      min={0}
                      className={`${INPUT_CLS} pl-7`}
                      value={toTakaInput(defaultVariant.costPrice)}
                      onChange={(e) =>
                        updateSingleVariant({
                          costPrice: e.target.value.trim()
                            ? toPoisha(e.target.value)
                            : null,
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <div className={LABEL_CLS}>Profit</div>
                  <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm font-semibold text-slate-700">
                    {defaultCost > 0 ? formatBdt(profit) : "—"}
                  </div>
                </div>
                <div>
                  <div className={LABEL_CLS}>Margin</div>
                  <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm font-semibold text-emerald-600">
                    {marginPct !== null ? `${marginPct}%` : "—"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {!hasVariants && defaultVariant !== undefined && (
            <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 m-0">
                Inventory
              </h3>
              <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-700">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={trackQty}
                    onChange={(e) => setTrackQty(e.target.checked)}
                  />
                  <span>Track quantity</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={continueSelling}
                    onChange={(e) => setContinueSelling(e.target.checked)}
                  />
                  <span>Continue selling when out of stock</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="single-sku" className={LABEL_CLS}>
                    SKU (Stock Keeping Unit)
                  </label>
                  <input
                    id="single-sku"
                    type="text"
                    required
                    placeholder="e.g. POLO-BLK-01"
                    className={INPUT_CLS}
                    value={defaultVariant.sku}
                    onChange={(e) =>
                      updateSingleVariant({ sku: e.target.value })
                    }
                  />
                </div>
                {trackQty && (
                  <div>
                    <label htmlFor="single-stock" className={LABEL_CLS}>
                      Quantity
                    </label>
                    <input
                      id="single-stock"
                      type="number"
                      min={0}
                      required
                      className={INPUT_CLS}
                      value={defaultVariant.stock}
                      onChange={(e) =>
                        updateSingleVariant({
                          stock: Number.parseInt(e.target.value || "0", 10),
                        })
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {!hasVariants && defaultVariant !== undefined && (
            <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 m-0">
                  Shipping
                </h3>
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPhysical}
                    onChange={(e) => setIsPhysical(e.target.checked)}
                  />
                  <span>This is a physical product</span>
                </label>
              </div>
              {isPhysical && (
                <div className="max-w-xs">
                  <label htmlFor="single-weight" className={LABEL_CLS}>
                    Weight
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="single-weight"
                      type="number"
                      min={0}
                      step="any"
                      className={INPUT_CLS}
                      value={
                        weightUnit === "kg"
                          ? defaultVariant.weightG / 1000
                          : defaultVariant.weightG
                      }
                      onChange={(e) => {
                        const raw = Number.parseFloat(e.target.value || "0");
                        const g =
                          weightUnit === "kg"
                            ? Math.round(raw * 1000)
                            : Math.round(raw);
                        updateSingleVariant({ weightG: g });
                      }}
                    />
                    <select
                      aria-label="Weight unit"
                      value={weightUnit}
                      onChange={(e) =>
                        setWeightUnit(e.target.value as "g" | "kg")
                      }
                      className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-sm"
                    >
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 m-0">
                Variants
              </h3>
              {!hasVariants ? (
                <button
                  type="button"
                  onClick={() => {
                    setHasVariants(true);
                    if (options.length === 0) {
                      addOption();
                    }
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1"
                >
                  <i className="ti ti-plus" />
                  <span>Add options like size or color</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setHasVariants(false);
                    setOptions([]);
                    rebuildVariants([], false);
                  }}
                  className="text-xs font-semibold text-rose-600 hover:underline"
                >
                  Remove all variants
                </button>
              )}
            </div>

            {hasVariants && (
              <div className="space-y-3">
                {options.map((opt, idx) => {
                  const isEditing = editingOption[idx] ?? true;
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded bg-slate-50 border border-slate-200 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {isEditing ? (
                          <input
                            type="text"
                            aria-label={`Option ${idx + 1} name`}
                            className={`${INPUT_CLS} max-w-xs font-semibold`}
                            value={opt.name}
                            onChange={(e) => {
                              const next = [...options];
                              next[idx] = { ...opt, name: e.target.value };
                              setOptions(next);
                            }}
                          />
                        ) : (
                          <span className="text-xs font-bold text-slate-800">
                            {opt.name}
                          </span>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingOption((p) => ({
                                ...p,
                                [idx]: !isEditing,
                              }))
                            }
                            className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700"
                          >
                            {isEditing ? "Done" : "Edit"}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeOption(idx)}
                            className="text-xs font-semibold text-rose-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {opt.values.map((val, valIdx) => (
                          <span
                            key={`${val}-${valIdx}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-xs font-medium text-slate-700"
                          >
                            <span>{val}</span>
                            {isEditing && (
                              <button
                                type="button"
                                onClick={() => removeOptionValue(idx, valIdx)}
                                className="text-slate-400 hover:text-rose-600"
                              >
                                ×
                              </button>
                            )}
                          </span>
                        ))}
                        {isEditing && (
                          <input
                            type="text"
                            placeholder="Add value & Enter"
                            className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={optionInputs[idx] ?? ""}
                            onChange={(e) => {
                              const next = [...optionInputs];
                              next[idx] = e.target.value;
                              setOptionInputs(next);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === ",") {
                                e.preventDefault();
                                addOptionValue(idx, optionInputs[idx] ?? "");
                              }
                            }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}

                {options.length < MAX_PRODUCT_OPTIONS && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-semibold transition inline-flex items-center gap-1"
                  >
                    <i className="ti ti-plus" />
                    <span>Add another option</span>
                  </button>
                )}

                <div className="p-2.5 rounded bg-slate-50 border border-slate-200 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold uppercase text-slate-500">
                    Bulk Apply:
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Price (৳)"
                    className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs w-28"
                    value={bulkPriceTaka}
                    onChange={(e) => setBulkPriceTaka(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Stock"
                    className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs w-20"
                    value={bulkStock}
                    onChange={(e) => setBulkStock(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={applyBulkVariants}
                    className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-xs font-semibold"
                  >
                    Apply to {variants.length} variants
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Image</th>
                        <th className="py-2 px-3">Variant</th>
                        <th className="py-2 px-3">Price (৳)</th>
                        <th className="py-2 px-3">Available</th>
                        <th className="py-2 px-3">SKU</th>
                        <th className="py-2 px-3">Default</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {variants.map((v, idx) => {
                        const assignedImg = images.find((im) => im.id === v.imageId);
                        return (
                        <tr key={idx}>
                          <td className="py-2 px-3 relative">
                            <button
                              type="button"
                              onClick={() =>
                                setVariantImagePickerIdx(
                                  variantImagePickerIdx === idx ? null : idx,
                                )
                              }
                              title="Assign variant image"
                              className="w-10 h-10 rounded border border-slate-200 bg-slate-50 hover:border-indigo-400 flex items-center justify-center overflow-hidden"
                            >
                              {assignedImg !== undefined ? (
                                <img
                                  src={assignedImg.url}
                                  alt={assignedImg.alt || "Variant"}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <i className="ti ti-photo-plus text-base text-slate-400" />
                              )}
                            </button>
                            {variantImagePickerIdx === idx && (
                              <div className="absolute left-3 top-13 z-30 w-64 bg-white border border-slate-200 rounded shadow-xl p-3 space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-slate-700">
                                    Select Variant Image
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setVariantImagePickerIdx(null)}
                                    className="text-slate-400 hover:text-slate-700"
                                  >
                                    <i className="ti ti-x text-sm" />
                                  </button>
                                </div>
                                {images.length === 0 ? (
                                  <p className="text-[11px] text-slate-400 m-0">
                                    No product images yet. Upload one below.
                                  </p>
                                ) : (
                                  <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto">
                                    {images.map((im, imIdx) => {
                                      const imId = im.id ?? "";
                                      const isSelected = imId !== "" && v.imageId === imId;
                                      return (
                                        <button
                                          key={imId || imIdx}
                                          type="button"
                                          onClick={() => {
                                            let targetId = im.id;
                                            if (targetId === undefined) {
                                              targetId = crypto.randomUUID();
                                              setImages((prev) =>
                                                prev.map((item, j) =>
                                                  j === imIdx ? { ...item, id: targetId } : item,
                                                ),
                                              );
                                            }
                                            setVariants((prev) =>
                                              prev.map((item, j) =>
                                                j === idx ? { ...item, imageId: targetId ?? null } : item,
                                              ),
                                            );
                                            setVariantImagePickerIdx(null);
                                          }}
                                          className={`w-12 h-12 rounded border overflow-hidden ${
                                            isSelected
                                              ? "border-indigo-600 ring-2 ring-indigo-500/30"
                                              : "border-slate-200 hover:border-indigo-400"
                                          }`}
                                        >
                                          <img
                                            src={im.url}
                                            alt={im.alt || "Media"}
                                            className="w-full h-full object-cover"
                                          />
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 gap-2">
                                  <label className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer">
                                    + Upload Image
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const fd = new FormData();
                                        fd.append("file", file);
                                        const res = await fetch("/api/upload", {
                                          method: "POST",
                                          body: fd,
                                        });
                                        const data = (await res.json()) as { url?: string };
                                        if (res.ok && data.url) {
                                          const newId = crypto.randomUUID();
                                          setImages((prev) => [
                                            ...prev,
                                            {
                                              id: newId,
                                              url: data.url!,
                                              alt: name || file.name,
                                              position: prev.length,
                                            },
                                          ]);
                                          setVariants((prev) =>
                                            prev.map((item, j) =>
                                              j === idx ? { ...item, imageId: newId } : item,
                                            ),
                                          );
                                          setVariantImagePickerIdx(null);
                                        }
                                      }}
                                    />
                                  </label>
                                  {v.imageId !== null && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setVariants((prev) =>
                                          prev.map((item, j) =>
                                            j === idx ? { ...item, imageId: null } : item,
                                          ),
                                        );
                                        setVariantImagePickerIdx(null);
                                      }}
                                      className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold"
                                    >
                                      Clear
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">
                            {Object.keys(v.optionValues).length === 0
                              ? "Default"
                              : Object.values(v.optionValues).join(" / ")}
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              step="0.01"
                              aria-label={`Variant ${idx + 1} Price`}
                              className={INPUT_CLS}
                              value={toTakaInput(v.price)}
                              onChange={(e) => {
                                const next = [...variants];
                                next[idx] = {
                                  ...v,
                                  price: toPoisha(e.target.value),
                                };
                                setVariants(next);
                              }}
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              aria-label={`Variant ${idx + 1} Stock`}
                              className={INPUT_CLS}
                              value={v.stock}
                              onChange={(e) => {
                                const next = [...variants];
                                next[idx] = {
                                  ...v,
                                  stock: Number.parseInt(
                                    e.target.value || "0",
                                    10,
                                  ),
                                };
                                setVariants(next);
                              }}
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              aria-label={`Variant ${idx + 1} SKU`}
                              className={INPUT_CLS}
                              value={v.sku}
                              onChange={(e) => {
                                const next = [...variants];
                                next[idx] = { ...v, sku: e.target.value };
                                setVariants(next);
                              }}
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="radio"
                              name="defaultVariant"
                              checked={v.isDefault}
                              onChange={() =>
                                setVariants((prev) =>
                                  prev.map((item, i) => ({
                                    ...item,
                                    isDefault: i === idx,
                                  })),
                                )
                              }
                            />
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 m-0">
                Search engine listing
              </h3>
              <button
                type="button"
                onClick={() => setSeoOpen((p) => !p)}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                {seoOpen ? "Hide" : "Edit"}
              </button>
            </div>

            <div className="p-3 rounded bg-slate-50 border border-slate-200/80 space-y-0.5">
              <div className="font-semibold text-indigo-700 text-sm">
                {seoTitle || name || "Product Title"}
              </div>
              <div className="text-emerald-700 text-xs">
                /products/{slug || "product-slug"}
              </div>
              <div className="text-slate-500 text-xs line-clamp-2">
                {seoDescription ||
                  description.replace(/<[^>]*>/g, "").slice(0, 140) ||
                  "Add a description to see how this product might appear in a search engine listing."}
              </div>
            </div>

            {seoOpen && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div>
                  <label htmlFor="prod-seo-title" className={LABEL_CLS}>
                    Page title ({seoTitle.length} of 60 characters)
                  </label>
                  <input
                    id="prod-seo-title"
                    type="text"
                    maxLength={60}
                    className={INPUT_CLS}
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="prod-seo-desc" className={LABEL_CLS}>
                    Meta description ({seoDescription.length} of 160 characters)
                  </label>
                  <textarea
                    id="prod-seo-desc"
                    rows={2}
                    maxLength={160}
                    className={INPUT_CLS}
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="prod-slug" className={LABEL_CLS}>
                    URL handle
                  </label>
                  <input
                    id="prod-slug"
                    type="text"
                    className={INPUT_CLS}
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 m-0">Status</h3>
            <select
              id="prod-status"
              aria-label="Product status"
              className={INPUT_CLS}
              value={status}
              onChange={(e) => setStatus(e.target.value as ProductStatus)}
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-2.5">
            <h3 className="text-sm font-bold text-slate-900 m-0">Publishing</h3>
            <div className="text-xs text-slate-500">Sales channels</div>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={onlineStore}
                onChange={(e) => setOnlineStore(e.target.checked)}
              />
              <span>Online Store</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={posChannel}
                onChange={(e) => setPosChannel(e.target.checked)}
              />
              <span>Point of Sale</span>
            </label>
          </div>

          <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 m-0">
              Product organization
            </h3>
            <div>
              <label htmlFor="prod-type" className={LABEL_CLS}>
                Type
              </label>
              <input
                id="prod-type"
                type="text"
                placeholder="e.g. Apparel"
                className={INPUT_CLS}
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="prod-vendor" className={LABEL_CLS}>
                Vendor
              </label>
              <input
                id="prod-vendor"
                type="text"
                placeholder="e.g. Aarong"
                className={INPUT_CLS}
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="prod-brand" className={LABEL_CLS}>
                Brand
              </label>
              <select
                id="prod-brand"
                className={INPUT_CLS}
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

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className={LABEL_CLS}>
                  Categories ({categoryIds.length} selected)
                </span>
                {categoryIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCategoryIds([])}
                    className="text-[11px] font-semibold text-rose-600 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              {categoryIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {categoryIds.map((cid) => {
                    const cat = categories.find((c) => c.id === cid);
                    if (cat === undefined) return null;
                    return (
                      <span
                        key={cid}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-semibold"
                      >
                        <span>{cat.name}</span>
                        <button
                          type="button"
                          onClick={() => toggleCategory(cid)}
                          className="hover:text-rose-600"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <input
                type="text"
                placeholder="Search categories..."
                className={`${INPUT_CLS} mb-1.5`}
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
              />
              <div className="max-h-36 overflow-y-auto border border-slate-200 rounded p-1.5 space-y-0.5 bg-slate-50">
                {filteredCategories.length === 0 ? (
                  <div className="text-xs text-slate-400 p-2">
                    No collections found.
                  </div>
                ) : (
                  filteredCategories.map((c) => (
                    <label
                      key={c.id}
                      style={{ paddingLeft: `${6 + c.depth * 12}px` }}
                      className="flex items-center gap-2 py-1 pr-2 text-xs font-medium text-slate-700 hover:bg-white rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={categoryIds.includes(c.id)}
                        onChange={() => toggleCategory(c.id)}
                      />
                      <span>{c.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div>
              <label htmlFor="prod-tags" className={LABEL_CLS}>
                Tags
              </label>
              <input
                id="prod-tags"
                type="text"
                placeholder="Type tag & press Enter"
                className={INPUT_CLS}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
              />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs font-semibold"
                    >
                      <span>{t}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setTags((prev) => prev.filter((item) => item !== t))
                        }
                        className="hover:text-rose-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
