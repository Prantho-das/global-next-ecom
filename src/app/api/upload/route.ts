import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { getSession } from "@/lib/auth";
import { checkPermission } from "@/lib/guard";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
} from "@/modules/catalog/validators";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export async function POST(req: Request): Promise<Response> {
  const session = await getSession();
  const userId = session?.user?.id ?? null;
  const [canCreate, canUpdate, canBrand, canSetting] = await Promise.all([
    checkPermission(userId, "product:create"),
    checkPermission(userId, "product:update"),
    checkPermission(userId, "brand:create"),
    checkPermission(userId, "setting:update"),
  ]);
  if (!canCreate && !canUpdate && !canBrand && !canSetting) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  if (
    !(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)
  ) {
    return Response.json(
      { error: "Unsupported image type (use JPG, PNG, WEBP, or AVIF)" },
      { status: 400 },
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return Response.json(
      { error: "Image exceeds 5MB limit" },
      { status: 400 },
    );
  }

  const ext = EXT_BY_MIME[file.type] ?? "bin";
  const fileName = `${randomUUID()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, fileName), buffer);

  return Response.json({ url: `/uploads/products/${fileName}` });
}
