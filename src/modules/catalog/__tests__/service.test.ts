import { describe, expect, it } from "vitest";

import { AppError } from "@/lib/errors";
import {
  detectImageMimeFromBytes,
  stripJpegExifSegments,
  validateAndSanitizeImage,
} from "@/modules/catalog/media";
import {
  buildCategoryPath,
  computeCategoryDepth,
  computeStockAfterMovement,
  ensureUniqueSlug,
  generateVariantCombinations,
  slugify,
} from "@/modules/catalog/service";

describe("catalog slug service", () => {
  it("normalizes text into clean URL slugs", () => {
    expect(slugify("  Cotton T-Shirt (2026)!  ")).toBe("cotton-t-shirt-2026");
    expect(slugify("   ")).toBe("item");
  });

  it("appends numeric suffixes until slug is unique", async () => {
    const taken = new Set(["cotton-shirt", "cotton-shirt-2"]);
    const slug = await ensureUniqueSlug("Cotton Shirt", async (candidate) =>
      taken.has(candidate),
    );
    expect(slug).toBe("cotton-shirt-3");
  });

  it("builds materialized category paths and depths", () => {
    expect(buildCategoryPath(null, "Men")).toBe("/men");
    expect(buildCategoryPath("/men", "Shirts")).toBe("/men/shirts");
    expect(computeCategoryDepth(null)).toBe(0);
    expect(computeCategoryDepth(1)).toBe(2);
  });
});

describe("variant generation from options", () => {
  it("generates single default variant when hasVariants is false", () => {
    const variants = generateVariantCombinations({
      baseSku: "plain-tee",
      basePrice: 50000,
      hasVariants: false,
      options: [],
    });
    expect(variants).toHaveLength(1);
    expect(variants[0]?.isDefault).toBe(true);
    expect(variants[0]?.sku).toBe("PLAIN-TEE");
  });

  it("generates cartesian product and preserves matching existing variant data", () => {
    const variants = generateVariantCombinations({
      baseSku: "polo",
      basePrice: 120000,
      hasVariants: true,
      options: [
        { name: "Size", values: ["S", "M"] },
        { name: "Color", values: ["Red", "Blue"] },
      ],
      existingVariants: [
        {
          id: "v-1",
          sku: "CUSTOM-S-RED",
          price: 99000,
          compareAtPrice: null,
          costPrice: null,
          stock: 15,
          weightG: 200,
          barcode: null,
          optionValues: { Size: "S", Color: "Red" },
          imageId: null,
          isDefault: true,
        },
      ],
    });

    expect(variants).toHaveLength(4);
    expect(variants[0]?.sku).toBe("CUSTOM-S-RED");
    expect(variants[0]?.price).toBe(99000);
    expect(variants[0]?.stock).toBe(15);
    expect(variants[3]?.sku).toBe("POLO-M-BLUE");
    expect(variants[3]?.price).toBe(120000);
  });

  it("enforces maximum 3 options limit", () => {
    expect(() =>
      generateVariantCombinations({
        baseSku: "item",
        basePrice: 1000,
        hasVariants: true,
        options: [
          { name: "Size", values: ["S"] },
          { name: "Color", values: ["Red"] },
          { name: "Material", values: ["Cotton"] },
          { name: "Fit", values: ["Slim"] },
        ],
      }),
    ).toThrow(AppError);
  });

  it("requires confirmation when options are reordered with existing variants", () => {
    const existing = [
      {
        id: "v-1",
        sku: "POLO-S-RED",
        price: 100000,
        compareAtPrice: null,
        costPrice: null,
        stock: 5,
        weightG: 150,
        barcode: null,
        optionValues: { Size: "S", Color: "Red" },
        imageId: null,
        isDefault: true,
      },
    ];

    expect(() =>
      generateVariantCombinations({
        baseSku: "polo",
        basePrice: 100000,
        hasVariants: true,
        options: [
          { name: "Color", values: ["Red"] },
          { name: "Size", values: ["S"] },
        ],
        existingVariants: existing,
        optionsReordered: true,
        confirmRegenerate: false,
      }),
    ).toThrow(/Confirm to proceed/i);

    const regenerated = generateVariantCombinations({
      baseSku: "polo",
      basePrice: 100000,
      hasVariants: true,
      options: [
        { name: "Color", values: ["Red"] },
        { name: "Size", values: ["S"] },
      ],
      existingVariants: existing,
      optionsReordered: true,
      confirmRegenerate: true,
    });
    expect(regenerated).toHaveLength(1);
    expect(regenerated[0]?.price).toBe(100000);
  });
});

describe("stock movement math", () => {
  it("computes positive and negative deltas accurately", () => {
    expect(computeStockAfterMovement(10, 5)).toBe(15);
    expect(computeStockAfterMovement(10, -4)).toBe(6);
  });

  it("rejects zero delta and negative resulting stock", () => {
    expect(() => computeStockAfterMovement(10, 0)).toThrow(AppError);
    expect(() => computeStockAfterMovement(3, -5)).toThrow(/Insufficient stock/);
  });
});

describe("media upload security", () => {
  it("detects allowed magic bytes and rejects SVG/text", () => {
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    expect(detectImageMimeFromBytes(pngHeader)).toBe("image/png");

    const svgBuffer = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>");
    expect(() => validateAndSanitizeImage(svgBuffer)).toThrow(AppError);
  });

  it("strips JPEG APP1 EXIF segments", () => {
    const jpegWithExif = Buffer.from([
      0xff, 0xd8,
      0xff, 0xe1, 0x00, 0x06, 0x45, 0x78, 0x69, 0x66,
      0xff, 0xda, 0x00, 0x02,
    ]);
    const stripped = stripJpegExifSegments(jpegWithExif);
    expect(stripped.equals(Buffer.from([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02]))).toBe(
      true,
    );
  });
});
