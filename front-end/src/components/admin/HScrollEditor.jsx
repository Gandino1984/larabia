// magazine-front/src/components/admin/HScrollEditor.jsx
import { useState, useRef } from 'react';
import { Plus, Trash2, ArrowLeft, ArrowRight, Upload, MousePointer, Link as LinkIcon, Volume2, X, Code2 } from 'lucide-react';
import './HScrollEditor.css';

function HScrollEditor({ panels, onPanelsChange, onUploadPanel, onUploadAudio }) {
  const [draggingIndex, setDraggingIndex] = useState(null);
  const scrollContainerRef = useRef(null);
  const [showPanelTypeModal, setShowPanelTypeModal] = useState(false);
  const [showInteractiveModal, setShowInteractiveModal] = useState(false);
  const [pendingPanelIndex, setPendingPanelIndex] = useState(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
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

  const removePanel = (index) => {
    const updatedPanels = panels.filter((_, i) => i !== index);
    onPanelsChange(updatedPanels);
  };

  const handleImageUpload = async (index, file) => {
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
      alert(`Por favor selecciona una imagen válida (JPEG, PNG, WebP).\nArchivo seleccionado: ${file.name} (${file.type})`);
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('La imagen es demasiado grande. Máximo 10MB');
      return;
    }

    try {
      console.log('📤 Uploading image file:', file.name);
      const result = await onUploadPanel(index, file);
      if (result && result.image_url) {
        console.log('✅ Image uploaded successfully:', result.image_url);
        const updatedPanels = [...panels];
        updatedPanels[index] = {
          ...updatedPanels[index],
          image_url: result.image_url
        };
        onPanelsChange(updatedPanels);
      }
    } catch (error) {
      console.error('❌ Error uploading panel:', error);
      alert('Error al subir la imagen');
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

    // Validate file type - include all WAV variants
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave', 'audio/ogg', 'audio/webm'];
    if (!validTypes.includes(file.type)) {
      console.error('❌ Invalid audio file type:', file.type);
      alert(`Por favor selecciona un archivo de audio válido (MP3, WAV, OGG, WEBM). Tipo detectado: ${file.type}`);
      return;
    }

    // Validate file size (max 20MB)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('El archivo de audio es demasiado grande. Máximo 20MB');
      return;
    }

    try {
      setUploadingAudio(true);
      console.log('📤 Uploading audio file:', file.name);
      const audioUrl = await onUploadAudio(file);
      console.log('✅ Audio uploaded successfully:', audioUrl);
      configureInteraction('audio', audioUrl, {
        stopPanel: audioStopPanel,
        mode: audioMode
      });
    } catch (error) {
      console.error('❌ Error uploading audio:', error);
      alert('Error al subir el audio');
    } finally {
      setUploadingAudio(false);
    }
  };

  const editPanelInteraction = (index) => {
    setPendingPanelIndex(index);
    setShowInteractiveModal(true);
  };

  return (
    <div className="hscroll-editor">
      <div className="hscroll-header">
        <h3>Editor de Cómic - Scroll Horizontal</h3>
        <p className="hscroll-description">
          Sube imágenes para crear tu cómic. Las imágenes se mostrarán en formato horizontal con altura fija.
        </p>
      </div>

      <div className="hscroll-controls">
        <button type="button" className="btn-scroll" onClick={scrollLeft} title="Desplazar izquierda">
          <ArrowLeft size={20} />
        </button>

        <div className="hscroll-container" ref={scrollContainerRef}>
          <div className="hscroll-panels">
            {panels.map((panel, index) => (
              <div key={panel.id_block || panel.tempId} className={`hscroll-panel ${panel.is_interactive ? 'interactive' : ''}`}>
                <div className="panel-number">{index + 1}</div>
                {(panel.is_interactive || panel.interaction_type === 'iframe') && (
                  <div className="panel-badge">
                    {panel.interaction_type === 'link' ? <LinkIcon size={16} /> : panel.interaction_type === 'audio' ? <Volume2 size={16} /> : panel.interaction_type === 'iframe' ? <Code2 size={16} /> : <MousePointer size={16} />}
                  </div>
                )}

                <div className="panel-content">
                  {panel.interaction_type === 'iframe' ? (
                    <div className="panel-iframe-placeholder">
                      <Code2 size={40} />
                      <span>Panel Iframe</span>
                      {panel.interaction_data && (
                        <p className="panel-iframe-url">{panel.interaction_data}</p>
                      )}
                    </div>
                  ) : panel.image_url ? (
                    <img
                      src={getImageUrl(panel.image_url)}
                      alt={panel.image_alt || `Panel ${index + 1}`}
                      className="panel-image"
                    />
                  ) : (
                    <label className="panel-upload">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(index, e.target.files[0])}
                        style={{ display: 'none' }}
                      />
                      <Upload size={40} />
                      <span>Subir imagen</span>
                    </label>
                  )}
                </div>

                <div className="panel-actions">
                  {index > 0 && (
                    <button
                      type="button"
                      className="btn-panel-action"
                      onClick={() => movePanel(index, index - 1)}
                      title="Mover a la izquierda"
                    >
                      <ArrowLeft size={16} />
                    </button>
                  )}

                  {index < panels.length - 1 && (
                    <button
                      type="button"
                      className="btn-panel-action"
                      onClick={() => movePanel(index, index + 1)}
                      title="Mover a la derecha"
                    >
                      <ArrowRight size={16} />
                    </button>
                  )}

                  {panel.is_interactive && (
                    <button
                      type="button"
                      className="btn-panel-action btn-configure"
                      onClick={() => editPanelInteraction(index)}
                      title="Configurar interacción"
                    >
                      <MousePointer size={16} />
                    </button>
                  )}

                  {panel.interaction_type === 'iframe' && (
                    <button
                      type="button"
                      className="btn-panel-action btn-configure"
                      onClick={() => editIframePanel(index)}
                      title="Configurar iframe"
                    >
                      <Code2 size={16} />
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn-panel-action btn-delete"
                    onClick={() => removePanel(index)}
                    title="Eliminar panel"
                  >
                    <Trash2 size={16} />
                  </button>

                  {panel.image_url && panel.interaction_type !== 'iframe' && (
                    <label className="btn-panel-action btn-replace" title="Reemplazar imagen">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(index, e.target.files[0])}
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
                <span>Agregar panel</span>
              </button>
            </div>
          </div>
        </div>

        <button type="button" className="btn-scroll" onClick={scrollRight} title="Desplazar derecha">
          <ArrowRight size={20} />
        </button>
      </div>

      {panels.length === 0 && (
        <div className="hscroll-empty">
          <p>No hay paneles aún. Haz clic en "Agregar panel" para comenzar.</p>
        </div>
      )}

      {/* Panel Type Selection Modal */}
      {showPanelTypeModal && (
        <div className="modal-overlay" onClick={() => setShowPanelTypeModal(false)}>
          <div className="modal-content panel-type-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Selecciona el tipo de panel</h3>
              <button className="modal-close" onClick={() => setShowPanelTypeModal(false)}>
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
                  <h4>Panel Simple</h4>
                  <p>Solo muestra una imagen</p>
                </button>
                <button
                  type="button"
                  className="panel-type-option"
                  onClick={addInteractivePanel}
                >
                  <MousePointer size={48} />
                  <h4>Panel Interactivo</h4>
                  <p>Clickeable con acción personalizada</p>
                </button>
                <button
                  type="button"
                  className="panel-type-option"
                  onClick={addIframePanel}
                >
                  <Code2 size={48} />
                  <h4>Panel Iframe</h4>
                  <p>Embed de video u otro contenido externo</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Iframe Panel Configuration Modal */}
      {showIframeModal && (
        <div className="modal-overlay" onClick={() => setShowIframeModal(false)}>
          <div className="modal-content iframe-config-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Code2 size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Configurar Panel Iframe</h3>
              <button className="modal-close" onClick={() => setShowIframeModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="iframe-config-section">
                <label className="config-label">Código iframe o URL:</label>
                <textarea
                  className="iframe-input"
                  placeholder={'<iframe src="https://www.youtube.com/embed/..." ...></iframe>'}
                  value={iframeHtml}
                  onChange={(e) => setIframeHtml(e.target.value)}
                  rows={4}
                />
                <p className="config-hint">Pega el código iframe completo o directamente la URL del src.</p>
              </div>

              <div className="iframe-config-section">
                <label className="config-label">Relación de aspecto:</label>
                <select
                  className="config-select"
                  value={iframeAspectRatio}
                  onChange={(e) => setIframeAspectRatio(e.target.value)}
                >
                  <option value="16:9">16:9 — Video horizontal (YouTube, Vimeo)</option>
                  <option value="4:3">4:3 — Formato clásico</option>
                  <option value="1:1">1:1 — Cuadrado</option>
                  <option value="9:16">9:16 — Video vertical (Shorts, Reels)</option>
                  <option value="21:9">21:9 — Ultrawide</option>
                </select>
                <p className="config-hint">El ancho del panel se calculará automáticamente para mantener la proporción con la altura del visor.</p>
              </div>

              <button
                type="button"
                className="btn-configure"
                onClick={handleConfigureIframe}
                disabled={!iframeHtml.trim()}
              >
                Guardar panel iframe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Panel Configuration Modal */}
      {showInteractiveModal && (
        <div className="modal-overlay" onClick={() => setShowInteractiveModal(false)}>
          <div className="modal-content interactive-config-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <p className="modal-description" style={{ margin: 0 }}>¿Qué debe hacer el panel al hacer clic?</p>
                <button className="modal-close" onClick={() => setShowInteractiveModal(false)}>
                  <X size={24} />
                </button>
              </div>
              <div className="interaction-options">
                <div className="interaction-option">
                  <h4><span className="config-label">Tipo 1:</span> <LinkIcon size={20} /> Abrir enlace</h4>
                  <input
                    type="url"
                    placeholder="https://ejemplo.com"
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
                    Configurar enlace
                  </button>
                </div>

                <div className="interaction-option">
                  <h4><span className="config-label">Tipo 2:</span> <Volume2 size={20} /> Reproducir audio</h4>
                  <label className="audio-upload-btn">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => handleAudioUpload(e.target.files[0])}
                      style={{ display: 'none' }}
                      disabled={uploadingAudio}
                    />
                    <Upload size={20} />
                    {uploadingAudio ? 'Subiendo...' : 'Subir archivo de audio'}
                  </label>
                  <p className="audio-hint">MP3, WAV, OGG (máx. 20MB)</p>

                  {/* Audio Configuration Options */}
                  <div className="audio-config-section">
                    <div className="audio-config-group">
                      <label htmlFor="audio-mode" className="config-label">
                        Modo de reproducción:
                      </label>
                      <select
                        id="audio-mode"
                        className="config-select"
                        value={audioMode}
                        onChange={(e) => setAudioMode(e.target.value)}
                      >
                        <option value="once">Reproducir una vez y cerrar</option>
                        <option value="loop">Reproducción en bucle infinito</option>
                      </select>
                    </div>

                    <div className="audio-config-group">
                      <label htmlFor="audio-stop-panel" className="config-label">
                        Detener en el panel (opcional):
                      </label>
                      <input
                        id="audio-stop-panel"
                        type="number"
                        className="config-input"
                        min="1"
                        max={panels.length}
                        value={audioStopPanel || ''}
                        onChange={(e) => setAudioStopPanel(e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="Número de panel"
                      />
                      <p className="config-hint">
                        El audio se detendrá automáticamente al llegar a este panel. Dejar vacío para no detener.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HScrollEditor;
