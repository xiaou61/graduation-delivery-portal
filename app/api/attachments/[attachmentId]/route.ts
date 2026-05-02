import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession } from "@/src/lib/auth";
import { getOrderBundleByToken, readDatabase } from "@/src/lib/db";
import { getUploadPath } from "@/src/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ attachmentId: string }> }
) {
  const { attachmentId } = await context.params;
  const database = await readDatabase();
  const attachment = database.feedbackAttachments.find(
    (item) => item.id === attachmentId
  );
  if (!attachment) return notFound();

  const feedback = database.feedbackItems.find(
    (item) => item.id === attachment.feedbackId
  );
  if (!feedback) return notFound();

  const token = request.nextUrl.searchParams.get("token");
  const admin = await hasAdminSession();
  if (token) {
    const bundle = await getOrderBundleByToken(token);
    if (!bundle || bundle.order.id !== feedback.orderId) return notFound();
  } else if (!admin) {
    return notFound();
  }

  const filePath = getUploadPath(attachment.storedName);
  try {
    const fileStat = await stat(filePath);
    const stream = Readable.toWeb(createReadStream(filePath));
    return new Response(stream as BodyInit, {
      headers: {
        "Content-Type": attachment.mimeType || "application/octet-stream",
        "Content-Length": fileStat.size.toString(),
        "Content-Disposition": contentDisposition(attachment.originalName)
      }
    });
  } catch {
    return NextResponse.json({ error: "附件不存在" }, { status: 404 });
  }
}

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

function contentDisposition(fileName: string) {
  return `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

