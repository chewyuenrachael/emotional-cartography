'use client';

import { useMemo } from 'react';
import { useJourneyStore } from '@/stores/journeyStore';

export interface ClipPoint {
  id: string;
  mfcc: number[]; // 13-D
  cluster: number;
  city: string;
}

interface ClusterMapProps {
  points: ClipPoint[];
}

// Cluster ids → colors (mirrors the per-chapter colors in journey.json)
const CLUSTER_COLORS: Record<number, string> = {
  0: '#FFE66D',
  1: '#4ECDC4',
  3: '#C77DFF',
};

const CLUSTER_LABELS: Record<number, string> = {
  0: 'Contemplative',
  1: 'Reflective',
  3: 'Energetic',
};

// 2D PCA: center → covariance → top-2 eigenvectors via power iteration.
// Deterministic (seeded with the all-ones unit vector) so the scatter
// looks the same on every page load.
function pca2d(data: number[][]): [number, number][] {
  const n = data.length;
  const d = data[0]?.length ?? 0;
  if (n < 2 || d < 2) return data.map(() => [0, 0]);

  const mean = new Array(d).fill(0);
  for (const row of data) for (let i = 0; i < d; i++) mean[i] += row[i] / n;
  const X = data.map((row) => row.map((v, i) => v - mean[i]));

  const cov = Array.from({ length: d }, () => new Array(d).fill(0));
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += X[k][i] * X[k][j];
      cov[i][j] = s / Math.max(n - 1, 1);
    }
  }

  const ev1 = powerIter(cov);
  const cov2 = cov.map((row, i) =>
    row.map((v, j) => v - ev1.value * ev1.vector[i] * ev1.vector[j]),
  );
  const ev2 = powerIter(cov2);

  return X.map(
    (row) => [dot(row, ev1.vector), dot(row, ev2.vector)] as [number, number],
  );
}

function powerIter(M: number[][], iters = 200) {
  const d = M.length;
  let v = normalize(new Array(d).fill(1));
  for (let it = 0; it < iters; it++) v = normalize(matVec(M, v));
  return { vector: v, value: dot(v, matVec(M, v)) };
}

function matVec(M: number[][], v: number[]) {
  return M.map((row) => dot(row, v));
}

function dot(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function normalize(v: number[]) {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
}

const SIZE = 360;
const PAD = 36;

export function ClusterMap({ points }: ClusterMapProps) {
  const currentClipId = useJourneyStore((s) => s.currentClipId);

  const projected = useMemo(() => {
    if (points.length < 2) return [];
    const xy = pca2d(points.map((p) => p.mfcc));
    const xs = xy.map((p) => p[0]);
    const ys = xy.map((p) => p[1]);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);
    const xSpan = xMax - xMin || 1;
    const ySpan = yMax - yMin || 1;
    return xy.map(
      ([x, y]) =>
        [
          ((x - xMin) / xSpan) * 2 - 1,
          ((y - yMin) / ySpan) * 2 - 1,
        ] as [number, number],
    );
  }, [points]);

  if (points.length < 2) return null;

  const project = (nx: number, ny: number): [number, number] => [
    PAD + ((nx + 1) / 2) * (SIZE - 2 * PAD),
    PAD + (1 - (ny + 1) / 2) * (SIZE - 2 * PAD),
  ];

  const clustersPresent = Array.from(new Set(points.map((p) => p.cluster))).sort(
    (a, b) => a - b,
  );

  return (
    <section
      data-section="cluster-map"
      className="relative z-10 py-16 sm:py-20 md:py-28 px-4 sm:px-8"
    >
      <div className="max-w-2xl mx-auto text-center">
        <h3 className="text-xs uppercase tracking-widest text-white/50 font-mono mb-3">
          The structure, plotted
        </h3>
        <p className="text-sm sm:text-base text-white/70 mb-8 max-w-md mx-auto leading-relaxed">
          Every clip projected from 13 MFCC dimensions to 2 via PCA.
          Color is the Agglomerative cluster the algorithm assigned —
          not a label I picked.
        </p>

        <div className="flex justify-center">
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="w-full max-w-[360px] aspect-square"
            role="img"
            aria-label="Two-dimensional PCA scatter of audio clips, colored by cluster"
          >
            {/* Axes */}
            <line
              x1={PAD}
              y1={SIZE - PAD}
              x2={SIZE - PAD}
              y2={SIZE - PAD}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
            />
            <line
              x1={PAD}
              y1={PAD}
              x2={PAD}
              y2={SIZE - PAD}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
            />
            <text
              x={SIZE - PAD}
              y={SIZE - PAD + 14}
              fill="rgba(255,255,255,0.3)"
              fontSize={9}
              textAnchor="end"
              fontFamily="monospace"
            >
              PC1
            </text>
            <text
              x={PAD - 4}
              y={PAD - 4}
              fill="rgba(255,255,255,0.3)"
              fontSize={9}
              textAnchor="end"
              fontFamily="monospace"
            >
              PC2
            </text>

            {/* Points */}
            {points.map((p, i) => {
              const [nx, ny] = projected[i];
              const [cx, cy] = project(nx, ny);
              const color = CLUSTER_COLORS[p.cluster] ?? '#888';
              const isCurrent = p.id === currentClipId;
              return (
                <g key={p.id}>
                  {isCurrent && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={14}
                      fill={color}
                      fillOpacity={0.18}
                    />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isCurrent ? 7 : 5}
                    fill={color}
                    fillOpacity={isCurrent ? 1 : 0.65}
                    stroke={isCurrent ? '#fff' : 'none'}
                    strokeWidth={isCurrent ? 1.5 : 0}
                  />
                  {isCurrent && (
                    <text
                      x={cx + 12}
                      y={cy + 4}
                      fill="#fff"
                      fontSize={11}
                      fontFamily="monospace"
                    >
                      {p.city}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/60 font-mono">
          {clustersPresent.map((c) => (
            <div key={c} className="flex items-center gap-2">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ background: CLUSTER_COLORS[c] ?? '#888' }}
              />
              <span>{CLUSTER_LABELS[c] ?? `Cluster ${c}`}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
