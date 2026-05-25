import React from "react";

interface QRBoxProps {
  size?: number;
  value?: string;
}

export default function QRBox({ size = 132, value = "NSS-XXX-000" }: QRBoxProps) {
  return (
    <div className="inline-flex flex-col items-center gap-1.5">
      <div className="p-2.5 bg-white rounded-xl border border-line shadow-sm">
        <div style={{ width: size, height: size }} className="relative overflow-hidden rounded-md">
          <svg viewBox="0 0 21 21" width={size} height={size} className="block">
            {Array.from({ length: 21 }).map((_, y) =>
              Array.from({ length: 21 }).map((_, x) => {
                const k = (x * 73 + y * 131 + value.length * 17) % 9;
                const corner = (x < 3 && y < 3) || (x > 17 && y < 3) || (x < 3 && y > 17);
                const fill = corner || k < 3;
                return fill ? (
                  <rect key={`${x},${y}`} x={x} y={y} width="1" height="1" fill="#0A2540" />
                ) : null;
              })
            )}
            {([[0, 0], [14, 0], [0, 14]] as [number, number][]).map(([x, y], i) => (
              <g key={i}>
                <rect x={x} y={y} width="7" height="7" fill="#0A2540" />
                <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
                <rect x={x + 2} y={y + 2} width="3" height="3" fill="#0A2540" />
              </g>
            ))}
          </svg>
        </div>
      </div>
      <div className="text-[10px] font-mono text-ink-mute tracking-wide">{value}</div>
    </div>
  );
}
