export function fmtTime(ms: number): string {
  return new Date(ms).toLocaleString();
}

export function fmtDuration(ms: number | null | undefined): string {
  const v = ms ?? 0;
  if (v < 1) return '<1ms';
  if (v < 1000) return `${v.toFixed(1)}ms`;
  return `${(v / 1000).toFixed(2)}s`;
}

export function fmtPct(p: number): string {
  return `${p.toFixed(2)}%`;
}
