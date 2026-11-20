"use server";

import { randomUUID } from "crypto";

import { and, eq, isNull, ne } from "drizzle-orm";

import { createAction } from "@/lib/action";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  brands,
  categories,
  productCategories,
  productImages,
  productOptions,
  products,
  stockMovements,
  variants,
} from "@/modules/catalog/schema";
import {
  buildCategoryPath,
  computeCategoryDepth,
  computeStockAfterMovement,
  ensureUniqueSlug,
  generateVariantCombinations,
} from "@/modules/catalog/service";
import {
  brandInputSchema,
  categoryInputSchema,
  categoryReorderSchema,
  deleteByIdSchema,
  productInputSchema,
  stockAdjustSchema,
} from "@/modules/catalog/validators";

export const upsertBrandAction = createAction({
  permission: "brand:create",
  schema: brandInputSchema,
  revalidateTags: ["brands"],
  audit: {
    action: "upsert",
    entity: "brand",
    getEntityId: (out: { id: string }) => out.id,
  },
  handler: async (input) => {
    const db = getDb();
    const id = input.id ?? randomUUID();
    const baseSlug = input.slug && input.slug.length > 0 ? input.slug : input.name;
    const slug = await ensureUniqueSlug(baseSlug, async (candidate) => {
      const existing = await db
        .select({ id: brands.id })
        .from(brands)
        .where(
          input.id !== undefined
            ? and(eq(brands.slug, candidate), ne(brands.id, input.id))
            : eq(brands.slug, candidate),
        )
        .limit(1);
      return existing.length > 0;
    });

    if (input.id !== undefined) {
      await db
        .update(brands)
        .set({
          name: input.name,
          slug,
          logoUrl: input.logoUrl ?? null,
          seo: input.seo ?? null,
          updatedAt: new Date(),
        })
        .where(eq(brands.id, input.id));
    } else {
      await db.insert(brands).values({
        id,
        name: input.name,
        slug,
        logoUrl: input.logoUrl ?? null,
        seo: input.seo ?? null,
      });
    }
    return { id, slug };
  },
});

export const deleteBrandAction = createAction({
  permission: "brand:delete",
  schema: deleteByIdSchema,
  revalidateTags: ["brands"],
  audit: {
    action: "delete",
    entity: "brand",
    getEntityId: (_out, input) => input.id,
  },
  handler: async (input) => {
    const db = getDb();
    await db
      .update(brands)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(brands.id, input.id));
    return { id: input.id };
  },
});

export const upsertCategoryAction = createAction({
  permission: "category:create",
  schema: categoryInputSchema,
  revalidateTags: ["categories"],
  audit: {
    action: "upsert",
    entity: "category",
    getEntityId: (out: { id: string }) => out.id,
  },
  handler: async (input) => {
    const db = getDb();
    const id = input.id ?? randomUUID();
    const baseSlug = input.slug && input.slug.length > 0 ? input.slug : input.name;
    const slug = await ensureUniqueSlug(baseSlug, async (candidate) => {
      const existing = await db
        .select({ id: categories.id })
        .from(categories)
        .where(
          input.id !== undefined
            ? and(eq(categories.slug, candidate), ne(categories.id, input.id))
            : eq(categories.slug, candidate),
        )
        .limit(1);
      return existing.length > 0;
    });

    let parentPath: string | null = null;
    let parentDepth: number | null = null;
    if (input.parentId !== undefined && input.parentId !== null) {
      const parentRows = await db
        .select({ path: categories.path, depth: categories.depth })
        .from(categories)
        .where(eq(categories.id, input.parentId))
        .limit(1);
      const parent = parentRows[0];
      if (parent === undefined) {
        throw new AppError("NOT_FOUND", "Parent category not found");
      }
      parentPath = parent.path;
      parentDepth = parent.depth;
    }

    const path = buildCategoryPath(parentPath, slug);
    const depth = computeCategoryDepth(parentDepth);

    if (input.id !== undefined) {
      await db
        .update(categories)
        .set({
          parentId: input.parentId ?? null,
          name: input.name,
          slug,
          path,
          depth,
          position: input.position,
          seo: input.seo ?? null,
          updatedAt: new Date(),
        })
        .where(eq(categories.id, input.id));
    } else {
      await db.insert(categories).values({
        id,
        parentId: input.parentId ?? null,
        name: input.name,
        slug,
        path,
        depth,
        position: input.position,
        seo: input.seo ?? null,
      });
    }
    return { id, slug, path, depth };
  },
});

