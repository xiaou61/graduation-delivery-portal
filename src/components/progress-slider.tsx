"use client";

import { useId, useState } from "react";
import type { CSSProperties } from "react";

function normalizeProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function ProgressSlider({ defaultValue = 0 }: { defaultValue?: number }) {
  const sliderId = useId();
  const numberId = `${sliderId}-number`;
  const [value, setValue] = useState(() => normalizeProgress(defaultValue));

  function updateProgress(nextValue: string) {
    setValue(normalizeProgress(Number(nextValue)));
  }

  return (
    <div className="progress-control">
      <input name="progress" type="hidden" value={value} />
      <div className="progress-control-top">
        <span className="field-label">当前进度</span>
        <output className="progress-value" htmlFor={sliderId}>
          {value}%
        </output>
      </div>
      <input
        aria-label="当前进度"
        className="progress-slider"
        id={sliderId}
        max="100"
        min="0"
        onInput={(event) => updateProgress(event.currentTarget.value)}
        step="1"
        style={{ "--progress": `${value}%` } as CSSProperties}
        type="range"
        value={value}
      />
      <div className="progress-control-bottom">
        <span>0</span>
        <input
          aria-label="进度百分比"
          className="progress-number"
          id={numberId}
          max="100"
          min="0"
          onInput={(event) => updateProgress(event.currentTarget.value)}
          type="number"
          value={value}
        />
        <span>100</span>
      </div>
    </div>
  );
}
