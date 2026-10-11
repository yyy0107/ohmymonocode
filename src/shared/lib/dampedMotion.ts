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
