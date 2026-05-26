// magazine-front/src/components/layout/AnimatedLogo.jsx
import { useEffect } from 'react';
import { useSpring, animated, to } from '@react-spring/web';

function AnimatedLogo({ src, alt, className }) {
  const [{ x, y, r }, api] = useSpring(() => ({
    x: 0, y: 0, r: 0,
  }));

  useEffect(() => {
    api.start({
      from: { x: 0, y: 0, r: 0 },
      to: [
        { x: -10, y: -5, r: -4, config: { duration: 60 } },
        { x:  10, y:  5, r:  4, config: { duration: 60 } },
        { x: -10, y:  4, r: -4, config: { duration: 60 } },
        { x:  10, y: -4, r:  4, config: { duration: 60 } },
        { x:  -7, y: -3, r: -3, config: { duration: 60 } },
        { x:   7, y:  3, r:  3, config: { duration: 60 } },
        { x:  -3, y: -1, r: -1, config: { duration: 60 } },
        { x:   0, y:  0, r:  0, config: { duration: 60 } },
        { x:   0, y:  0, r:  0, config: { duration: 2520 } },
      ],
      loop: true,
    });
  }, []);

  return (
    <animated.img
      src={src}
      alt={alt}
      className={className}
      style={{
        transform: to([x, y, r], (x, y, r) => `translateX(${x}px) translateY(${y}px) rotate(${r}deg)`),
      }}
    />
  );
}

export default AnimatedLogo;
