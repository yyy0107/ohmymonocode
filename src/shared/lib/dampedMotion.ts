/** Exact critically damped motion: retarget without resetting position or velocity. */
export function dampedMotion(
  position: number,
  velocity: number,
  target: number,
  seconds: number,
  frequency: number,
) {
  const offset = position - target;
  const impulse = velocity + frequency * offset;
  const decay = Math.exp(-frequency * seconds);
  return {
    position: target + (offset + impulse * seconds) * decay,
    velocity: (velocity - frequency * impulse * seconds) * decay,
  };
}

/** Third-order damping keeps acceleration continuous when streamed targets change. */
export function smoothFollowMotion(
  position: number,
  velocity: number,
  acceleration: number,
  target: number,
  seconds: number,
  frequency: number,
) {
  const offset = position - target;
  const linear = velocity + frequency * offset;
  const quadratic = (acceleration + 2 * frequency * velocity + frequency ** 2 * offset) / 2;
  const displacement = offset + linear * seconds + quadratic * seconds ** 2;
  const derivative = linear + 2 * quadratic * seconds;
  const decay = Math.exp(-frequency * seconds);
  return {
    position: target + displacement * decay,
    velocity: (derivative - frequency * displacement) * decay,
    acceleration: (2 * quadratic - 2 * frequency * derivative + frequency ** 2 * displacement) * decay,
  };
}

export const FOLLOW_MOTION_FREQUENCY = 27;
export type FollowMotionState = {
  position: number;
  velocity: number;
  acceleration: number;
  frequency: number;
};

/** Shared by streamed scrolling and sent bubbles, including gradual catch-up. */
export function advanceFollowMotion(state: FollowMotionState, target: number, seconds: number): FollowMotionState {
  const next = smoothFollowMotion(
    state.position, state.velocity, state.acceleration, target, seconds, state.frequency,
  );
  const backlog = Math.abs(target - next.position);
  const requested = FOLLOW_MOTION_FREQUENCY * (2 - Math.exp(-((backlog / 320) ** 2)));
  return {
    ...next,
    frequency: state.frequency + (requested - state.frequency) * (1 - Math.exp(-seconds * 8)),
  };
}
