import { Composition } from "remotion";
import { FPS } from "./kit";
import { Tech, techFrames } from "./Tech";

export function Root() {
  return (
    <>
      <Composition id="Tech" component={Tech} durationInFrames={techFrames} fps={FPS} width={1920} height={1080} />
    </>
  );
}