export const reorderCategoriesAction = createAction({
  permission: "category:update",
  schema: categoryReorderSchema,
  revalidateTags: ["categories"],
  audit: {
    action: "reorder",
    entity: "category",
    getEntityId: () => "tree",
  },
  handler: async (input) => {
    const db = getDb();
    await db.transaction(async (tx) => {
      for (const item of input.items) {
        await tx
          .update(categories)
          .set({
            parentId: item.parentId,
            position: item.position,
            updatedAt: new Date(),
          })
          .where(eq(categories.id, item.id));
      }
    });
    return { updated: input.items.length };
  },
});

export const upsertProductAction = createAction({
  permission: "product:create",
  schema: productInputSchema,
  revalidateTags: ["products"],
  audit: {
    action: "upsert",
    entity: "product",
    getEntityId: (out: { id: string }) => out.id,
  },
  handler: async (input) => {
    const db = getDb();
    const productId = input.id ?? randomUUID();
    const baseSlug = input.slug && input.slug.length > 0 ? input.slug : input.name;
    const slug = await ensureUniqueSlug(baseSlug, async (candidate) => {
      const existing = await db
        .select({ id: products.id })
        .from(products)
        .where(
          input.id !== undefined
            ? and(eq(products.slug, candidate), ne(products.id, input.id))
            : eq(products.slug, candidate),
        )
        .limit(1);
      return existing.length > 0;
    });

    const inputOptions = input.options ?? [];
    const inputCategoryIds = input.categoryIds ?? [];
    const inputImages = input.images ?? [];
    const inputVariants = input.variants.map((v) => ({
      ...v,
      compareAtPrice: v.compareAtPrice ?? null,
      costPrice: v.costPrice ?? null,
      barcode: v.barcode ?? null,
      imageId: v.imageId ?? null,
      weightG: v.weightG ?? 0,
      optionValues: v.optionValues ?? {},
      isDefault: v.isDefault ?? false,
    }));

    const normalizedVariants = input.hasVariants
      ? generateVariantCombinations({
          baseSku: slug,
          basePrice: input.basePrice,
          hasVariants: true,
          options: inputOptions,
          existingVariants: inputVariants,
          optionsReordered: input.optionsReordered,
          confirmRegenerate: input.confirmRegenerate,
        })
      : inputVariants;

    await db.transaction(async (tx) => {
      if (input.id !== undefined) {
        await tx
          .update(products)
          .set({
            name: input.name,
            slug,
            status: input.status ?? "draft",
            brandId: input.brandId ?? null,
            description: input.description ?? "",
            basePrice: input.basePrice,
            salePrice: input.salePrice ?? null,
            compareAtPrice: input.compareAtPrice ?? null,
            seo: input.seo ?? null,
            hasVariants: input.hasVariants ?? false,
            vendor: input.vendor ?? null,
            productType: input.productType ?? null,
            tags: input.tags ?? [],
            updatedAt: new Date(),
          })
          .where(eq(products.id, productId));
        await tx
          .delete(productCategories)
          .where(eq(productCategories.productId, productId));
        await tx
          .delete(productOptions)
          .where(eq(productOptions.productId, productId));
        await tx
          .delete(productImages)
          .where(eq(productImages.productId, productId));
      } else {
        await tx.insert(products).values({
          id: productId,
          name: input.name,
          slug,
          status: input.status ?? "draft",
          brandId: input.brandId ?? null,
          description: input.description ?? "",
          basePrice: input.basePrice,
          salePrice: input.salePrice ?? null,
          compareAtPrice: input.compareAtPrice ?? null,
          seo: input.seo ?? null,
          hasVariants: input.hasVariants ?? false,
          vendor: input.vendor ?? null,
          productType: input.productType ?? null,
          tags: input.tags ?? [],
        });
      }

      if (inputCategoryIds.length > 0) {
        await tx.insert(productCategories).values(
          inputCategoryIds.map((categoryId) => ({
            id: randomUUID(),
            productId,
            categoryId,
          })),
        );
      }

      if (inputImages.length > 0) {
        await tx.insert(productImages).values(
          inputImages.map((img, idx) => ({
            id: img.id ?? randomUUID(),
            productId,
            url: img.url,
            alt: img.alt ?? "",
            position: idx,
            variantIds: img.variantIds ?? null,
          })),
        );
      }

      if (inputOptions.length > 0) {
        await tx.insert(productOptions).values(
          inputOptions.map((opt, idx) => ({
            id: randomUUID(),
            productId,
            name: opt.name,
            position: idx,
            values: opt.values,
          })),
        );
      }

      await tx
        .update(variants)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(variants.productId, productId), isNull(variants.deletedAt)));

      for (const variant of normalizedVariants) {
        await tx
          .insert(variants)
          .values({
            id: variant.id ?? randomUUID(),
            productId,
            sku: variant.sku,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice ?? null,
            costPrice: variant.costPrice ?? null,
            stock: variant.stock,
            weightG: variant.weightG,
            barcode: variant.barcode ?? null,
            optionValues: variant.optionValues,
            imageId: variant.imageId ?? null,
            isDefault: variant.isDefault,
            deletedAt: null,
          })
          .onConflictDoUpdate({
            target: variants.sku,
            set: {
              price: variant.price,
              compareAtPrice: variant.compareAtPrice ?? null,
              costPrice: variant.costPrice ?? null,
              stock: variant.stock,
              weightG: variant.weightG,
              optionValues: variant.optionValues,
              isDefault: variant.isDefault,
              deletedAt: null,
              updatedAt: new Date(),
            },
          });
      }
    });

    return { id: productId, slug };
  },
});

