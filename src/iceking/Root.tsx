import React from "react";
import { Composition } from "remotion";
import { IceKing } from "./IceKing";
import { TOTAL } from "./story";

export const IceRoot: React.FC = () => (
  <Composition id="IceKing" component={IceKing} durationInFrames={TOTAL} fps={30} width={1080} height={1920} />
);
