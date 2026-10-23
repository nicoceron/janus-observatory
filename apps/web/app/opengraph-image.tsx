import { ImageResponse } from 'next/og';

export const alt = 'Janus Observatory: ten futures, one question. Would anyone know we were here?';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: 'stretch',
        background: '#07100e',
        color: '#ecf2ed',
        display: 'flex',
        fontFamily: 'Arial, sans-serif',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
      }}
    >
      <div
        style={{
          background:
            'radial-gradient(circle at 74% 49%, #5e8290 0 5%, #245447 5.5% 9%, #10251f 9.5% 12%, transparent 12.5%), radial-gradient(circle at 74% 49%, transparent 0 21%, rgba(184,241,92,.22) 21.2% 21.5%, transparent 21.8% 32%, rgba(207,231,215,.12) 32.2% 32.5%, transparent 32.8%), radial-gradient(circle at 82% 18%, rgba(255,255,255,.75) 0 1px, transparent 2px)',
          backgroundSize: 'auto, auto, 56px 56px',
          display: 'flex',
          inset: 0,
          position: 'absolute',
        }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '58px 64px',
          position: 'relative',
          width: '70%',
        }}
      >
        <div style={{ alignItems: 'center', display: 'flex', fontSize: 22, gap: 16 }}>
          <div
            style={{
              alignItems: 'center',
              border: '2px solid #b8f15c',
              borderRadius: 999,
              color: '#b8f15c',
              display: 'flex',
              height: 42,
              justifyContent: 'center',
              width: 42,
            }}
          >
            J
          </div>
          <span style={{ fontWeight: 600 }}>Janus Observatory</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 84,
              fontWeight: 500,
              letterSpacing: -3,
              lineHeight: 0.98,
            }}
          >
            <span>Ten futures.</span>
            <span>One question.</span>
          </div>
          <span style={{ color: '#d0dfbe', fontSize: 30, marginTop: 28 }}>
            Would anyone know we were here?
          </span>
        </div>
        <span style={{ color: '#92a299', fontSize: 22 }}>
          Possible futures of our civilization, seen from another star.
        </span>
      </div>
    </div>,
    size,
  );
}
