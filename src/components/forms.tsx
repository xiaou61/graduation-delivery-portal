import type { Order } from "@/src/lib/types";
import { orderStatusLabels } from "@/src/lib/format";
import { ProgressSlider } from "@/src/components/progress-slider";

export function OrderFields({ order }: { order?: Order }) {
  return (
    <>
      <div className="form-grid">
        <label>
          客户姓名
          <input
            name="customerName"
            required
            defaultValue={order?.customerName}
            placeholder="例如：张同学"
          />
        </label>
        <label>
          项目标题
          <input
            name="projectTitle"
            required
            defaultValue={order?.projectTitle}
            placeholder="例如：基于 Web 的毕业设计管理系统"
          />
        </label>
        <label>
          交付日期
          <input name="dueDate" type="date" required defaultValue={order?.dueDate} />
        </label>
        <div className="field-block">
          <ProgressSlider defaultValue={order?.progress ?? 0} />
        </div>
        <label>
          状态
          <select name="status" defaultValue={order?.status ?? "in_progress"}>
            {Object.entries(orderStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          分享链接过期时间
          <input
            name="shareExpiresAt"
            type="date"
            defaultValue={order?.shareExpiresAt?.slice(0, 10) || ""}
          />
        </label>
      </div>
      <label>
        给客户看的备注
        <textarea
          name="customerNote"
          rows={3}
          defaultValue={order?.customerNote || ""}
          placeholder="例如：请优先下载最新程序版本。"
        />
      </label>
      <label>
        后台备注
        <textarea
          name="adminNote"
          rows={3}
          defaultValue={order?.adminNote || ""}
          placeholder="这里客户看不到。"
        />
      </label>
      <label className="check-row">
        <input name="shareEnabled" type="checkbox" defaultChecked={order?.shareEnabled ?? true} />
        启用客户专属链接
      </label>
    </>
  );
}
