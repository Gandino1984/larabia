// magazine-front/src/components/admin/HScrollEditor.jsx
import { useState, useRef, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, ArrowLeft, ArrowRight, Upload, MousePointer, Link as LinkIcon, Volume2, X, Code2, AudioWaveform, Edit } from 'lucide-react';
import { isPieceComplete, parseSoundscape } from '../../paisaje/integration/soundscape';
import { AUDIO_ACCEPT, isAcceptedAudio } from '../../utils/audioUpload';
import LoadFailBoundary from '../common/LoadFailBoundary';
import './HScrollEditor.css';

// Paisaje sonoro panels (engine by Cristian Vergara): editor loaded on demand.
const PaisajeEditor = lazy(() => import('../../paisaje/integration/PaisajeEditor'));

function HScrollEditor({ panels, onPanelsChange, onUploadPanel, onUploadAudio }) {
  const { t } = useTranslation();
  const [draggingIndex, setDraggingIndex] = useState(null);
  // Paisaje sonoro panel being created (index null) or edited.
  const [paisajeModal, setPaisajeModal] = useState(null); // { index, draft } | null
  const scrollContainerRef = useRef(null);
  const [showPanelTypeModal, setShowPanelTypeModal] = useState(false);
  const [showInteractiveModal, setShowInteractiveModal] = useState(false);
  const [pendingPanelIndex, setPendingPanelIndex] = useState(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  // Images on their way up: { [panel key]: 0–100 } (each panel shows its own).
  const [imageUploads, setImageUploads] = useState({});
  const [audioStopPanel, setAudioStopPanel] = useState(null);
  const [audioMode, setAudioMode] = useState('once');
  const [showIframeModal, setShowIframeModal] = useState(false);
  const [iframeHtml, setIframeHtml] = useState('');
  const [iframeAspectRatio, setIframeAspectRatio] = useState('16:9');

  // Helper function to construct full image URL
  const getImageUrl = (url) => {
    if (!url) return '';
    // If URL is already absolute (starts with http:// or https://), return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // Otherwise, construct full URL using VITE_API_URL
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3007';
    return `${apiUrl}${url.startsWith('/') ? url : '/' + url}`;
  };

  const addPanel = () => {
    setShowPanelTypeModal(true);
  };

  const addSimplePanel = () => {
    const newPanel = {
      tempId: `temp-${Date.now()}`,
      block_type: 'comic_panel',
      image_url: '',
      image_alt: '',
      panel_order: panels.length,
      is_interactive: false
    };
    onPanelsChange([...panels, newPanel]);
    setShowPanelTypeModal(false);
  };

  // Parse src URL from a raw iframe HTML string (or return as-is if already a URL)
  const parseIframeSrc = (input) => {
    const match = input.match(/src=["']([^"']+)["']/i);
    return match ? match[1] : input.trim();
  };

  const addIframePanel = () => {
    setShowPanelTypeModal(false);
    const newPanel = {
      tempId: `temp-${Date.now()}`,
      block_type: 'comic_panel',
      image_url: '',
      image_alt: '',
      panel_order: panels.length,
      is_interactive: false,
      interaction_type: 'iframe',
      interaction_data: '',
      image_caption: '16:9',
    };
    const newPanels = [...panels, newPanel];
    onPanelsChange(newPanels);
    setPendingPanelIndex(newPanels.length - 1);
    setIframeHtml('');
    setIframeAspectRatio('16:9');
    setShowIframeModal(true);
  };

  const handleConfigureIframe = () => {
    const src = parseIframeSrc(iframeHtml);
    if (!src) return;
    const updatedPanels = [...panels];
    updatedPanels[pendingPanelIndex] = {
      ...updatedPanels[pendingPanelIndex],
      interaction_data: src,
      image_caption: iframeAspectRatio,
    };
    onPanelsChange(updatedPanels);
    setShowIframeModal(false);
    setPendingPanelIndex(null);
    setIframeHtml('');
  };

  const editIframePanel = (index) => {
    setPendingPanelIndex(index);
    setIframeHtml(panels[index].interaction_data || '');
    setIframeAspectRatio(panels[index].image_caption || '16:9');
    setShowIframeModal(true);
  };

  const addInteractivePanel = () => {
    setShowPanelTypeModal(false);
    const newPanel = {
      tempId: `temp-${Date.now()}`,
      block_type: 'comic_panel',
      image_url: '',
      image_alt: '',
      panel_order: panels.length,
      is_interactive: true,
      interaction_type: '',
      interaction_data: ''
    };
    const newPanels = [...panels, newPanel];
    onPanelsChange(newPanels);
    setPendingPanelIndex(newPanels.length - 1);
    setShowInteractiveModal(true);
  };

  // ---- Paisaje sonoro panels: the piece fills the panel ----
  const addPaisajePanel = () => {
    setShowPanelTypeModal(false);
    setPaisajeModal({ index: null, draft: null });
  };

  const editPaisajePanel = (index) => {
    setPaisajeModal({ index, draft: parseSoundscape(panels[index].soundscape_data) });
  };

  const savePaisajePanel = () => {
    const { index, draft } = paisajeModal;
    if (!isPieceComplete(draft)) return;
    if (index === null) {
      onPanelsChange([...panels, {
        tempId: `temp-${Date.now()}`,
        block_type: 'comic_panel',
        image_url: draft.imageUrl || '',
        image_alt: '',
        panel_order: panels.length,
        is_interactive: false,
        soundscape_data: draft
      }]);
    } else {
      const updated = [...panels];
      updated[index] = { ...updated[index], image_url: draft.imageUrl || updated[index].image_url, soundscape_data: draft };
      onPanelsChange(updated);
    }
    setPaisajeModal(null);
  };

  const removePanel = (index) => {
    const updatedPanels = panels.filter((_, i) => i !== index);
    onPanelsChange(updatedPanels);
  };

  // A panel's identity (its index changes when panels are moved).
  const panelKey = (panel) => panel?.id_block || panel?.tempId;
  const setImageUpload = (key, pct) => setImageUploads((u) => {
    const next = { ...u };
    if (pct == null) delete next[key]; else next[key] = pct;
    return next;
  });

  const handleImageUpload = async (index, file, input) => {
    // Let the same file be picked again (otherwise the input doesn't fire).
    if (input) input.value = '';
    if (!file) {
      console.log('❌ No file provided to handleImageUpload');
      return;
    }

    // DEBUG: Log file details
    console.log('🖼️ handleImageUpload called:', {
      index,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      panelType: panels[index]?.is_interactive ? 'interactive' : 'simple'
    });

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      console.error('❌ Invalid file type:', file.type);
      alert(t('hscroll.editor.invalidImage', { name: file.name, type: file.type, defaultValue: 'Por favor selecciona una imagen válida (JPEG, PNG, WebP).\nArchivo seleccionado: {{name}} ({{type}})' }));
      return;
    }

    // Validate file size (max 20 MB; the server makes it WebP)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(t('hscroll.editor.imageTooLarge', 'La imagen es demasiado grande. Máximo 20 MB'));
      return;
    }

    const key = panelKey(panels[index]);
    if (imageUploads[key] != null) return; // already uploading into this panel
    try {
      setImageUpload(key, 0);
      const result = await onUploadPanel(index, file, (pct) => setImageUpload(key, pct));
      if (result && result.image_url) {
        // Into the panels as they are NOW (an update from the panels of
        // before the upload undid what happened meanwhile — e.g. another
        // panel's image uploaded at the same time).
        onPanelsChange((current) => current.map((p) => (
          panelKey(p) === key ? { ...p, image_url: result.image_url } : p
        )));
      }
    } catch (error) {
      console.error('❌ Error uploading panel:', error);
      // The error card already says why (MagazineContext.uploadBlockImage).
    } finally {
      setImageUpload(key, null);
    }
  };

  const movePanel = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= panels.length) return;

    const updatedPanels = [...panels];
    const [movedPanel] = updatedPanels.splice(fromIndex, 1);
    updatedPanels.splice(toIndex, 0, movedPanel);

    // Update panel_order
    const reorderedPanels = updatedPanels.map((panel, idx) => ({
      ...panel,
      panel_order: idx
    }));

    onPanelsChange(reorderedPanels);
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -400, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 400, behavior: 'smooth' });
    }
  };

  const configureInteraction = (type, data, audioConfig = {}) => {
    if (pendingPanelIndex !== null) {
      const updatedPanels = [...panels];
      updatedPanels[pendingPanelIndex] = {
        ...updatedPanels[pendingPanelIndex],
        interaction_type: type,
        interaction_data: data,
        ...(type === 'audio' && {
          audio_stop_panel: audioConfig.stopPanel,
          audio_mode: audioConfig.mode || 'once'
        })
      };
      onPanelsChange(updatedPanels);
    }
    setShowInteractiveModal(false);
    setPendingPanelIndex(null);
    // Reset audio settings
    setAudioStopPanel(null);
    setAudioMode('once');
  };

  const handleAudioUpload = async (file) => {
    if (!file) {
      console.log('❌ No file provided to handleAudioUpload');
      return;
    }

    // DEBUG: Log file details
    console.log('🔊 handleAudioUpload called:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });

    // Any size and format (WAV recommended): the server stores it as AAC with
    // normalised volume and discards the original.
    if (!isAcceptedAudio(file)) {
      alert(t('audio.upload.badFormat', { name: file.name, defaultValue: 'Formato de audio no admitido: {{name}}. Usa WAV, FLAC, MP3, M4A, OGG…' }));
      return;
    }

    try {
      setUploadingAudio(true);
      setAudioProgress(0);
      console.log('📤 Uploading audio file:', file.name);
      const audioUrl = await onUploadAudio(file, (pct) => setAudioProgress(pct));
      console.log('✅ Audio uploaded successfully:', audioUrl);
      configureInteraction('audio', audioUrl, {
        stopPanel: audioStopPanel,
        mode: audioMode
      });
    } catch (error) {
      // MagazineContext already shows the reason.
      console.error('❌ Error uploading audio:', error);
    } finally {
      setUploadingAudio(false);
      setAudioProgress(0);
    }
  };

  const editPanelInteraction = (index) => {
    setPendingPanelIndex(index);
    setShowInteractiveModal(true);
  };

  return (
    <div className="hscroll-editor">
      <div className="hscroll-header">
        <h3>{t('hscroll.editor.title', 'Editor de cómic · lectura horizontal')}</h3>
        <p className="hscroll-description">
          {t('hscroll.editor.description', 'Sube imágenes para crear tu cómic. Las imágenes se mostrarán en formato horizontal con altura fija.')}
        </p>
      </div>

      <div className="hscroll-controls">
        <button type="button" className="btn-scroll" onClick={scrollLeft} title={t('hscroll.editor.scrollLeft', 'Desplazar a la izquierda')}>
          <ArrowLeft size={20} />
        </button>

        <div className="hscroll-container" ref={scrollContainerRef}>
          <div className="hscroll-panels">
            {panels.map((panel, index) => (
              <div key={panel.id_block || panel.tempId} className={`hscroll-panel ${panel.is_interactive ? 'interactive' : ''}`}>
                <div className="panel-number">{index + 1}</div>
                {imageUploads[panelKey(panel)] != null && (
                  <div
                    className="panel-upload-progress"
                    role="progressbar"
                    aria-valuenow={imageUploads[panelKey(panel)]}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={t('hscroll.editor.uploadingImage', 'Subiendo la imagen')}
                  >
                    <span className="panel-upload-progress__pct">
                      {imageUploads[panelKey(panel)] < 100
                        ? `${imageUploads[panelKey(panel)]}%`
                        : t('hscroll.editor.processingImage', 'Procesando…')}
                    </span>
                    <div className="panel-upload-progress__track">
                      <div className="panel-upload-progress__bar" style={{ width: `${imageUploads[panelKey(panel)]}%` }} />
                    </div>
                    <span className="panel-upload-progress__label">{t('hscroll.editor.uploadingImage', 'Subiendo la imagen')}</span>
                  </div>
                )}
                {panel.soundscape_data && (
                  <div className="panel-badge panel-badge--paisaje" title={t('paisaje.comic.panelBadge', 'Panel paisaje sonoro')}>
                    <AudioWaveform size={16} />
                  </div>
                )}
                {(panel.is_interactive || panel.interaction_type === 'iframe') && (
                  <div className="panel-badge">
                    {panel.interaction_type === 'link' ? <LinkIcon size={16} /> : panel.interaction_type === 'audio' ? <Volume2 size={16} /> : panel.interaction_type === 'iframe' ? <Code2 size={16} /> : <MousePointer size={16} />}
                  </div>
                )}

                <div className="panel-content">
                  {panel.interaction_type === 'iframe' ? (
                    <div className="panel-iframe-placeholder">
                      <Code2 size={40} />
                      <span>{t('hscroll.editor.iframePanel', 'Panel iframe')}</span>
                      {panel.interaction_data && (
                        <p className="panel-iframe-url">{panel.interaction_data}</p>
                      )}
                    </div>
                  ) : panel.image_url ? (
                    <img
                      src={getImageUrl(panel.image_url)}
                      alt={panel.image_alt || t('hscroll.panelTitle', { n: index + 1, defaultValue: 'Panel {{n}}' })}
                      className="panel-image"
                    />
                  ) : (
                    <label className="panel-upload">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(index, e.target.files[0], e.target)}
                        style={{ display: 'none' }}
                      />
                      <Upload size={40} />
                      <span>{t('hscroll.editor.uploadImage', 'Subir imagen')}</span>
                    </label>
                  )}
                </div>

                <div className="panel-actions">
                  {index > 0 && (
                    <button
                      type="button"
                      className="btn-panel-action"
                      onClick={() => movePanel(index, index - 1)}
                      title={t('hscroll.editor.moveLeft', 'Mover a la izquierda')}
                    >
                      <ArrowLeft size={16} />
                    </button>
                  )}

                  {index < panels.length - 1 && (
                    <button
                      type="button"
                      className="btn-panel-action"
                      onClick={() => movePanel(index, index + 1)}
                      title={t('hscroll.editor.moveRight', 'Mover a la derecha')}
                    >
                      <ArrowRight size={16} />
                    </button>
                  )}

                  {panel.is_interactive && (
                    <button
                      type="button"
                      className="btn-panel-action btn-configure"
                      onClick={() => editPanelInteraction(index)}
                      title={t('hscroll.editor.configureInteraction', 'Configurar interacción')}
                    >
                      <MousePointer size={16} />
                    </button>
                  )}

                  {panel.soundscape_data && (
                    <button
                      type="button"
                      className="btn-panel-action btn-configure"
                      onClick={() => editPaisajePanel(index)}
                      title={t('paisaje.comic.edit', 'Editar paisaje sonoro')}
                    >
                      <Edit size={16} />
                    </button>
                  )}

                  {panel.interaction_type === 'iframe' && (
                    <button
                      type="button"
                      className="btn-panel-action btn-configure"
                      onClick={() => editIframePanel(index)}
                      title={t('hscroll.editor.configureIframe', 'Configurar iframe')}
                    >
                      <Code2 size={16} />
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn-panel-action btn-delete"
                    onClick={() => removePanel(index)}
                    title={t('hscroll.editor.deletePanel', 'Eliminar panel')}
                  >
                    <Trash2 size={16} />
                  </button>

                  {panel.image_url && panel.interaction_type !== 'iframe' && !panel.soundscape_data && (
                    <label className="btn-panel-action btn-replace" title={t('hscroll.editor.replaceImage', 'Reemplazar imagen')}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(index, e.target.files[0], e.target)}
                        style={{ display: 'none' }}
                      />
                      <Upload size={16} />
                    </label>
                  )}
                </div>
              </div>
            ))}

            <div className="hscroll-panel hscroll-panel-add">
              <button type="button" className="btn-add-panel" onClick={addPanel}>
                <Plus size={40} />
                <span>{t('hscroll.editor.addPanel', 'Agregar panel')}</span>
              </button>
            </div>
          </div>
        </div>

        <button type="button" className="btn-scroll" onClick={scrollRight} title={t('hscroll.editor.scrollRight', 'Desplazar a la derecha')}>
          <ArrowRight size={20} />
        </button>
      </div>

      {panels.length === 0 && (
        <div className="hscroll-empty">
          <p>{t('hscroll.editor.empty', 'No hay paneles aún. Haz clic en «Agregar panel» para comenzar.')}</p>
        </div>
      )}

      {/* Panel Type Selection Modal */}
      {showPanelTypeModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowPanelTypeModal(false)}>
          <div className="modal-content panel-type-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('hscroll.editor.choosePanelType', 'Selecciona el tipo de panel')}</h3>
              <button className="modal-close" onClick={() => setShowPanelTypeModal(false)} aria-label={t('common.buttons.close', 'Cerrar')}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="panel-type-options">
                <button
                  type="button"
                  className="panel-type-option"
                  onClick={addSimplePanel}
                >
                  <Upload size={48} />
                  <h4>{t('hscroll.editor.simplePanel', 'Panel simple')}</h4>
                  <p>{t('hscroll.editor.simplePanelDesc', 'Solo muestra una imagen')}</p>
                </button>
                <button
                  type="button"
                  className="panel-type-option"
                  onClick={addInteractivePanel}
                >
                  <MousePointer size={48} />
                  <h4>{t('hscroll.editor.interactivePanel', 'Panel interactivo')}</h4>
                  <p>{t('hscroll.editor.interactivePanelDesc', 'Se puede pulsar para abrir un enlace o reproducir un audio')}</p>
                </button>
                <button
                  type="button"
                  className="panel-type-option"
                  onClick={addIframePanel}
                >
                  <Code2 size={48} />
                  <h4>{t('hscroll.editor.iframePanel', 'Panel iframe')}</h4>
                  <p>{t('hscroll.editor.iframePanelDesc', 'Un vídeo u otro contenido externo incrustado')}</p>
                </button>
                <button
                  type="button"
                  className="panel-type-option"
                  onClick={addPaisajePanel}
                >
                  <AudioWaveform size={48} />
                  <h4>{t('paisaje.comic.option', 'Panel paisaje sonoro')}</h4>
                  <p>{t('paisaje.comic.optionDesc', 'Un dibujo que se mueve con un audio')}</p>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Paisaje sonoro panel: the editor (drawing + sound) in a modal */}
      {paisajeModal && createPortal(
        <div className="modal-overlay" onClick={() => setPaisajeModal(null)}>
          <div className="modal-content paisaje-panel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><AudioWaveform size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />{t('paisaje.comic.modalTitle', 'Panel paisaje sonoro')}</h3>
              <button className="modal-close" onClick={() => setPaisajeModal(null)} aria-label={t('paisaje.comic.close', 'Cerrar')}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <LoadFailBoundary hint={t('loadFail.saveFirst', 'Si tienes cambios sin guardar, cierra esta ventana y guárdalos antes de recargar.')}>
                <Suspense fallback={<p>{t('paisaje.editor.loadingEditor', 'Cargando editor…')}</p>}>
                  <PaisajeEditor
                    variant="panel"
                    value={paisajeModal.draft}
                    onChange={(draft) => setPaisajeModal((m) => (m ? { ...m, draft } : m))}
                  />
                </Suspense>
              </LoadFailBoundary>
              <div className="paisaje-panel-modal__footer">
                <button type="button" className="paisaje-modal-btn" onClick={() => setPaisajeModal(null)}>
                  {t('paisaje.comic.cancel', 'Cancelar')}
                </button>
                <button
                  type="button"
                  className="paisaje-modal-btn paisaje-modal-btn--primary"
                  disabled={!isPieceComplete(paisajeModal.draft)}
                  onClick={savePaisajePanel}
                >
                  {paisajeModal.index === null ? t('paisaje.comic.add', 'Añadir panel') : t('paisaje.comic.save', 'Guardar panel')}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Iframe Panel Configuration Modal */}
      {showIframeModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowIframeModal(false)}>
          <div className="modal-content iframe-config-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Code2 size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />{t('hscroll.editor.iframeModalTitle', 'Configurar panel iframe')}</h3>
              <button className="modal-close" onClick={() => setShowIframeModal(false)} aria-label={t('common.buttons.close', 'Cerrar')}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="iframe-config-section">
                <label className="config-label">{t('hscroll.editor.iframeCode', 'Código iframe o URL')}:</label>
                <textarea
                  className="iframe-input"
                  placeholder={'<iframe src="https://www.youtube.com/embed/..." ...></iframe>'}
                  value={iframeHtml}
                  onChange={(e) => setIframeHtml(e.target.value)}
                  rows={4}
                />
                <p className="config-hint">{t('hscroll.editor.iframeCodeHint', 'Pega el código iframe completo o directamente la URL del src.')}</p>
              </div>

              <div className="iframe-config-section">
                <label className="config-label">{t('hscroll.editor.aspectRatio', 'Relación de aspecto')}:</label>
                <select
                  className="config-select"
                  value={iframeAspectRatio}
                  onChange={(e) => setIframeAspectRatio(e.target.value)}
                >
                  <option value="16:9">16:9 — {t('hscroll.editor.ratio169', 'Vídeo horizontal (YouTube, Vimeo)')}</option>
                  <option value="4:3">4:3 — {t('hscroll.editor.ratio43', 'Formato clásico')}</option>
                  <option value="1:1">1:1 — {t('hscroll.editor.ratio11', 'Cuadrado')}</option>
                  <option value="9:16">9:16 — {t('hscroll.editor.ratio916', 'Vídeo vertical (Shorts, Reels)')}</option>
                  <option value="21:9">21:9 — {t('hscroll.editor.ratio219', 'Panorámico')}</option>
                </select>
                <p className="config-hint">{t('hscroll.editor.aspectHint', 'El ancho del panel se calculará automáticamente para mantener la proporción con la altura del visor.')}</p>
              </div>

              <button
                type="button"
                className="btn-configure"
                onClick={handleConfigureIframe}
                disabled={!iframeHtml.trim()}
              >
                {t('hscroll.editor.saveIframe', 'Guardar panel iframe')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Interactive Panel Configuration Modal */}
      {showInteractiveModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowInteractiveModal(false)}>
          <div className="modal-content interactive-config-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <p className="modal-description" style={{ margin: 0 }}>{t('hscroll.editor.clickQuestion', '¿Qué debe hacer el panel al hacer clic?')}</p>
                <button className="modal-close" onClick={() => setShowInteractiveModal(false)} aria-label={t('common.buttons.close', 'Cerrar')}>
                  <X size={24} />
                </button>
              </div>
              <div className="interaction-options">
                <div className="interaction-option">
                  <h4><span className="config-label">{t('hscroll.editor.type', { n: 1, defaultValue: 'Tipo {{n}}' })}:</span> <LinkIcon size={20} /> {t('hscroll.editor.openLink', 'Abrir enlace')}</h4>
                  <input
                    type="url"
                    placeholder={t('hscroll.editor.linkPlaceholder', 'https://ejemplo.com')}
                    className="interaction-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value) {
                        configureInteraction('link', e.target.value);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn-configure"
                    onClick={(e) => {
                      const input = e.target.previousElementSibling;
                      if (input.value) {
                        configureInteraction('link', input.value);
                      }
                    }}
                  >
                    {t('hscroll.editor.configureLink', 'Configurar enlace')}
                  </button>
                </div>

                <div className="interaction-option">
                  <h4><span className="config-label">{t('hscroll.editor.type', { n: 2, defaultValue: 'Tipo {{n}}' })}:</span> <Volume2 size={20} /> {t('hscroll.editor.playAudio', 'Reproducir audio')}</h4>
                  <label className="audio-upload-btn">
                    <input
                      type="file"
                      accept={AUDIO_ACCEPT}
                      onChange={(e) => handleAudioUpload(e.target.files[0])}
                      style={{ display: 'none' }}
                      disabled={uploadingAudio}
                    />
                    <Upload size={20} />
                    {uploadingAudio ? t('hscroll.editor.uploadingAudio', { pct: audioProgress, defaultValue: 'Subiendo… {{pct}}%' }) : t('hscroll.editor.uploadAudio', 'Subir archivo de audio')}
                  </label>
                  {uploadingAudio && (
                    <div className="audio-upload-progress" role="progressbar" aria-valuenow={audioProgress} aria-valuemin={0} aria-valuemax={100}>
                      <div className="audio-upload-progress__bar" style={{ width: `${audioProgress}%` }} />
                      <span className="audio-upload-progress__pct">
                        {audioProgress < 100 ? `${audioProgress}%` : t('audio.upload.processing', 'Convirtiendo a AAC y normalizando…')}
                      </span>
                    </div>
                  )}
                  <p className="audio-hint">{t('audio.upload.hint', 'WAV recomendado (máxima calidad) · también mp3, flac, m4a, ogg… · sin límite de tamaño · se guarda en AAC con el volumen normalizado')}</p>

                  {/* Audio Configuration Options */}
                  <div className="audio-config-section">
                    <div className="audio-config-group">
                      <label htmlFor="audio-mode" className="config-label">
                        {t('hscroll.editor.playMode', 'Modo de reproducción')}:
                      </label>
                      <select
                        id="audio-mode"
                        className="config-select"
                        value={audioMode}
                        onChange={(e) => setAudioMode(e.target.value)}
                      >
                        <option value="once">{t('hscroll.editor.playOnce', 'Reproducir una vez y cerrar')}</option>
                        <option value="loop">{t('hscroll.editor.playLoop', 'Reproducción en bucle infinito')}</option>
                      </select>
                    </div>

                    <div className="audio-config-group">
                      <label htmlFor="audio-stop-panel" className="config-label">
                        {t('hscroll.editor.stopAt', 'Detener en el panel (opcional)')}:
                      </label>
                      <input
                        id="audio-stop-panel"
                        type="number"
                        className="config-input"
                        min="1"
                        max={panels.length}
                        value={audioStopPanel || ''}
                        onChange={(e) => setAudioStopPanel(e.target.value ? parseInt(e.target.value) : null)}
                        placeholder={t('hscroll.editor.panelNumber', 'Número de panel')}
                      />
                      <p className="config-hint">
                        {t('hscroll.editor.stopAtHint', 'El audio se detendrá automáticamente al llegar a este panel. Déjalo vacío para no detenerlo.')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default HScrollEditor;
