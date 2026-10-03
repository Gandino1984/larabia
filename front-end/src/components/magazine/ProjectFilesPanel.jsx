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

  // Trigger a download from an in-memory blob (same-origin object URL → never
  // navigates the page, so the SPA state is preserved).
  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'archivo';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const downloadFile = useCallback(async (file) => {
    if (file.type === 'text') {
      downloadBlob(new Blob([file.text || ''], { type: 'text/plain;charset=utf-8' }), file.filename);
      return;
    }
    if (file.external) {
      // Video embeds (YouTube/Vimeo…) aren't downloadable — open them instead.
      window.open(file.path, '_blank', 'noopener,noreferrer');
      return;
    }
    // Fetch the file through the (CORS-enabled) download route as a blob and save
    // it — an <a href> to the cross-origin URL would navigate/reload instead.
    try {
      const res = await axiosInstance.get('/magazine-project/download', {
        params: { path: file.path, name: file.filename },
        responseType: 'blob',
      });
      downloadBlob(res.data, file.filename);
    } catch {
      // Last resort: open in a new tab so the current page is never reloaded.
      const href = `${base}/magazine-project/download?path=${encodeURIComponent(file.path)}&name=${encodeURIComponent(file.filename)}`;
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  }, [base]);

  const downloadAll = useCallback(async () => {
    for (const file of state.files) {
      // eslint-disable-next-line no-await-in-loop
      await downloadFile(file);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 250));
    }
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
