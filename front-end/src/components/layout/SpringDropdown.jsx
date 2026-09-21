// magazine-front/src/components/layout/SpringDropdown.jsx
//
// A small wrapper that animates a header dropdown open/closed with react-spring
// (fade + slight rise + scale from the top), including an exit animation. Keeps
// the existing dropdown class so the look is unchanged.
import { useTransition, animated, to } from '@react-spring/web';

function SpringDropdown({ open, className, children, style, ...rest }) {
  const transitions = useTransition(open, {
    from: { opacity: 0, y: -8, scale: 0.96 },
    enter: { opacity: 1, y: 0, scale: 1 },
    leave: { opacity: 0, y: -8, scale: 0.96 },
    config: { tension: 320, friction: 26 },
  });

  return transitions(
    (s, item) =>
      item && (
        <animated.div
          className={className}
          style={{
            ...style,
            opacity: s.opacity,
            transform: to([s.y, s.scale], (y, sc) => `translate3d(0, ${y}px, 0) scale(${sc})`),
            transformOrigin: 'top center',
          }}
          {...rest}
        >
          {children}
        </animated.div>
      )
  );
}

export default SpringDropdown;
