/**
 * Shared loading skeleton primitives. Server components — no client JS.
 * Used by loading.tsx files so the shell renders immediately during nav.
 */

export function SkelBox({
  height,
  width,
  className,
}: {
  height?: number | string;
  width?: number | string;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        height,
        width,
        borderRadius: 16,
        background: "linear-gradient(90deg, var(--progress-bg), var(--hover-bg), var(--progress-bg))",
        backgroundSize: "200% 100%",
        animation: "skel-shimmer 1.4s ease-in-out infinite",
      }}
    />
  );
}

export function SkelLine({
  width,
  height = 12,
  className,
}: {
  width?: number | string;
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        width: width ?? "60%",
        height,
        borderRadius: 6,
        background: "linear-gradient(90deg, var(--progress-bg), var(--hover-bg), var(--progress-bg))",
        backgroundSize: "200% 100%",
        animation: "skel-shimmer 1.4s ease-in-out infinite",
      }}
    />
  );
}

export function SkelCard({ height = 120 }: { height?: number }) {
  return (
    <div
      className="glass rounded-2xl p-5"
      style={{ height, display: "flex", flexDirection: "column", gap: 10 }}
    >
      <SkelLine width={80} height={10} />
      <SkelLine width={140} height={24} />
      <SkelLine width={100} height={10} />
    </div>
  );
}

export function SkelPageHeader() {
  return (
    <div className="flex items-center justify-between">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <SkelLine width={80} height={10} />
        <SkelLine width={140} height={24} />
      </div>
      <SkelLine width={120} height={36} />
    </div>
  );
}
