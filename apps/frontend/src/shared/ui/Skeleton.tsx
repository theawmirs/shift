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

export function TasksSkeleton() {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Telemetry Progress Skeleton */}
      <div className="card" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Skeleton w="38%" h={22} r={10} />
          <Skeleton w="25%" h={34} r={12} />
        </div>
        <Skeleton w="100%" h={10} r={999} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          <Skeleton w="100%" h={44} r={12} />
          <Skeleton w="100%" h={44} r={12} />
          <Skeleton w="100%" h={44} r={12} />
        </div>
      </div>

      {/* Control Bar Skeleton */}
      <div className="card" style={{ padding: "12px 14px", display: "grid", gap: 10 }}>
        <Skeleton w="100%" h={38} r={12} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Skeleton w="40%" h={30} r={10} />
          <Skeleton w="35%" h={30} r={10} />
        </div>
      </div>

      {/* Task Rows Skeleton */}
      <div className="card" style={{ display: "grid", gap: 10 }}>
        <Skeleton w="30%" h={16} r={8} />
        <div style={{ display: "grid", gap: 8 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="row"
              style={{
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderStyle: "dashed",
              }}
            >
              <Skeleton w={20} h={20} r={999} />
              <div style={{ flex: 1, display: "grid", gap: 6 }}>
                <Skeleton w="65%" h={14} r={8} />
                <Skeleton w="40%" h={11} r={6} />
              </div>
              <Skeleton w={50} h={24} r={8} />
              <Skeleton w={30} h={30} r={8} />
            </div>
          ))}
        </div>
      </div>
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
