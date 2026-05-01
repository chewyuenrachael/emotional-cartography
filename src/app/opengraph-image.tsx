import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Emotional Cartography — a machine-learning study of three years of vlogs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 100%)',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          padding: '64px 80px',
          fontFamily: 'serif',
        }}
      >
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: 18,
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          Emotional Cartography
        </div>

        <div
          style={{
            fontSize: 76,
            lineHeight: 1.05,
            marginTop: 48,
            maxWidth: 960,
            fontWeight: 400,
            display: 'flex',
          }}
        >
          The useful axes of variation in a voice may not be the ones humans have words for.
        </div>

        <div style={{ flex: 1 }} />

        {/* Three cluster-colored dots — the same palette the live map uses. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{ width: 22, height: 22, borderRadius: 999, background: '#FFE66D' }} />
            <div style={{ width: 22, height: 22, borderRadius: 999, background: '#4ECDC4' }} />
            <div style={{ width: 22, height: 22, borderRadius: 999, background: '#C77DFF' }} />
          </div>
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: 20,
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            14 clips · 7 cities · 3 years · agglomerative clustering
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
