// magazine-front/src/components/magazine/SectionPreviewRow.jsx
//
// One section-preview block: a title + a horizontal, snap-scrolling slideshow of
// cards (image + description). Desktop shows prev/next arrows; on mobile the
// track is swipeable and cards take a more vertical shape.
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function PreviewCard({ item, onClick }) {
  const { t } = useTranslation();
  const [broken, setBroken] = useState(false);
  const bg = broken ? '/logoFondoNegro.jpg' : item.image;

  return (
    <button type="button" className="section-preview__card" onClick={() => onClick(item)}>
      <div className="section-preview__img" style={{ backgroundImage: `url(${bg})` }}>
        {/* Hidden img to detect broken covers and fall back to the logo. */}
        <img src={item.image} alt="" style={{ display: 'none' }} onError={() => setBroken(true)} />
        <span className="section-preview__kind">
          {item.kind === 'project' ? t('sectionPreviews.project') : t('sectionPreviews.article')}
        </span>
      </div>
      <div className="section-preview__body">
        <h3 className="section-preview__card-title">{item.title}</h3>
        {item.description && <p className="section-preview__desc">{item.description}</p>}
      </div>
    </button>
  );
}

function SectionPreviewRow({ title, items, onItemClick }) {
  const trackRef = useRef(null);

  const scrollByCards = (dir) => {
    const track = trackRef.current;
    if (!track) return;
    // Scroll by roughly one card width (first card + gap).
    const card = track.querySelector('.section-preview__card');
    const amount = card ? card.offsetWidth + 20 : track.clientWidth * 0.8;
    track.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  return (
    <section className="section-preview">
      <div className="section-preview__head">
        <h2 className="section-preview__title">{title}</h2>
        {items.length > 1 && (
          <div className="section-preview__arrows">
            <button
              type="button"
              className="section-preview__arrow"
              onClick={() => scrollByCards(-1)}
              aria-label="Anterior"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              className="section-preview__arrow"
              onClick={() => scrollByCards(1)}
              aria-label="Siguiente"
            >
              <ChevronRight size={22} />
            </button>
          </div>
        )}
      </div>

      <div className="section-preview__track" ref={trackRef}>
        {items.map((item) => (
          <PreviewCard key={item.key} item={item} onClick={onItemClick} />
        ))}
      </div>
    </section>
  );
}

export default SectionPreviewRow;
