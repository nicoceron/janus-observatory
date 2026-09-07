import { Composition } from "remotion";
import { SequenceReview } from "./scenes/SequenceReview";
import { ObserverReview } from "./scenes/ObserverReview";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="JanusSequenceReview"
        component={SequenceReview}
        durationInFrames={2325}
        fps={30}
        width={1440}
        height={1080}
      />
      <Composition
        id="ObserverForwardReverse"
        component={ObserverReview}
        durationInFrames={360}
        fps={30}
        width={1440}
        height={1080}
      />
    </>
  );
};
