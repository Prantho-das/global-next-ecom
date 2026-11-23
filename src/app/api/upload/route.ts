import { createHash, randomUUID } from "crypto";
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

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? "";
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim() ?? "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim() ?? "";
  if (cloudName !== "" && apiKey !== "" && apiSecret !== "") {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "ecom/products";
    const sigPayload = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = createHash("sha1").update(sigPayload).digest("hex");

    const cloudForm = new FormData();
    cloudForm.append("file", file);
    cloudForm.append("api_key", apiKey);
    cloudForm.append("timestamp", String(timestamp));
    cloudForm.append("folder", folder);
    cloudForm.append("signature", signature);

    const cloudRes = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
      { method: "POST", body: cloudForm },
    );
    const cloudJson = (await cloudRes.json()) as {
      secure_url?: string;
      error?: { message?: string };
    };
    if (!cloudRes.ok || !cloudJson.secure_url) {
      return Response.json(
        { error: cloudJson.error?.message ?? "Cloud upload failed" },
        { status: 502 },
      );
    }
    return Response.json({ url: cloudJson.secure_url });
  }

  const ext = EXT_BY_MIME[file.type] ?? "bin";
  const fileName = `${randomUUID()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, fileName), buffer);

  return Response.json({ url: `/uploads/products/${fileName}` });
}
