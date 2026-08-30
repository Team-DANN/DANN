// Shared motion primitives — one deliberate language across every section:
// text elements move vertically, cards/modules move horizontally (alternating left/right).
export const EASE = [0.22, 1, 0.36, 1]; // ease-out-expo

export const slideUp = (distance = 36) => ({
  hidden: { opacity: 0, y: distance },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
});

export const slideDown = (distance = 36) => ({
  hidden: { opacity: 0, y: -distance },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
});

export const slideLeft = (distance = 70) => ({
  // enters travelling from the left
  hidden: { opacity: 0, x: -distance },
  visible: { opacity: 1, x: 0, transition: { duration: 0.75, ease: EASE } },
});

export const slideRight = (distance = 70) => ({
  // enters travelling from the right
  hidden: { opacity: 0, x: distance },
  visible: { opacity: 1, x: 0, transition: { duration: 0.75, ease: EASE } },
});

export const staggerContainer = (stagger = 0.12, delay = 0) => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
});