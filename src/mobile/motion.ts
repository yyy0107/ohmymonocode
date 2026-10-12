// The mobile shell's motion vocabulary lives in src/shared/lib/springs.ts so
// skinned desktop reads the same springs; motion.test.ts keeps motion.css in sync.
export {
  MOTION as MOBILE_MOTION,
  SPRINGS as MOBILE_SPRINGS,
  springDuration,
  springEasing,
  springTransition,
  type Spring,
  type SpringLaunch,
} from "../shared/lib/springs";
