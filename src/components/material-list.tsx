import Link from "next/link";
import { Download, Eye, EyeOff, Trash2 } from "lucide-react";
import {
  deleteMaterialAction,
  toggleMaterialVisibilityAction
} from "@/src/actions/admin";
import {
  formatDateTime,
  formatFileSize,
  materialCategoryLabels
} from "@/src/lib/format";
import type { Material, MaterialCategory } from "@/src/lib/types";
import { MaterialCategoryBadge } from "@/src/components/badges";

const categoryOrder: MaterialCategory[] = ["program", "thesis", "other"];

export function AdminMaterialList({
  orderId,
  materials
}: {
  orderId: string;
  materials: Material[];
}) {
  if (!materials.length) {
    return <p className="empty-text">还没有上传材料。</p>;
  }

  return (
    <div className="stack">
      {categoryOrder.map((category) => {
        const items = materials.filter((item) => item.category === category);
        if (!items.length) return null;
        return (
          <section key={category} className="subsection">
            <h3>{materialCategoryLabels[category]}</h3>
            <div className="item-list">
              {items.map((item) => (
                <article className="list-item" key={item.id}>
                  <div>
                    <div className="item-title-row">
                      <strong>{item.title}</strong>
                      <MaterialCategoryBadge category={item.category} />
                      {item.version ? <span className="version-pill">{item.version}</span> : null}
                      {item.isLatest ? <span className="latest-pill">最新</span> : null}
                      {!item.visible ? <span className="muted-pill">隐藏</span> : null}
                    </div>
                    <p>{item.description || item.originalName}</p>
                    {item.releaseNotes ? (
                      <p className="release-notes">{item.releaseNotes}</p>
                    ) : null}
                    <small>
                      {formatFileSize(item.size)} · {formatDateTime(item.createdAt)}
                    </small>
                  </div>
                  <div className="item-actions">
                    <Link className="icon-button" href={`/api/files/${item.id}`}>
                      <span className="sr-only">下载{item.title}</span>
                      <Download size={17} />
                    </Link>
                    <form
                      action={toggleMaterialVisibilityAction.bind(
                        null,
                        orderId,
                        item.id
                      )}
                    >
                      <button
                        aria-label={item.visible ? `隐藏${item.title}` : `显示${item.title}`}
                        className="icon-button"
                        title={item.visible ? "隐藏材料" : "显示材料"}
                        type="submit"
                      >
                        {item.visible ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </form>
                    <form action={deleteMaterialAction.bind(null, orderId, item.id)}>
                      <button
                        aria-label={`删除${item.title}`}
                        className="icon-button danger"
                        title="删除材料"
                        type="submit"
                      >
                        <Trash2 size={17} />
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
