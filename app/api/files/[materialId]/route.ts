import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession } from "@/src/lib/auth";
import {
  getOrderBundleByToken,
  isShareOrderAccessible,
  readDatabase,
  recordAccessLog
} from "@/src/lib/db";
import { getUploadPath } from "@/src/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ materialId: string }> }
) {
  const { materialId } = await context.params;
  const database = await readDatabase();
  const material = database.materials.find((item) => item.id === materialId);
  if (!material) return notFound();

  const token = request.nextUrl.searchParams.get("token");
  const admin = await hasAdminSession();

  if (token) {
    const bundle = await getOrderBundleByToken(token);
    if (!bundle || bundle.order.id !== material.orderId || !material.visible) {
      return notFound();
    }
  } else if (!admin) {
    return notFound();
  } else {
    const order = database.orders.find((item) => item.id === material.orderId);
    if (!order || (!isShareOrderAccessible(order) && !admin)) return notFound();
  }

  const filePath = getUploadPath(material.storedName);
  try {
    const fileStat = await stat(filePath);
    const stream = Readable.toWeb(createReadStream(filePath));

    if (token) {
      await recordAccessLog({
        orderId: material.orderId,
        type: "download",
        materialId: material.id,
        userAgent: request.headers.get("user-agent") || undefined,
        ip: request.headers.get("x-forwarded-for") || undefined
      });
    }

    return new Response(stream as BodyInit, {
      headers: {
        "Content-Type": material.mimeType || "application/octet-stream",
        "Content-Length": fileStat.size.toString(),
        "Content-Disposition": contentDisposition(material.originalName)
      }
    });
  } catch {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }
}

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

function contentDisposition(fileName: string) {
  return `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

