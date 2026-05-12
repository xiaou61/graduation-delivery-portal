"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, FileImage, FileVideo, Upload, X } from "lucide-react";
import { severityLabels } from "@/src/lib/format";
import { SubmitButton } from "@/src/components/submit-button";

const feedbackIdeas = [
  "登录后页面空白，无法继续操作",
  "上传文件后没有成功保存",
  "某个按钮点击后没有反应",
  "移动端排版错位，影响使用"
];

type LocalAttachment = {
  id: string;
  file: File;
  previewUrl?: string;
};

export function FeedbackFormPanel({
  action,
  hasError
}: {
  action: (formData: FormData) => void | Promise<void>;
  hasError: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [description, setDescription] = useState("");
  const [descriptionLength, setDescriptionLength] = useState(0);

  useEffect(() => {
    return () => {
      attachments.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [attachments]);

  const totalSize = useMemo(
    () => attachments.reduce((sum, item) => sum + item.file.size, 0),
    [attachments]
  );

  function syncInput(files: File[]) {
    const transfer = new DataTransfer();
    files.forEach((file) => transfer.items.add(file));
    if (inputRef.current) {
      inputRef.current.files = transfer.files;
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []).slice(0, 5);
    setAttachments((current) => {
      current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });

      const next = selected.map((file) => ({
        id: `${file.name}-${file.lastModified}-${file.size}`,
        file,
        previewUrl: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined
      }));
      syncInput(next.map((item) => item.file));
      return next;
    });
  }

  function removeAttachment(id: string) {
    setAttachments((current) => {
      const next = current.filter((item) => item.id !== id);
      const removed = current.find((item) => item.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      syncInput(next.map((item) => item.file));
      return next;
    });
  }

  function applyIdea(text: string) {
    setDescription(text);
    setDescriptionLength(text.length);
  }

  return (
    <>
      {hasError ? (
        <p className="error-text">
          <AlertCircle size={16} />
          反馈提交失败，请检查标题、描述和附件后重试。
        </p>
      ) : null}
      <form className="feedback-form" action={action}>
        <label>
          问题标题
          <input name="title" required placeholder="例如：登录后页面空白" />
        </label>
        <label>
          严重程度
          <select name="severity" defaultValue="medium">
            {Object.entries(severityLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="feedback-idea-row" aria-label="常见问题快捷填充">
          {feedbackIdeas.map((idea) => (
            <button
              className="ghost-button quick-fill-button"
              key={idea}
              onClick={() => applyIdea(idea)}
              type="button"
            >
              {idea}
            </button>
          ))}
        </div>
        <label>
          问题描述
          <textarea
            name="description"
            rows={5}
            required
            maxLength={3000}
            onChange={(event) => {
              setDescription(event.target.value);
              setDescriptionLength(event.target.value.length);
            }}
            placeholder="尽量写清楚出现步骤、期望效果、实际效果。"
            value={description}
          />
          <span className="field-hint">
            说清楚在哪个页面、点了什么、实际出现了什么，处理速度会更快。
          </span>
          <span className="field-counter">{descriptionLength}/3000</span>
        </label>
        <label>
          图片或视频
          <span className="file-upload-shell">
            <input
              ref={inputRef}
              className="file-input"
              name="attachments"
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
            />
            <span className="file-upload-control">
              <Upload size={17} />
              选择截图或录屏
            </span>
          </span>
          <span className="field-hint">最多 5 个附件，单个附件不超过 80MB。</span>
        </label>

        {attachments.length ? (
          <div className="attachment-preview-panel">
            <div className="attachment-preview-header">
              <strong>已选择 {attachments.length} 个附件</strong>
              <span>{formatBytes(totalSize)}</span>
            </div>
            <div className="attachment-preview-grid">
              {attachments.map((item) => (
                <article className="attachment-preview-card" key={item.id}>
                  <div className="attachment-preview-media">
                    {item.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt={item.file.name} src={item.previewUrl} />
                    ) : item.file.type.startsWith("video/") ? (
                      <div className="attachment-preview-fallback">
                        <FileVideo size={22} />
                        <span>视频文件</span>
                      </div>
                    ) : (
                      <div className="attachment-preview-fallback">
                        <FileImage size={22} />
                        <span>附件</span>
                      </div>
                    )}
                  </div>
                  <div className="attachment-preview-meta">
                    <strong title={item.file.name}>{item.file.name}</strong>
                    <span>{formatBytes(item.file.size)}</span>
                  </div>
                  <button
                    aria-label={`移除 ${item.file.name}`}
                    className="icon-button attachment-remove-button"
                    onClick={() => removeAttachment(item.id)}
                    type="button"
                  >
                    <X size={15} />
                  </button>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        <SubmitButton className="primary-button" pendingLabel="提交中...">
          提交反馈
        </SubmitButton>
      </form>
    </>
  );
}

function formatBytes(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}
