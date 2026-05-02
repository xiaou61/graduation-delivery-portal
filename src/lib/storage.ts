import { mkdir, stat, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export interface StoredFile {
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
}

const uploadRoot = path.join(process.cwd(), "storage", "uploads");

const materialExtensions = new Set([
  ".7z",
  ".avi",
  ".bat",
  ".bmp",
  ".bz2",
  ".c",
  ".cmd",
  ".conf",
  ".cpp",
  ".cs",
  ".csv",
  ".css",
  ".doc",
  ".docx",
  ".env",
  ".et",
  ".gif",
  ".go",
  ".gz",
  ".h",
  ".hpp",
  ".html",
  ".ini",
  ".ipynb",
  ".java",
  ".jpeg",
  ".jpg",
  ".js",
  ".json",
  ".jsx",
  ".kt",
  ".log",
  ".md",
  ".mov",
  ".mp4",
  ".pdf",
  ".php",
  ".png",
  ".ppt",
  ".pptx",
  ".properties",
  ".ps1",
  ".py",
  ".rar",
  ".rb",
  ".rs",
  ".scss",
  ".sh",
  ".sql",
  ".sqlite",
  ".sqlite3",
  ".swift",
  ".tar",
  ".tgz",
  ".ts",
  ".tsx",
  ".txt",
  ".vue",
  ".webm",
  ".webp",
  ".wps",
  ".xls",
  ".xlsx",
  ".xml",
  ".xz",
  ".yaml",
  ".yml",
  ".zip"
]);

const feedbackExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".mp4",
  ".mov",
  ".webm"
]);

const feedbackMimePrefixes = ["image/", "video/"];

export function getUploadPath(storedName: string) {
  return path.join(uploadRoot, storedName);
}

export async function fileExists(storedName: string) {
  try {
    await stat(getUploadPath(storedName));
    return true;
  } catch {
    return false;
  }
}

export async function saveUploadedFile(
  file: File,
  scope: "material" | "feedback"
): Promise<StoredFile> {
  if (!file || file.size <= 0) {
    throw new Error("请选择要上传的文件");
  }

  const originalName = sanitizeFileName(file.name || "upload.bin");
  const extension = path.extname(originalName).toLowerCase();
  const maxSize =
    scope === "material" ? 120 * 1024 * 1024 : 80 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error(
      scope === "material"
        ? "材料文件不能超过 120MB"
        : "反馈附件不能超过 80MB"
    );
  }

  if (scope === "material" && !materialExtensions.has(extension)) {
    throw new Error("材料文件类型不支持");
  }

  if (scope === "feedback") {
    const mimeLooksValid = feedbackMimePrefixes.some((prefix) =>
      file.type.startsWith(prefix)
    );
    if (!feedbackExtensions.has(extension) || !mimeLooksValid) {
      throw new Error("反馈附件只支持图片或视频");
    }
  }

  await mkdir(uploadRoot, { recursive: true });

  const storedName = `${scope}-${Date.now()}-${randomUUID()}${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(getUploadPath(storedName), bytes);

  return {
    originalName,
    storedName,
    mimeType: file.type || "application/octet-stream",
    size: file.size
  };
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").slice(0, 160);
}