export const deleteProductAction = createAction({
  permission: "product:delete",
  schema: deleteByIdSchema,
  revalidateTags: ["products"],
  audit: {
    action: "delete",
    entity: "product",
    getEntityId: (_out, input) => input.id,
  },
  handler: async (input) => {
    const db = getDb();
    await db
      .update(products)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(products.id, input.id));
    return { id: input.id };
  },
});

export const adjustStockAction = createAction({
  permission: "stock:update",
  schema: stockAdjustSchema,
  revalidateTags: ["products", "stock"],
  audit: {
    action: "adjust_stock",
    entity: "variant",
    getEntityId: (_out, input) => input.variantId,
  },
  handler: async (input) => {
    const db = getDb();
    return db.transaction(async (tx) => {
      const rows = await tx
        .select({ id: variants.id, stock: variants.stock })
        .from(variants)
        .where(eq(variants.id, input.variantId))
        .limit(1);
      const target = rows[0];
      if (target === undefined) {
        throw new AppError("NOT_FOUND", "Variant not found");
      }
      const nextStock = computeStockAfterMovement(target.stock, input.delta);
      await tx
        .update(variants)
        .set({ stock: nextStock, updatedAt: new Date() })
        .where(eq(variants.id, target.id));
      await tx.insert(stockMovements).values({
        id: randomUUID(),
        variantId: target.id,
        delta: input.delta,
        reason: input.reason,
        refType: input.refType ?? "manual",
        refId: input.refId ?? "admin",
      });
      return { variantId: target.id, stock: nextStock };
    });
  },
});
