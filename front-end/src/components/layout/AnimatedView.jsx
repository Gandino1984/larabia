// magazine-front/src/components/layout/AnimatedView.jsx
//
// Cinematic entrance for a whole page view: a soft fade + upward rise driven by
// react-spring. Remounted per view (keyed in App), so it plays on every
// navigation. The transform resolves to `none` once settled so that any
// position:fixed descendants (e.g. the back button) keep their viewport anchor.
import { useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';

function AnimatedView({ children }) {
  const [style, api] = useSpring(() => ({
    opacity: 0,
    y: 22,
    config: { tension: 190, friction: 26 },
  }));

  useEffect(() => {
    api.start({ opacity: 1, y: 0, from: { opacity: 0, y: 22 } });
  }, [api]);

  return (
    <animated.div
      className="animated-view"
      style={{
        opacity: style.opacity,
        // Once the rise has essentially finished, drop the transform entirely so
        // fixed-position children are anchored to the viewport again.
        transform: style.y.to((v) => (Math.abs(v) < 0.2 ? 'none' : `translate3d(0, ${v}px, 0)`)),
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </animated.div>
  );
}

export default AnimatedView;
