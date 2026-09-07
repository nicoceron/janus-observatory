import {
  AbsoluteFill,
  CanvasImage,
  Interactive,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { TransitionSeries } from "@remotion/transitions";

function ReviewFrame({ index }: { index: number }) {
  return (
    <AbsoluteFill style={{ backgroundColor: "#02050a" }}>
      <CanvasImage
        name={`Browser state ${index + 1}`}
        src={staticFile(
          `review/browser/desktop-${String(index + 1).padStart(2, "0")}.png`,
        )}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1440,
          height: 900,
        }}
      />
      <Interactive.Div
        name="Review identification"
        style={{
          position: "absolute",
          left: 64,
          top: 942,
          color: "#e8e9e5",
          fontSize: 38,
          fontFamily: "sans-serif",
        }}
      >
        Janus Observatory · browser state {String(index + 1).padStart(2, "0")} /
        31
      </Interactive.Div>
      <Interactive.Div
        name="Review boundary"
        style={{
          position: "absolute",
          left: 64,
          top: 1002,
          color: "#aab6c3",
          fontSize: 24,
          fontFamily: "sans-serif",
        }}
      >
        Captured runtime frame · interpretive staging, canonical evidence
      </Interactive.Div>
    </AbsoluteFill>
  );
}

export function SequenceReview() {
  // Each shot is independently editable; screenshots are produced by the E2E
  // acceptance capture, not reconstructed product UI or invented evidence.
  useCurrentFrame();
  return (
    <TransitionSeries>
      {Array.from({ length: 31 }, (_, index) => (
        <TransitionSeries.Sequence
          key={index}
          durationInFrames={75}
          name={`State ${index + 1}`}
        >
          <ReviewFrame index={index} />
        </TransitionSeries.Sequence>
      ))}
    </TransitionSeries>
  );
}
