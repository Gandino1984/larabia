// magazine-front/src/components/admin/NewsletterTab.jsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMagazine } from '../../app_context/MagazineContext';
import { useUI } from '../../app_context/UIContext';
import { useAuth } from '../../app_context/AuthContext';
import axiosInstance from '../../utils/axiosConfig';
import { Users, Send, CheckSquare, Square, Search } from 'lucide-react';
import './NewsletterTab.css';

function NewsletterTab() {
  const { t } = useTranslation();
  const { articles } = useMagazine();
  const { showSuccess, showError } = useUI();
  const { currentUser } = useAuth();
  const authHeader = { headers: { 'x-user-id': currentUser?.id_user } };

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
    axiosInstance.get('/user/newsletter-subscribers', authHeader)
      .then(res => setSubscriberCount(res.data.data.count))
      .catch(() => setSubscriberCount('?'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id_user]);

  const toggleArticle = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (selectedIds.length === 0) {
      showError(t('admin.newsletter.pickOne', 'Selecciona al menos un artículo para recomendar'));
      return;
    }
    if (subscriberCount === 0) {
      showError(t('admin.newsletter.noSubscribers', 'No hay suscriptores activos'));
      return;
    }
    if (!confirm(t('admin.newsletter.confirm', { count: subscriberCount }))) return;

    setSending(true);
    setSendResult(null);
    try {
      const res = await axiosInstance.post('/user/send-newsletter', {
        articleIds: selectedIds,
        introText: introText.trim()
      }, authHeader);
      const { sent, failed } = res.data.data;
      setSendResult({ sent, failed });
      showSuccess(t('admin.newsletter.sentTo', { count: sent }));
      setSelectedIds([]);
      setIntroText('');
    } catch (err) {
      showError(t('admin.newsletter.sendError', 'Error al enviar el newsletter'));
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
            {subscriberCount === null ? t('common.states.loading', 'Cargando') : t('admin.newsletter.subscribers', { count: subscriberCount })}
          </span>
        </div>
        <p className="newsletter-tab-desc">
          {t('admin.newsletter.hint', 'Selecciona los artículos publicados que quieres recomendar y escribe un mensaje opcional.')}
        </p>
      </div>

      {/* Intro text */}
      <div className="nt-section">
        <label className="nt-label">{t('admin.newsletter.intro', 'Mensaje de introducción')} <span>({t('admin.newsletter.optional', 'opcional')})</span></label>
        <textarea
          className="nt-intro"
          rows={3}
          placeholder={t('admin.newsletter.introPlaceholder', 'Escribe un breve mensaje para acompañar las recomendaciones...')}
          value={introText}
          onChange={e => setIntroText(e.target.value)}
        />
      </div>

      {/* Article picker */}
      <div className="nt-section">
        <label className="nt-label">
          {t('admin.newsletter.articles', 'Artículos a recomendar')}
          {selectedIds.length > 0 && <span className="nt-selected-count">{t('admin.newsletter.selected', { count: selectedIds.length })}</span>}
        </label>

        <div className="nt-search">
          <Search size={16} />
          <input
            type="text"
            placeholder={t('admin.newsletter.searchPlaceholder', 'Buscar artículo...')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="nt-article-list">
          {filteredArticles.length === 0 && (
            <p className="nt-empty">{search ? t('admin.newsletter.noMatches', 'No hay artículos publicados con ese término.') : t('admin.newsletter.noArticles', 'No hay artículos publicados.')}</p>
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
            {t('admin.newsletter.sentTo', { count: sendResult.sent })}
            {sendResult.failed > 0 && ` · ${t('admin.newsletter.failed', { count: sendResult.failed })}`}
          </p>
        )}
        <button
          className="nt-send-btn"
          onClick={handleSend}
          disabled={sending || selectedIds.length === 0}
          type="button"
        >
          <Send size={18} />
          {sending ? t('admin.newsletter.sending', 'Enviando...') : t('admin.newsletter.send', 'Enviar recomendaciones')}
        </button>
      </div>
    </div>
  );
}

export default NewsletterTab;
