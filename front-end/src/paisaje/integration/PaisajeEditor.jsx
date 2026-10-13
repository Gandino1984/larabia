// front-end/src/paisaje/integration/PaisajeEditor.jsx
//
// Creates / edits a soundscape (engine: Cristian Vergara — see ../README.md),
// replacing the engine's demo wizard inside the magazine:
//   1 · Dibujo    style + its editor (the engine's converters) → upload
//   2 · Sonido    audio upload (normalised in the background), reaction mode
//                 (amplitude / spectrum) and veil, with a live preview
//   3 · Encuadre  (article format only) drag the drawing behind the circle
// Used as the "Paisaje sonoro" article format and inside the comic editor
// ("Panel paisaje sonoro"; there the piece fills the panel: no framing).
//
//   value     the piece (block.soundscape_data: object or JSON string)
//   onChange  called with the draft { imageId, audioId, mode, veil, offsetX,
//             offsetY, style, width, height, imageUrl, … } on every change
//   variant   'article' | 'panel'
//   title     shown in the article preview
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image as ImageIcon, Music, Move, Upload, RotateCcw, Check, RefreshCw } from 'lucide-react';
import PaisajePlayer from '../player/PaisajePlayer';
import { STYLES, DEFAULT_STYLE_ID, getStyle } from '../styles/registry';
import { useAuth } from '../../app_context/AuthContext';
import { apiFile, parseSoundscape, pieceAudioUrl, playerLabels } from './soundscape';
import { AUDIO_EXTENSIONS, uploadAudio, uploadDrawing, waitForAudio } from './paisajeApi';
import '../converter/converter.css';
import './PaisajePiece.css';
import './PaisajeEditor.css';

const STYLE_IDS = { puntillista: 'puntillista', lineart: 'line-art', posterized: 'posterizado', azimuthal: 'azimuthal' };

const fmtLufs = (v) => (v === null || v === undefined ? '—' : `${String(v).replace('.', ',')} LUFS`);

