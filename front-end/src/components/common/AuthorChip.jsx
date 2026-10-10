// magazine-front/src/components/common/AuthorChip.jsx
//
// Author photo + name, the site-wide standard (same measures as the hero): a
// 38px round photo (46px from 768px) with an initial-letter fallback when
// there's no photo or it fails to load, and the name in bold. Clicking it — or
// Enter / Space — opens the author's card. `tone` adapts the photo border and
// fallback to light or dark backgrounds; the name inherits the text color.
import { useState } from 'react';
import { useUI } from '../../app_context/UIContext';
import './AuthorChip.css';
import SubscriberMark from './SubscriberMark';

const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';

export const getAuthorImageUrl = (author) => {
  const img = author?.image_user;
  if (!img) return null;
  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  return `${apiUrl}/user/image/${encodeURIComponent(img)}`;
};

function AuthorChip({ author, name, clickable = true, tone = 'light' }) {
  const { openAuthorCard } = useUI();
  const [imgError, setImgError] = useState(false);
  const displayName = author?.name_user || name || '';
  const url = getAuthorImageUrl(author);
  const canOpen = clickable && !!author?.id_user;

  const open = (e) => {
    e.stopPropagation();
    openAuthorCard(author);
  };
  const interactive = canOpen
    ? {
        role: 'button',
        tabIndex: 0,
        onClick: open,
        onKeyDown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(e); }
        },
      }
    : {};

  return (
    <span
      className={`author-chip author-chip--${tone} ${canOpen ? 'author-chip--clickable' : ''}`}
      {...interactive}
    >
      <SubscriberMark userId={author?.id_user}>
        {url && !imgError ? (
          <img
            src={url}
            alt=""
            className="author-chip__avatar"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="author-chip__avatar author-chip__avatar--fallback" aria-hidden="true">
            {displayName.charAt(0).toUpperCase() || '?'}
          </span>
        )}
      </SubscriberMark>
      <span className="author-chip__name">{displayName}</span>
    </span>
  );
}

export default AuthorChip;
