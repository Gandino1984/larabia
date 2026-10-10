// magazine-front/src/components/common/MedalIcon.jsx
//
// Full-colour subscriber medal: blue ribbon (two crossed straps) holding a
// gold medal with a star. No background — used on avatars (SubscriberMark),
// the user card and the "Suscriptor/a" label.
import { useId } from 'react';

function MedalIcon({ size, className, title }) {
  const uid = useId().replace(/:/g, '');
  const gold = `medal-gold-${uid}`;
  const shine = `medal-shine-${uid}`;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbe38e" />
          <stop offset="55%" stopColor="#d4a72c" />
          <stop offset="100%" stopColor="#a87d12" />
        </linearGradient>
        <linearGradient id={shine} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff6cc" />
          <stop offset="100%" stopColor="#f0cd5c" />
        </linearGradient>
      </defs>
      {/* Ribbon: two blue straps crossing behind the medal */}
      <path d="M4.2 0.8h5.2l4.3 9.4-3.7 1.9z" fill="#1e40af" />
      <path d="M19.8 0.8h-5.2l-4.3 9.4 3.7 1.9z" fill="#2563eb" />
      <path d="M6.6 0.8h1.4l4.1 9-1 0.5z" fill="#93c5fd" opacity="0.55" />
      {/* Medal */}
      <circle cx="12" cy="15.6" r="7" fill={`url(#${gold})`} stroke="#8a6508" strokeWidth="0.9" />
      <circle cx="12" cy="15.6" r="5" fill="none" stroke="#fbe9a6" strokeWidth="0.7" opacity="0.8" />
      {/* Star */}
      <path
        d="M12 11.9l1.12 2.27 2.5.36-1.81 1.77.43 2.49L12 17.62l-2.24 1.17.43-2.49-1.81-1.77 2.5-.36z"
        fill={`url(#${shine})`}
        stroke="#9a7210"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default MedalIcon;
