import {
  AbsoluteFill,
  CanvasImage,
  Interactive,
  staticFile,
  useCurrentFrame,
} from "remotion";

export function ObserverReview() {
  const frame = useCurrentFrame();
  const sample = frame < 180 ? frame + 1 : 360 - frame;
  return (
    <AbsoluteFill style={{ backgroundColor: "#02050a" }}>
      <CanvasImage
        name="Authored observer action"
        src={staticFile(
          `review/observer/frame-${String(sample).padStart(4, "0")}.png`,
        )}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1440,
          height: 960,
        }}
      />
      <Interactive.Div
        name="Playback direction"
        style={{
          position: "absolute",
          left: 64,
          top: 988,
          color: "#e8e9e5",
          fontSize: 34,
          fontFamily: "sans-serif",
        }}
      >
        {frame < 180
          ? "Observe → settle → optical axis"
          : "Reverse scrub · identical authored poses"}
      </Interactive.Div>
    </AbsoluteFill>
  );
}
