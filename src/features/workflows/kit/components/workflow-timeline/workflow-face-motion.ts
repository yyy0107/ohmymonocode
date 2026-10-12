import type { StepRunStatus } from "../workflow-graph/types.js";

export type FaceState = "waiting" | "scanning" | "content" | "sad";
export type EyeExpression = "dots" | "pill" | "happy" | "sleepy" | "focused" | "sad" | "confused";
export function faceState(status: StepRunStatus | undefined): FaceState {
  return status === "running"
    ? "scanning"
    : status === "done"
      ? "content"
      : status === "failed"
        ? "sad"
        : "waiting";
}
export const BASE_EXPRESSION: Record<FaceState, EyeExpression> = {
  waiting: "dots",
  scanning: "pill",
  content: "happy",
  sad: "sad",
};
/** Status expressions remain; decorative idle choreography no longer owns timers. */
export function startFaceMotion(face: SVGSVGElement, state: FaceState): () => void {
  const render = () => {
    face.dataset.expression = BASE_EXPRESSION[state];
    face.dataset.motion = "idle";
    face.style.setProperty("--wf-face-x", "0px");
    face.style.setProperty("--wf-face-y", "0px");
  };
  render();
  return render;
}