function PaisajeEditor({ value, onChange, variant = 'article', title }) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const userId = currentUser?.id_user;
  const initial = useMemo(() => parseSoundscape(value), []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- the piece --------------------------------------------------------
  const [drawing, setDrawing] = useState(() => (initial?.imageId ? {
    imageId: initial.imageId,
    style: initial.style,
    width: initial.width,
    height: initial.height,
    imageUrl: initial.imageUrl || null
  } : null));
  const [audio, setAudio] = useState(() => (initial?.audioId ? {
    audioId: initial.audioId,
    originalFormat: initial.audioFormat ?? null,
    loudnessBefore: initial.loudnessBefore ?? null,
    loudnessAfter: initial.loudnessAfter ?? null
  } : null));
  const [mode, setMode] = useState(initial?.mode === 'spectrum' ? 'spectrum' : 'amplitude');
  const [veil, setVeil] = useState(typeof initial?.veil === 'number' ? initial.veil : 0.35);
  const [offset, setOffset] = useState([initial?.offsetX || 0, initial?.offsetY || 0]);

  const [tab, setTab] = useState(() => (!initial?.imageId ? 'drawing' : !initial?.audioId ? 'audio' : 'audio'));

  // ---- step 1 · drawing -------------------------------------------------
  const [editingDrawing, setEditingDrawing] = useState(!initial?.imageId);
  const [styleId, setStyleId] = useState(() => STYLE_IDS[initial?.style] || DEFAULT_STYLE_ID);
  const [pendingDoc, setPendingDoc] = useState(null);
  const [drawingBusy, setDrawingBusy] = useState(false);
  const [drawingError, setDrawingError] = useState(null);
  const style = getStyle(styleId);
  const StyleEditor = useMemo(
    () => (style?.disponible && style.componente ? lazy(style.componente) : null),
    [style]
  );

  const chooseStyle = (id) => {
    if (id === styleId) return;
    setStyleId(id);
    setPendingDoc(null);
  };

  const confirmDrawing = async () => {
    if (!pendingDoc) return;
    if (!pendingDoc.webp) {
      setDrawingError(t('paisaje.editor.drawing.noReference', 'No se generó la imagen de referencia; vuelve a cargar la imagen.'));
      return;
    }
    setDrawingBusy(true);
    setDrawingError(null);
    try {
      const d = await uploadDrawing(pendingDoc, userId);
      setDrawing({ imageId: d.imageId, style: d.style, width: d.width, height: d.height, imageUrl: d.imageUrl });
      setOffset([0, 0]); // another drawing: the old framing no longer applies
      setEditingDrawing(false);
      setPendingDoc(null);
      setTab(audio ? (variant === 'article' ? 'framing' : 'audio') : 'audio');
    } catch (err) {
      setDrawingError(err.message);
    } finally {
      setDrawingBusy(false);
    }
  };

  // ---- step 2 · sound ---------------------------------------------------
  const [audioPhase, setAudioPhase] = useState('idle'); // idle | uploading | processing | error
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioError, setAudioError] = useState(null);
  const [localAudioUrl, setLocalAudioUrl] = useState(null);
  const localUrlRef = useRef(null);
  const audioInputRef = useRef(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true; // (re)mounted — StrictMode mounts twice in dev
    return () => {
      mountedRef.current = false;
      if (localUrlRef.current) {
        URL.revokeObjectURL(localUrlRef.current);
        localUrlRef.current = null;
      }
    };
  }, []);
  const audioBusy = audioPhase === 'uploading' || audioPhase === 'processing';

  const handleAudioFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!AUDIO_EXTENSIONS.includes(ext)) {
      setAudioPhase('error');
      setAudioError(t('paisaje.editor.audio.badFormat', { formats: AUDIO_EXTENSIONS.join(', '), defaultValue: 'Formato no admitido. Usa {{formats}}.' }));
      return;
    }
    setAudioError(null);
    setAudioProgress(0);
    setAudioPhase('uploading');
    try {
      const audioId = await uploadAudio(file, userId, (pct) => {
        setAudioProgress(pct);
        if (pct >= 100) setAudioPhase('processing');
      });
      setAudioPhase('processing');
      const s = await waitForAudio(audioId, userId, () => !mountedRef.current);
      if (!mountedRef.current || !s) return;
      if (s.status !== 'ready') throw new Error(s.message || t('paisaje.editor.audio.failed', 'No se pudo procesar el audio.'));
      if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current);
      localUrlRef.current = URL.createObjectURL(file); // instant playback in the preview
      setLocalAudioUrl(localUrlRef.current);
      setAudio({
        audioId,
        originalFormat: s.originalFormat,
        loudnessBefore: s.loudnessBefore,
        loudnessAfter: s.loudnessAfter
      });
      setAudioPhase('idle');
    } catch (err) {
      if (!mountedRef.current) return;
      setAudioPhase('error');
      setAudioError(err.message); // the previous audio (if any) is kept
    }
  };

  // ---- step 3 · framing (article) ----------------------------------------
  const offsetRef = useRef(offset);
  offsetRef.current = offset;
  const handlePanStart = useCallback((e) => {
    const el = e.currentTarget;
    const svg = el.querySelector('svg.paisaje-svg');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    if (!rect.height || !vb.height) return;
    const scale = vb.height / rect.height; // viewBox units per CSS px
    const startX = e.clientX;
    const startY = e.clientY;
    const base = [offsetRef.current[0], offsetRef.current[1]];
    el.setPointerCapture(e.pointerId);
    const move = (ev) => setOffset([
      Math.round((base[0] + (ev.clientX - startX) * scale) * 10) / 10,
      Math.round((base[1] + (ev.clientY - startY) * scale) * 10) / 10
    ]);
    const up = (ev) => {
      try { el.releasePointerCapture(ev.pointerId); } catch { /* already released */ }
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }, []);

  // ---- report the draft --------------------------------------------------
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const firstReport = useRef(true);
  useEffect(() => {
    if (firstReport.current) { firstReport.current = false; return; } // nothing changed yet
    onChangeRef.current?.(drawing || audio ? {
      imageId: drawing?.imageId ?? null,
      style: drawing?.style ?? null,
      width: drawing?.width ?? null,
      height: drawing?.height ?? null,
      imageUrl: drawing?.imageUrl ?? null,
      audioId: audio?.audioId ?? null,
      audioFormat: audio?.originalFormat ?? null,
      loudnessBefore: audio?.loudnessBefore ?? null,
      loudnessAfter: audio?.loudnessAfter ?? null,
      mode,
      veil,
      offsetX: offset[0],
      offsetY: offset[1]
    } : null);
  }, [drawing, audio, mode, veil, offset]);

  // ---- render ------------------------------------------------------------
  const labels = playerLabels(t);
  const jsonUrl = drawing ? apiFile(`/paisaje-files/images/${drawing.imageId}.json`) : null;
  const previewAudio = localAudioUrl || (audio ? pieceAudioUrl(audio) : null);
  // Server style name (puntillista | lineart | posterized | azimuthal) → the
  // engine's registry entry, whose id keys the translations.
  const styleName = (s) => {
    const def = getStyle(STYLE_IDS[s] || s);
    return def ? t(`paisaje.styles.${def.id}`, def.nombre) : s;
  };

  const tabs = [
    { key: 'drawing', Icon: ImageIcon, label: t('paisaje.editor.tabs.drawing', 'Dibujo'), done: !!drawing },
    { key: 'audio', Icon: Music, label: t('paisaje.editor.tabs.audio', 'Sonido'), done: !!audio, disabled: !drawing },
    ...(variant === 'article'
      ? [{ key: 'framing', Icon: Move, label: t('paisaje.editor.tabs.framing', 'Encuadre'), done: false, disabled: !drawing || !audio }]
      : [])
  ];

  return (
    <div className={`larabia-paisaje-editor larabia-paisaje-editor--${variant}`}>
      <ol className="lpe-tabs" role="tablist" aria-label={t('paisaje.editor.tabsLabel', 'Pasos del paisaje sonoro')}>
        {tabs.map(({ key, Icon, label, done, disabled }, i) => (
          <li key={key}>
            <button
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`lpe-tab${tab === key ? ' is-active' : ''}${done ? ' is-done' : ''}`}
              disabled={disabled}
              onClick={() => setTab(key)}
            >
              <span className="lpe-tab__num">{done ? <Check size={14} /> : i + 1}</span>
              <Icon size={16} />
              <span>{label}</span>
            </button>
          </li>
        ))}
      </ol>

      {/* ---------- 1 · Dibujo ---------- */}
      {tab === 'drawing' && (
        <section className="lpe-panel" aria-label={t('paisaje.editor.tabs.drawing', 'Dibujo')}>
          {drawing && !editingDrawing ? (
            <div className="lpe-current">
              <div className="lpe-current__preview">
                {drawing.imageUrl
                  ? <img src={apiFile(drawing.imageUrl)} alt="" />
                  : <ImageIcon size={32} />}
              </div>
              <div className="lpe-current__info">
                <p className="lpe-current__title">{t('paisaje.editor.drawing.ready', 'Dibujo listo')}</p>
                <p className="lpe-muted">{styleName(drawing.style)} · {drawing.width}×{drawing.height}</p>
                <div className="lpe-actions">
                  <button type="button" className="lpe-btn" onClick={() => setEditingDrawing(true)}>
                    <RefreshCw size={16} /> {t('paisaje.editor.drawing.change', 'Cambiar dibujo')}
                  </button>
                  <button type="button" className="lpe-btn lpe-btn--primary" onClick={() => setTab('audio')}>
                    {t('paisaje.editor.next', 'Siguiente')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <p className="lpe-hint">{t('paisaje.editor.drawing.hint', 'Elige un estilo y sube una imagen. Ajusta el dibujo y pulsa «Usar este dibujo».')}</p>
              <div className="lpe-styles" role="radiogroup" aria-label={t('paisaje.editor.drawing.styleLabel', 'Estilo')}>
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={s.id === styleId}
                    className={`lpe-style${s.id === styleId ? ' is-active' : ''}`}
                    disabled={!s.disponible}
                    onClick={() => chooseStyle(s.id)}
                  >
                    <strong>{t(`paisaje.styles.${s.id}`, s.nombre)}</strong>
                    <span>{t(`paisaje.styles.${s.id}Desc`, s.descripcion)}</span>
                  </button>
                ))}
              </div>
              {StyleEditor && (
                <div className="lpe-style-editor">
                  <Suspense fallback={<p className="lpe-hint">{t('paisaje.editor.loadingEditor', 'Cargando editor…')}</p>}>
                    <StyleEditor key={styleId} onDocument={setPendingDoc} />
                  </Suspense>
                </div>
              )}
              {drawingError && <p className="lpe-error" role="alert">{drawingError}</p>}
              <div className="lpe-actions">
                {drawing && (
                  <button type="button" className="lpe-btn" onClick={() => { setEditingDrawing(false); setPendingDoc(null); }}>
                    {t('paisaje.editor.drawing.keep', 'Mantener el dibujo actual')}
                  </button>
                )}
                <button type="button" className="lpe-btn lpe-btn--primary" disabled={!pendingDoc || drawingBusy} onClick={confirmDrawing}>
                  <Upload size={16} />
                  {drawingBusy ? t('paisaje.editor.drawing.uploading', 'Subiendo…') : t('paisaje.editor.drawing.use', 'Usar este dibujo')}
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {/* ---------- 2 · Sonido ---------- */}
      {tab === 'audio' && drawing && (
        <section className="lpe-panel" aria-label={t('paisaje.editor.tabs.audio', 'Sonido')}>
          <div className="lpe-audio-upload">
            <input
              ref={audioInputRef}
              type="file"
              className="lpe-file-input"
              accept={`${AUDIO_EXTENSIONS.map((e) => `.${e}`).join(',')},audio/*`}
              onChange={handleAudioFile}
              disabled={audioBusy}
              tabIndex={-1}
              aria-hidden="true"
            />
            <button
              type="button"
              className="lpe-btn lpe-btn--primary"
              onClick={() => audioInputRef.current?.click()}
              disabled={audioBusy}
            >
              <Upload size={16} />
              {audio ? t('paisaje.editor.audio.replace', 'Cambiar audio') : t('paisaje.editor.audio.upload', 'Subir audio')}
            </button>
            <p className="lpe-muted">{t('paisaje.editor.audio.formats', 'mp3, wav, ogg, m4a, flac o aac · sin límite de tamaño · se guarda en AAC con el volumen normalizado')}</p>
          </div>

          {audioBusy && (
            <div className="lpe-progress" role="status">
              <p>
                {audioPhase === 'uploading'
                  ? t('paisaje.editor.audio.uploading', { pct: audioProgress, defaultValue: 'Subiendo audio… {{pct}} %' })
                  : t('paisaje.editor.audio.processing', 'Ajustando el volumen del audio… puede tardar un poco.')}
              </p>
              <div className={`lpe-bar${audioPhase === 'processing' ? ' is-indeterminate' : ''}`}>
                <span style={audioPhase === 'uploading' ? { width: `${audioProgress}%` } : undefined} />
              </div>
            </div>
          )}
          {audioPhase === 'error' && audioError && (
            <p className="lpe-error" role="alert">
              {audioError}{audio ? ` ${t('paisaje.editor.audio.keptPrevious', 'Se mantiene el audio anterior.')}` : ''}
            </p>
          )}

          {audio && (
            <>
              <p className="lpe-ok">
                <Check size={16} />
                {t('paisaje.editor.audio.ready', {
                  before: fmtLufs(audio.loudnessBefore),
                  after: fmtLufs(audio.loudnessAfter),
                  defaultValue: 'Audio listo · AAC 192 kbps · volumen normalizado de {{before}} a {{after}}'
                })}
              </p>
              <div className="lpe-config">
                <label className="lpe-field">
                  <span>{t('paisaje.editor.audio.mode', 'Cómo reacciona la imagen')}</span>
                  <select value={mode} onChange={(e) => setMode(e.target.value)}>
                    <option value="amplitude">{t('paisaje.editor.audio.modeAmplitude', 'Al volumen (toda la imagen a la vez)')}</option>
                    <option value="spectrum">{t('paisaje.editor.audio.modeSpectrum', 'A las frecuencias (graves a la izquierda, agudos a la derecha)')}</option>
                  </select>
                </label>
                <label className="lpe-field">
                  <span>{t('paisaje.editor.audio.veil', { pct: Math.round(veil * 100), defaultValue: 'Velo: {{pct}} %' })}</span>
                  <input type="range" min={0} max={100} step={5} value={Math.round(veil * 100)} onChange={(e) => setVeil(Number(e.target.value) / 100)} />
                  <small className="lpe-muted">{t('paisaje.editor.audio.veilHint', 'Cuánto se apaga la imagen en los momentos suaves.')}</small>
                </label>
              </div>
              {jsonUrl && previewAudio && (
                <div className="lpe-preview larabia-paisaje">
                  <p className="lpe-muted">{t('paisaje.editor.audio.previewHint', 'Vista previa: pulsa play para ver cómo responde el dibujo.')}</p>
                  <PaisajePlayer
                    key={`${drawing.imageId}-${audio.audioId}`}
                    jsonUrl={jsonUrl}
                    audioUrl={previewAudio}
                    peakMode={mode}
                    veil={veil}
                    labels={labels}
                    locked={audioBusy}
                  />
                </div>
              )}
              {variant === 'article' && (
                <div className="lpe-actions">
                  <button type="button" className="lpe-btn lpe-btn--primary" onClick={() => setTab('framing')}>
                    {t('paisaje.editor.next', 'Siguiente')}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* ---------- 3 · Encuadre (artículo) ---------- */}
      {tab === 'framing' && variant === 'article' && drawing && audio && (
        <section className="lpe-panel" aria-label={t('paisaje.editor.tabs.framing', 'Encuadre')}>
          <p className="lpe-hint">{t('paisaje.editor.framing.hint', 'Así se verá publicado. Arrastra el dibujo para elegir qué parte queda dentro del círculo.')}</p>
          <div className="lpe-pan" onPointerDown={handlePanStart}>
            <div className="larabia-paisaje larabia-paisaje--minimal">
              <PaisajePlayer
                jsonUrl={jsonUrl}
                audioUrl={previewAudio || ''}
                peakMode={mode}
                veil={veil}
                variant="minimal"
                locked
                staticPreview
                offset={offset}
                title={title || undefined}
                labels={labels}
              />
            </div>
          </div>
          <div className="lpe-actions">
            <button type="button" className="lpe-btn" onClick={() => setOffset([0, 0])}>
              <RotateCcw size={16} /> {t('paisaje.editor.framing.recenter', 'Recentrar')}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export default PaisajeEditor;
