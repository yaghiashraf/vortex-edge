import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#0a0e17',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
          fontWeight: 900,
          fontSize: 16,
          color: '#22c55e',
          letterSpacing: -1,
          border: '2px solid #1e2d3d',
        }}
      >
        VE
      </div>
    ),
    { ...size }
  );
}
