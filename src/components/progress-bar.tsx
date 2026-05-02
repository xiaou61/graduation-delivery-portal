export function ProgressBar({ value }: { value: number }) {
  const normalized = Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : 0;

  return (
    <div
      aria-label={`当前进度 ${normalized}%`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={normalized}
      className="progress-track"
      role="progressbar"
    >
      <div className="progress-fill" style={{ width: `${normalized}%` }} />
    </div>
  );
}
