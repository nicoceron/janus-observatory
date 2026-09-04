import { ImageResponse } from 'next/og';

export const alt =
  'Janus Observatory — ten futures, one system, explored through incomplete evidence';
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
          borderRight: '1px solid rgba(207,231,215,.16)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '58px 64px',
          position: 'relative',
          width: '64%',
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
          <span style={{ fontWeight: 700, letterSpacing: 3 }}>JANUS OBSERVATORY</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: '#b8f15c', fontSize: 20, letterSpacing: 4 }}>
            AN INTERACTIVE ATLAS OF POSSIBILITIES
          </span>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 84,
              fontWeight: 500,
              letterSpacing: -6,
              lineHeight: 0.92,
            }}
          >
            <span>Ten futures.</span>
            <span>One system.</span>
          </div>
        </div>
        <span style={{ color: '#92a299', fontSize: 19, letterSpacing: 2 }}>
          POSSIBILITIES · NOT FORECASTS · EVIDENCE DEPENDS ON THE INSTRUMENT
        </span>
      </div>
      <div
        style={{
          alignItems: 'center',
          color: '#b8f15c',
          display: 'flex',
          fontFamily: 'monospace',
          fontSize: 18,
          justifyContent: 'center',
          letterSpacing: 5,
          position: 'relative',
          width: '36%',
          writingMode: 'vertical-rl',
        }}
      >
        STORY · OBSERVATORY · ATLAS
      </div>
    </div>,
    size,
  );
}
