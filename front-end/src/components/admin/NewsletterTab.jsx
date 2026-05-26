// magazine-front/src/components/admin/NewsletterTab.jsx
import { useState, useEffect } from 'react';
import { useMagazine } from '../../app_context/MagazineContext';
import { useUI } from '../../app_context/UIContext';
import axiosInstance from '../../utils/axiosConfig';
import { Users, Send, CheckSquare, Square, Search } from 'lucide-react';
import './NewsletterTab.css';

function NewsletterTab() {
  const { articles } = useMagazine();
  const { showSuccess, showError } = useUI();

  const [subscriberCount, setSubscriberCount] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [introText, setIntroText] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const publishedArticles = articles.filter(a => a.status_article === 'published');
  const filteredArticles = publishedArticles.filter(a =>
    a.title_article.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    axiosInstance.get('/user/newsletter-subscribers')
      .then(res => setSubscriberCount(res.data.data.count))
      .catch(() => setSubscriberCount('?'));
  }, []);

  const toggleArticle = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (selectedIds.length === 0) {
      showError('Selecciona al menos un artículo para recomendar');
      return;
    }
    if (subscriberCount === 0) {
      showError('No hay suscriptores activos');
      return;
    }
    if (!confirm(`¿Enviar recomendaciones a ${subscriberCount} suscriptor${subscriberCount !== 1 ? 'es' : ''}?`)) return;

    setSending(true);
    setSendResult(null);
    try {
      const res = await axiosInstance.post('/user/send-newsletter', {
        articleIds: selectedIds,
        introText: introText.trim()
      });
      const { sent, failed } = res.data.data;
      setSendResult({ sent, failed });
      showSuccess(`Enviado a ${sent} suscriptor${sent !== 1 ? 'es' : ''}`);
      setSelectedIds([]);
      setIntroText('');
    } catch (err) {
      showError('Error al enviar el newsletter');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="newsletter-tab">
      <div className="newsletter-tab-header">
        <div className="subscriber-badge">
          <Users size={18} />
          <span>
            {subscriberCount === null ? 'Cargando...' : `${subscriberCount} suscriptor${subscriberCount !== 1 ? 'es' : ''}`}
          </span>
        </div>
        <p className="newsletter-tab-desc">
          Selecciona los artículos publicados que quieres recomendar y escribe un mensaje opcional.
        </p>
      </div>

      {/* Intro text */}
      <div className="nt-section">
        <label className="nt-label">Mensaje de introducción <span>(opcional)</span></label>
        <textarea
          className="nt-intro"
          rows={3}
          placeholder="Escribe un breve mensaje para acompañar las recomendaciones..."
          value={introText}
          onChange={e => setIntroText(e.target.value)}
        />
      </div>

      {/* Article picker */}
      <div className="nt-section">
        <label className="nt-label">
          Artículos a recomendar
          {selectedIds.length > 0 && <span className="nt-selected-count">{selectedIds.length} seleccionado{selectedIds.length !== 1 ? 's' : ''}</span>}
        </label>

        <div className="nt-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar artículo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="nt-article-list">
          {filteredArticles.length === 0 && (
            <p className="nt-empty">No hay artículos publicados{search ? ' con ese término' : ''}.</p>
          )}
          {filteredArticles.map(article => {
            const selected = selectedIds.includes(article.id_article);
            return (
              <button
                key={article.id_article}
                className={`nt-article-row ${selected ? 'selected' : ''}`}
                onClick={() => toggleArticle(article.id_article)}
                type="button"
              >
                <span className="nt-checkbox">
                  {selected ? <CheckSquare size={18} /> : <Square size={18} />}
                </span>
                <span className="nt-article-info">
                  <span className="nt-article-title">{article.title_article}</span>
                  <span className="nt-article-meta">
                    {article.category_article} &middot; {article.authors?.map(a => a.name_user).join(', ') || article.author_name}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Send button */}
      <div className="nt-actions">
        {sendResult && (
          <p className="nt-result">
            Enviado a <strong>{sendResult.sent}</strong> suscriptor{sendResult.sent !== 1 ? 'es' : ''}
            {sendResult.failed > 0 && ` · ${sendResult.failed} fallido${sendResult.failed !== 1 ? 's' : ''}`}
          </p>
        )}
        <button
          className="nt-send-btn"
          onClick={handleSend}
          disabled={sending || selectedIds.length === 0}
          type="button"
        >
          <Send size={18} />
          {sending ? 'Enviando...' : 'Enviar recomendaciones'}
        </button>
      </div>
    </div>
  );
}

export default NewsletterTab;
