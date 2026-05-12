import Link from "next/link";
import { FileImage, FileVideo } from "lucide-react";
import { formatFileSize } from "@/src/lib/format";
import type { FeedbackAttachment } from "@/src/lib/types";

export function FeedbackAttachmentCard({
  attachment,
  href
}: {
  attachment: FeedbackAttachment;
  href: string;
}) {
  const isImage = attachment.mimeType.startsWith("image/");
  const isVideo = attachment.mimeType.startsWith("video/");

  return (
    <Link className="attachment-history-card" href={href} target="_blank">
      <div className="attachment-history-media">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={attachment.originalName} src={href} />
        ) : isVideo ? (
          <video controls preload="metadata">
            <source src={href} type={attachment.mimeType} />
          </video>
        ) : (
          <div className="attachment-preview-fallback">
            {attachment.mimeType.startsWith("video/") ? (
              <FileVideo size={22} />
            ) : (
              <FileImage size={22} />
            )}
            <span>附件预览</span>
          </div>
        )}
      </div>
      <div className="attachment-history-meta">
        <strong title={attachment.originalName}>{attachment.originalName}</strong>
        <span>{formatFileSize(attachment.size)}</span>
      </div>
    </Link>
  );
}
