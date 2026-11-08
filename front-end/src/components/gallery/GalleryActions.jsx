// magazine-front/src/components/gallery/GalleryActions.jsx
//
// What readers do with an obra or an illustration of an exhibition: «Me
// gusta» (with how many), the comments (illustrations only — `onComments`)
// and «Compartir». Liking and commenting need an account (ExhibitionPage
// says so); sharing is for everyone. `dark`: on the viewer's black.
import { useTranslation } from 'react-i18next';
import { ThumbsUp, MessageCircle, Share2 } from 'lucide-react';

function GalleryActions({ item, kind, onLike, onComments, onShare, dark = false }) {
  const { t } = useTranslation();
  const name = kind === 'piece' ? t('gallery.actions.piece', 'esta obra') : t('gallery.actions.work', 'esta ilustración');
  return (
    <div className={`gallery-actions ${dark ? 'gallery-actions--dark' : ''}`} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={`gallery-action ${item.liked ? 'is-on' : ''}`}
        onClick={onLike}
        aria-pressed={!!item.liked}
        aria-label={t('gallery.actions.like', { count: item.likes || 0, name, defaultValue: 'Me gusta {{name}} ({{count}})' })}
        title={t('engagement.label.like', 'Me gusta')}
      >
        <ThumbsUp size={16} fill={item.liked ? 'currentColor' : 'none'} aria-hidden="true" />
        <span className="gallery-action__count">{item.likes || 0}</span>
      </button>
      {onComments && (
        <button
          type="button"
          className="gallery-action"
          onClick={onComments}
          aria-label={t('gallery.actions.comments', { count: item.comments || 0, defaultValue: 'Comentarios ({{count}})' })}
          title={t('engagement.label.comments', 'Comentarios')}
        >
          <MessageCircle size={16} aria-hidden="true" />
          <span className="gallery-action__count">{item.comments || 0}</span>
        </button>
      )}
      <button
        type="button"
        className="gallery-action"
        onClick={onShare}
        aria-label={t('gallery.actions.share', { name, defaultValue: 'Compartir {{name}}' })}
        title={t('engagement.label.share', 'Compartir')}
      >
        <Share2 size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

export default GalleryActions;
