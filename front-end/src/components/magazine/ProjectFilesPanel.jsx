// magazine-front/src/components/magazine/ProjectFilesPanel.jsx
//
// Download panel for a project's files — only reachable by editors / admins /
// super admins (the button that opens it is gated in ProjectDetail, and the
// manifest endpoint re-checks the role). Lists the project's cover, and each
// article's cover, text and media blocks (images, audio, video embeds), each
// with its own download action. Readers never see this.
import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, FileText, Image as ImageIcon, Music, Video, Loader, Package } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import './ProjectFilesPanel.css';

const TYPE_META = {
  image: { label: 'Imágenes', Icon: ImageIcon },
  audio: { label: 'Audio', Icon: Music },
  video: { label: 'Vídeo', Icon: Video },
  text: { label: 'Texto', Icon: FileText },
};
const TYPE_ORDER = ['image', 'audio', 'video', 'text'];

function ProjectFilesPanel({ projectId, projectTitle, onClose }) {
  const [state, setState] = useState({ loading: true, error: '', files: [] });

  useEffect(() => {
    let active = true;
    axiosInstance
      .get(`/magazine-project/files/${projectId}`)
      .then((res) => {
        if (!active) return;
        const files = res.data?.data?.files || [];
        setState({ loading: false, error: res.data?.error || '', files });
      })
      .catch((err) => {
        if (!active) return;
        setState({ loading: false, error: err.response?.data?.error || 'No se pudieron cargar los archivos', files: [] });
      });
    return () => { active = false; };
  }, [projectId]);

  const base = axiosInstance.defaults.baseURL || '';

  const triggerAnchor = (href, filename) => {
    const a = document.createElement('a');
    a.href = href;
    if (filename) a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const downloadFile = useCallback((file) => {
    if (file.type === 'text') {
      // Build the .txt locally (same-origin blob → always downloads).
      const blob = new Blob([file.text || ''], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      triggerAnchor(url, file.filename);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return;
    }
    if (file.external) {
      // Video embeds (YouTube/Vimeo…) aren't downloadable — open them instead.
      window.open(file.path, '_blank', 'noopener,noreferrer');
      return;
    }
    // Stream through the backend so it comes down as an attachment (cross-origin).
    const href = `${base}/magazine-project/download?path=${encodeURIComponent(file.path)}&name=${encodeURIComponent(file.filename)}`;
    triggerAnchor(href, file.filename);
  }, [base]);

  const downloadAll = useCallback(() => {
    state.files.forEach((file, i) => {
      setTimeout(() => downloadFile(file), i * 400);
    });
  }, [state.files, downloadFile]);

  const grouped = TYPE_ORDER
    .map((type) => ({ type, items: state.files.filter((f) => f.type === type) }))
    .filter((g) => g.items.length > 0);

  return createPortal(
    <>
      <div className="project-files-backdrop" onClick={onClose} />
      <div className="project-files-panel" role="dialog" aria-label="Archivos del proyecto">
        <div className="project-files-header">
          <div className="project-files-title">
            <Package size={20} />
            <div>
              <h3>Archivos del proyecto</h3>
              {projectTitle && <span className="project-files-subtitle">{projectTitle}</span>}
            </div>
          </div>
          <button className="project-files-close" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="project-files-body">
          {state.loading && (
            <div className="project-files-status">
              <Loader className="project-files-spinner" size={28} />
              <p>Cargando archivos…</p>
            </div>
          )}

          {!state.loading && state.error && (
            <div className="project-files-status">
              <p>{state.error}</p>
            </div>
          )}

          {!state.loading && !state.error && state.files.length === 0 && (
            <div className="project-files-status">
              <p>Este proyecto no tiene archivos descargables.</p>
            </div>
          )}

          {!state.loading && !state.error && grouped.map(({ type, items }) => {
            const meta = TYPE_META[type];
            const Icon = meta.Icon;
            return (
              <div className="project-files-group" key={type}>
                <div className="project-files-group-head">
                  <Icon size={16} />
                  <span>{meta.label}</span>
                  <span className="project-files-count">{items.length}</span>
                </div>
                <ul className="project-files-list">
                  {items.map((file, i) => (
                    <li className="project-files-item" key={`${type}-${i}`}>
                      <div className="project-files-item-info">
                        <span className="project-files-item-label">{file.label}</span>
                        <span className="project-files-item-name">{file.filename}</span>
                      </div>
                      <button
                        type="button"
                        className="project-files-download"
                        onClick={() => downloadFile(file)}
                        title={file.external ? 'Abrir vídeo' : 'Descargar'}
                      >
                        {file.external ? <Video size={16} /> : <Download size={16} />}
                        <span>{file.external ? 'Abrir' : 'Descargar'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {!state.loading && !state.error && state.files.length > 0 && (
          <div className="project-files-footer">
            <button type="button" className="project-files-download-all" onClick={downloadAll}>
              <Download size={16} />
              <span>Descargar todo</span>
            </button>
          </div>
        )}
      </div>
    </>,
    document.body
  );
}

export default ProjectFilesPanel;
