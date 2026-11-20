import { AppError } from "@/lib/errors";
import type { OptionDraft, VariantDraft } from "@/modules/catalog/types";
import { MAX_PRODUCT_OPTIONS } from "@/modules/catalog/validators";

export function slugify(input: string): string {
  const normalized = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized.length > 0 ? normalized : "item";
}

export async function ensureUniqueSlug(
  baseSlug: string,
  existsFn: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const cleanBase = slugify(baseSlug);
  let candidate = cleanBase;
  let suffix = 2;
  while (await existsFn(candidate)) {
    candidate = `${cleanBase}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export function buildCategoryPath(
  parentPath: string | null,
  slug: string,
): string {
  const cleanSlug = slugify(slug);
  if (parentPath === null || parentPath === "") {
    return `/${cleanSlug}`;
  }
  return `${parentPath}/${cleanSlug}`;
}

export function computeCategoryDepth(parentDepth: number | null): number {
  return parentDepth === null ? 0 : parentDepth + 1;
}

function optionValuesKey(optionValues: Record<string, string>): string {
  const entries = Object.entries(optionValues).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return entries.map(([k, v]) => `${k}=${v}`).join("|");
}

function cartesianProduct(
  options: readonly OptionDraft[],
): Array<Record<string, string>> {
  let acc: Array<Record<string, string>> = [{}];
  for (const option of options) {
    const next: Array<Record<string, string>> = [];
    for (const combo of acc) {
      for (const value of option.values) {
        next.push({ ...combo, [option.name]: value });
      }
    }
    acc = next;
  }
  return acc;
}

export interface GenerateVariantsInput {
  baseSku: string;
  basePrice: number;
  hasVariants: boolean;
  options: readonly OptionDraft[];
  existingVariants?: readonly VariantDraft[];
  optionsReordered?: boolean;
  confirmRegenerate?: boolean;
}

export function generateVariantCombinations(
  input: GenerateVariantsInput,
): VariantDraft[] {
  const existing = input.existingVariants ?? [];

  if (!input.hasVariants) {
    const first = existing[0];
    return [
      {
        id: first?.id,
        sku: first?.sku ?? slugify(input.baseSku).toUpperCase(),
        price: first?.price ?? input.basePrice,
        compareAtPrice: first?.compareAtPrice ?? null,
        costPrice: first?.costPrice ?? null,
        stock: first?.stock ?? 0,
        weightG: first?.weightG ?? 0,
        barcode: first?.barcode ?? null,
        optionValues: {},
        imageId: first?.imageId ?? null,
        isDefault: true,
      },
    ];
  }

  if (input.options.length === 0) {
    throw new AppError(
      "VALIDATION",
      "At least one option is required when variants are enabled",
    );
  }
  if (input.options.length > MAX_PRODUCT_OPTIONS) {
    throw new AppError(
      "VALIDATION",
      `Maximum ${MAX_PRODUCT_OPTIONS} options allowed`,
    );
  }

  const seenNames = new Set<string>();
  for (const opt of input.options) {
    const normalizedName = opt.name.trim().toLowerCase();
    if (seenNames.has(normalizedName)) {
      throw new AppError("VALIDATION", `Duplicate option name: ${opt.name}`);
    }
    seenNames.add(normalizedName);
    if (opt.values.length === 0) {
      throw new AppError(
        "VALIDATION",
        `Option "${opt.name}" must have at least one value`,
      );
    }
  }

  if (
    input.optionsReordered === true &&
    existing.length > 0 &&
    input.confirmRegenerate !== true
  ) {
    throw new AppError(
      "CONFLICT",
      "Reordering options will regenerate variants. Confirm to proceed.",
    );
  }

  const existingByKey = new Map(
    existing.map((v) => [optionValuesKey(v.optionValues), v]),
  );

  const combinations = cartesianProduct(input.options);
  const cleanBaseSku = slugify(input.baseSku).toUpperCase();

  return combinations.map((optionValues, idx) => {
    const key = optionValuesKey(optionValues);
    const matched = existingByKey.get(key);
    const skuSuffix = Object.values(optionValues)
      .map((v) => slugify(v).toUpperCase())
      .join("-");
    return {
      id: matched?.id,
      sku: matched?.sku ?? `${cleanBaseSku}-${skuSuffix}`,
      price: matched?.price ?? input.basePrice,
      compareAtPrice: matched?.compareAtPrice ?? null,
      costPrice: matched?.costPrice ?? null,
      stock: matched?.stock ?? 0,
      weightG: matched?.weightG ?? 0,
      barcode: matched?.barcode ?? null,
      optionValues,
      imageId: matched?.imageId ?? null,
      isDefault: idx === 0,
    };
  });
}

export function computeStockAfterMovement(
  currentStock: number,
  delta: number,
): number {
  if (delta === 0) {
    throw new AppError("VALIDATION", "Stock delta cannot be zero");
  }
  const nextStock = currentStock + delta;
  if (nextStock < 0) {
    throw new AppError(
      "CONFLICT",
      `Insufficient stock: current ${currentStock}, requested delta ${delta}`,
    );
  }
  return nextStock;
}
