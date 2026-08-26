import React from "react";

export function Skeleton({
  w = "100%",
  h = 14,
  r = 10,
  style,
}: {
  w?: string | number;
  h?: string | number;
  r?: string | number;
  style?: React.CSSProperties;
}) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="card" style={{ display: "grid", gap: 10 }}>
      <Skeleton w="46%" h={16} r={10} />
      <div style={{ display: "grid", gap: 8 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="row" style={{ borderStyle: "dashed" }}>
            <Skeleton w="42%" h={13} r={8} />
            <Skeleton w="28%" h={12} r={999} />
          </div>
        ))}
      </div>
      <Skeleton w="100%" h={38} r={14} />
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="card" style={{ display: "grid", gap: 12 }}>
      <Skeleton w="32%" h={10} r={999} />
      <Skeleton w="58%" h={22} r={10} />
      <Skeleton w="88%" h={12} r={8} />
      <div style={{ display: "flex", gap: 8 }}>
        <Skeleton w="32%" h={28} r={14} />
        <Skeleton w="28%" h={28} r={14} />
      </div>
      <Skeleton w="100%" h={10} r={999} />
    </div>
  );
}
