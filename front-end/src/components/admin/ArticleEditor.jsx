// magazine-front/src/components/admin/ArticleEditor.jsx
import { useState, useRef, useMemo, useEffect } from 'react';
import { useAuth } from '../../app_context/AuthContext';
import { useMagazine } from '../../app_context/MagazineContext';
import { useUI } from '../../app_context/UIContext';
import { Plus, Edit, Trash2, Save, X, Image as ImageIcon, FileText, ArrowLeft, FolderPlus, User, Mail } from 'lucide-react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import NewsletterTab from './NewsletterTab';
import './ArticleEditor.css';

// Register Image format with custom attributes for captions
const ImageBlot = Quill.import('formats/image');
class CustomImage extends ImageBlot {
  static create(value) {
    const node = super.create(value);
    if (typeof value === 'object') {
      node.setAttribute('src', value.src);
      node.setAttribute('alt', value.alt || '');
      if (value.caption) {
        node.setAttribute('data-caption', value.caption);
      }
    }
    return node;
  }

  static value(node) {
    return {
      src: node.getAttribute('src'),
      alt: node.getAttribute('alt'),
      caption: node.getAttribute('data-caption')
    };
  }
}
CustomImage.blotName = 'image';
CustomImage.tagName = 'img';
Quill.register(CustomImage, true);

function ArticleEditor() {
  const { currentUser, isEditor, isArticleAuthor, isSuperAdmin } = useAuth();
  const { editorArticles, fetchEditorArticles, editors, createArticle, updateArticle, deleteArticle, uploadCoverImage, inviteCoAuthor, pendingInvitations, respondToInvitation } = useMagazine();

  // Load all articles (drafts + published) when editor opens this panel
  useEffect(() => {
    fetchEditorArticles();
  }, [fetchEditorArticles]);
  const { showSuccess, showError, navigateToHome } = useUI();

  const quillRef = useRef(null);

  const [activeTab, setActiveTab] = useState('articles');
  const [editingArticle, setEditingArticle] = useState(null);
  const [formData, setFormData] = useState({
    title_article: '',
    content_article: '',
    excerpt_article: '',
    category_article: 'general',
    authors: [currentUser?.id_user].filter(Boolean),
    status_article: 'draft',
    featured_article: false,
    tags_article: [],
    project_id: null
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [selectedAuthorToAdd, setSelectedAuthorToAdd] = useState('');
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showIframeModal, setShowIframeModal] = useState(false);
  const [imageData, setImageData] = useState({ file: null, caption: '', alt: '' });
  const [iframeData, setIframeData] = useState({ url: '', width: '100%', height: '400px' });

  if (!isEditor) {
    return (
      <div className="editor-unauthorized">
        <h2>Acceso Denegado</h2>
        <p>No tienes permisos para acceder al editor de artículos.</p>
        <p>Contacta al administrador si crees que deberías tener acceso.</p>
        <button onClick={navigateToHome} className="btn-back">Volver al inicio</button>
      </div>
    );
  }

  // Quill modules configuration
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['blockquote', 'code-block'],
        ['link'],
        ['clean']
      ]
    },
    clipboard: {
      matchVisual: false
    }
  }), []);

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet',
    'align',
    'blockquote', 'code-block',
    'link', 'image',
    'video'
  ];

  const validateForm = () => {
    const errors = {};

    if (!formData.title_article.trim()) {
      errors.title_article = 'El título es obligatorio';
    } else if (formData.title_article.length > 200) {
      errors.title_article = `El título es demasiado largo (${formData.title_article.length}/200 caracteres)`;
    }

    if (formData.excerpt_article && formData.excerpt_article.length > 500) {
      errors.excerpt_article = `El extracto es demasiado largo (${formData.excerpt_article.length}/500 caracteres)`;
    }

    const contentText = formData.content_article.replace(/<[^>]*>/g, '').trim();
    if (!contentText) {
      errors.content_article = 'El contenido del artículo es obligatorio';
    }

    return errors;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    if (fieldErrors[name]) {
      setFieldErrors({ ...fieldErrors, [name]: '' });
    }
  };

  const handleContentChange = (content) => {
    setFormData({
      ...formData,
      content_article: content
    });
    if (fieldErrors.content_article) {
      setFieldErrors({ ...fieldErrors, content_article: '' });
    }
  };

  const handleCoverImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverImageFile(file);
    }
  };

  // Handle image insertion with caption
  const handleImageInsert = () => {
    setShowImageModal(true);
    setImageData({ file: null, caption: '', alt: '' });
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageData({ ...imageData, file });
    }
  };

  const insertImage = () => {
    if (!imageData.file) {
      showError('Por favor selecciona una imagen');
      return;
    }

    // Create a FileReader to convert image to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const quill = quillRef.current.getEditor();
      const range = quill.getSelection(true);

      // Insert image
      quill.insertEmbed(range.index, 'image', e.target.result);

      // Insert caption if provided
      if (imageData.caption) {
        quill.insertText(range.index + 1, '\n');
        quill.insertText(range.index + 2, imageData.caption, {
          'italic': true,
          'color': '#666',
          'align': 'center'
        });
        quill.insertText(range.index + 2 + imageData.caption.length, '\n\n');
        quill.setSelection(range.index + 4 + imageData.caption.length);
      } else {
        quill.setSelection(range.index + 1);
      }

      setShowImageModal(false);
      setImageData({ file: null, caption: '', alt: '' });
    };
    reader.readAsDataURL(imageData.file);
  };

  // Handle iframe insertion
  const handleIframeInsert = () => {
    setShowIframeModal(true);
    setIframeData({ url: '', width: '100%', height: '400px' });
  };

  const insertIframe = () => {
    if (!iframeData.url) {
      showError('Por favor ingresa una URL');
      return;
    }

    const quill = quillRef.current.getEditor();
    const range = quill.getSelection(true);

    // Create iframe HTML
    const iframeHtml = `<iframe src="${iframeData.url}" width="${iframeData.width}" height="${iframeData.height}" frameborder="0" allowfullscreen></iframe>`;

    // Insert as HTML (using clipboard to preserve HTML structure)
    quill.clipboard.dangerouslyPasteHTML(range.index, iframeHtml);
    quill.setSelection(range.index + 1);

    setShowIframeModal(false);
    setIframeData({ url: '', width: '100%', height: '400px' });
  };

  const resetForm = () => {
    setEditingArticle(null);
    setFormData({
      title_article: '',
      content_article: '',
      excerpt_article: '',
      category_article: 'general',
      authors: [currentUser?.id_user].filter(Boolean),
      status_article: 'draft',
      featured_article: false,
      tags_article: [],
      project_id: null
    });
    setCoverImageFile(null);
    setSelectedAuthorToAdd('');
    setFieldErrors({});
  };

  const handleEdit = (article) => {
    setEditingArticle(article);
    const authorIds = article.authors?.map(a => a.id_user) ||
                     (article.author_id ? [article.author_id] : []);
    setFormData({
      title_article: article.title_article,
      content_article: article.content_article,
      excerpt_article: article.excerpt_article || '',
      category_article: article.category_article || 'general',
      authors: authorIds,
      status_article: article.status_article || 'draft',
      featured_article: article.featured_article || false,
      tags_article: article.tags_article || [],
      project_id: article.project_id || null
    });
  };

  const handleAddAuthor = async () => {
    if (!selectedAuthorToAdd) return;
    const authorId = parseInt(selectedAuthorToAdd);
    if (formData.authors.includes(authorId)) {
      showError('Este autor ya está añadido');
      return;
    }
    // If editing an existing article, send an invitation; otherwise add immediately
    if (editingArticle) {
      await inviteCoAuthor(editingArticle.id_article, authorId);
    } else {
      setFormData({ ...formData, authors: [...formData.authors, authorId] });
    }
    setSelectedAuthorToAdd('');
  };

  const handleRemoveAuthor = (authorId) => {
    if (formData.authors.length <= 1) {
      showError('Debe haber al menos un autor');
      return;
    }
    setFormData({ ...formData, authors: formData.authors.filter(id => id !== authorId) });
  };

  const getAuthorDetails = (authorId) => editors.find(e => e.id_user === authorId);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showError(Object.values(errors).join(' · '));
      return;
    }
    setFieldErrors({});

    setSaving(true);

    try {
      let result;
      const articleData = {
        ...formData,
        author_id: currentUser.id_user,
        authors: formData.authors
      };

      if (editingArticle) {
        result = await updateArticle(editingArticle.id_article, articleData);
      } else {
        result = await createArticle(articleData);
      }

      if (result.error) {
        showError(result.error);
        setSaving(false);
        return;
      }

      // Upload cover image if provided
      if (coverImageFile && result.data) {
        const uploadResult = await uploadCoverImage(result.data.id_article, coverImageFile);
        if (uploadResult.error) {
          showError(uploadResult.error);
        }
      }

      showSuccess(editingArticle ? 'Artículo actualizado exitosamente' : 'Artículo creado exitosamente');
      resetForm();
    } catch (err) {
      showError('Error al guardar el artículo');
      console.error('Submit error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id_article) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este artículo? Esta acción no se puede deshacer.')) {
      return;
    }

    const result = await deleteArticle(id_article);
    if (result.error) {
      showError(result.error);
    } else {
      showSuccess('Artículo eliminado exitosamente');
    }
  };

  const handleCreateProject = () => {
    const projectName = prompt('Nombre del nuevo proyecto:');
    if (projectName) {
      // TODO: Implement create project functionality
      console.log('Creating project:', projectName);
      showSuccess('Funcionalidad de crear proyecto próximamente');
    }
  };

  return (
    <div className="article-editor">
      <div className="editor-container">
        <div className="editor-header">
          <div className="editor-header-content">
            <div className="editor-title-row">
              <h1>{editingArticle ? 'Editar Artículo' : 'Crear Nuevo Artículo'}</h1>
              <div className="editor-project-controls">
                <select
                  className="project-selector-editor"
                  name="project_id"
                  value={formData.project_id || ''}
                  onChange={handleInputChange}
                  title="Seleccionar proyecto"
                >
                  <option value="">Sin proyecto</option>
                  {/* Projects will be populated here */}
                </select>
                <button
                  type="button"
                  className="btn-create-project"
                  onClick={handleCreateProject}
                  title="Crear nuevo proyecto"
                >
                  <FolderPlus size={20} />
                </button>
              </div>
            </div>
            <p className="editor-subtitle">
              {editingArticle
                ? 'Modifica el contenido de tu artículo'
                : 'Escribe y publica contenido para La Rabia'}
            </p>
          </div>
          <button onClick={navigateToHome} className="btn-back-header">
            <ArrowLeft size={20} />
            Volver al inicio
          </button>
        </div>

        <div className="editor-tabs">
          <button
            className={`editor-tab ${activeTab === 'articles' ? 'active' : ''}`}
            onClick={() => setActiveTab('articles')}
          >
            <Edit size={16} />
            Artículos
          </button>
          <button
            className={`editor-tab ${activeTab === 'newsletter' ? 'active' : ''}`}
            onClick={() => setActiveTab('newsletter')}
          >
            <Mail size={16} />
            Recomendaciones
          </button>
        </div>

        {activeTab === 'newsletter' && <NewsletterTab />}

        {activeTab === 'articles' && pendingInvitations.length > 0 && (
          <div className="pending-invitations-panel">
            <h3 className="pending-invitations-title">
              Invitaciones pendientes ({pendingInvitations.length})
            </h3>
            <p className="pending-invitations-subtitle">
              Los siguientes editores te han invitado como co-autor de sus artículos
            </p>
            <div className="pending-invitations-list">
              {pendingInvitations.map(inv => (
                <div key={inv.id} className="invitation-item">
                  <div className="invitation-info">
                    <span className="invitation-article">{inv.article?.title_article || `Artículo #${inv.article_id}`}</span>
                    <span className="invitation-from">Invitado por <strong>{inv.inviter?.name_user || 'Editor'}</strong></span>
                  </div>
                  <div className="invitation-actions">
                    <button
                      type="button"
                      className="btn-accept-invitation"
                      onClick={() => respondToInvitation(inv.id, 'accepted')}
                    >
                      Aceptar
                    </button>
                    <button
                      type="button"
                      className="btn-reject-invitation"
                      onClick={() => respondToInvitation(inv.id, 'rejected')}
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'articles' && <form className="editor-form" onSubmit={handleSubmit}>
          {/* Title */}
          <div className="form-group full-width">
            <label htmlFor="title">Título del Artículo *</label>
            <input
              type="text"
              id="title"
              name="title_article"
              value={formData.title_article}
              onChange={handleInputChange}
              placeholder="Escribe un título atractivo..."
              className={fieldErrors.title_article ? 'input-error' : ''}
            />
            {fieldErrors.title_article && (
              <span className="field-error-msg">{fieldErrors.title_article}</span>
            )}
          </div>

          {/* Excerpt */}
          <div className="form-group full-width">
            <label htmlFor="excerpt">Extracto / Resumen</label>
            <textarea
              id="excerpt"
              name="excerpt_article"
              value={formData.excerpt_article}
              onChange={handleInputChange}
              rows="3"
              placeholder="Breve descripción del artículo que aparecerá en las vistas previas..."
              className={fieldErrors.excerpt_article ? 'input-error' : ''}
            />
            {fieldErrors.excerpt_article && (
              <span className="field-error-msg">{fieldErrors.excerpt_article}</span>
            )}
          </div>

          {/* Rich Text Editor */}
          <div className="form-group full-width">
            <label htmlFor="content">Contenido del Artículo *</label>
            <div className="editor-toolbar-custom">
              <button
                type="button"
                className="toolbar-btn"
                onClick={handleImageInsert}
                title="Insertar imagen con pie de foto"
              >
                <ImageIcon size={18} />
                <span>Imagen</span>
              </button>
              <button
                type="button"
                className="toolbar-btn"
                onClick={handleIframeInsert}
                title="Insertar contenido externo (iframe)"
              >
                <FileText size={18} />
                <span>Embed</span>
              </button>
            </div>
            <div className={fieldErrors.content_article ? 'quill-error' : ''}>
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={formData.content_article}
                onChange={handleContentChange}
                modules={modules}
                formats={formats}
                placeholder="Comienza a escribir tu artículo aquí..."
              />
            </div>
            {fieldErrors.content_article && (
              <span className="field-error-msg">{fieldErrors.content_article}</span>
            )}
          </div>

          {/* Metadata */}
          <div className="form-row form-row-3">
            <div className="form-group">
              <label htmlFor="category">Categoría</label>
              <select
                id="category"
                name="category_article"
                value={formData.category_article}
                onChange={handleInputChange}
              >
                <option value="general">General</option>
                <option value="reportaje">Reportaje</option>
                <option value="multimedia">Multimedia</option>
                <option value="cultura">Cultura</option>
                <option value="sociedad">Sociedad</option>
                <option value="opinion">Opinión</option>
              </select>
            </div>

            <div className="form-group">
              <label>Autores *</label>

              {/* Current authors list */}
              <div className="authors-list">
                {formData.authors.map((authorId, index) => {
                  const author = getAuthorDetails(authorId);
                  return (
                    <div key={authorId} className="author-item">
                      <span className="author-order">{index + 1}.</span>
                      {author?.image_user && (
                        <img
                          src={`${import.meta.env.VITE_API_URL}/user/image/${author.image_user}`}
                          alt={author.name_user}
                          className="author-avatar-small"
                        />
                      )}
                      {!author?.image_user && <User className="author-icon-placeholder" size={16} />}
                      <span className="author-name">{author?.name_user || `Usuario #${authorId}`}</span>
                      {index === 0 && <span className="first-author-badge">Primer autor</span>}
                      {formData.authors.length > 1 && (
                        <button
                          type="button"
                          className="btn-remove-author"
                          onClick={() => handleRemoveAuthor(authorId)}
                          title="Eliminar autor"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add author selector */}
              <div className="add-author-row">
                <select
                  className="author-selector"
                  value={selectedAuthorToAdd}
                  onChange={(e) => setSelectedAuthorToAdd(e.target.value)}
                >
                  <option value="">Seleccionar autor/a...</option>
                  {editors.filter(e => !formData.authors.includes(e.id_user)).map(editor => (
                    <option key={editor.id_user} value={editor.id_user}>{editor.name_user}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-add-author"
                  onClick={handleAddAuthor}
                  disabled={!selectedAuthorToAdd}
                >
                  <Plus size={18} /> {editingArticle ? 'Invitar autor/a' : 'Añadir autor/a'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="status">Estado</label>
              <select
                id="status"
                name="status_article"
                value={formData.status_article}
                onChange={handleInputChange}
              >
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
              </select>
            </div>
          </div>

          {/* Cover Image */}
          <div className="form-group full-width">
            <label htmlFor="cover">Imagen de Portada</label>
            <input
              type="file"
              id="cover"
              accept="image/*"
              onChange={handleCoverImageChange}
            />
            <small>Esta imagen se mostrará como portada del artículo</small>
          </div>

          {/* Featured Article */}
          <div className="form-group full-width">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="featured_article"
                checked={formData.featured_article}
                onChange={handleInputChange}
              />
              <span>Marcar como artículo destacado (aparecerá en la página principal)</span>
            </label>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button type="submit" className="btn-save" disabled={saving}>
              <Save size={20} />
              {saving ? 'Guardando...' : (editingArticle ? 'Actualizar Artículo' : 'Publicar Artículo')}
            </button>
            {editingArticle && (
              <button type="button" className="btn-cancel" onClick={resetForm}>
                <X size={20} />
                Cancelar Edición
              </button>
            )}
          </div>
        </form>}

        {activeTab === 'articles' && <div className="articles-list">
          <h2>Artículos Existentes</h2>
          <p className="list-subtitle">Gestiona todos tus artículos publicados y borradores</p>

          {editorArticles.filter(a => isSuperAdmin || isArticleAuthor(a)).length === 0 ? (
            <div className="empty-state">
              <p>No hay artículos todavía</p>
              <p>Crea tu primer artículo usando el formulario de arriba</p>
            </div>
          ) : (
            <div className="articles-grid">
              {editorArticles.filter(a => isSuperAdmin || isArticleAuthor(a)).map((article) => (
                <div key={article.id_article} className="article-item">
                  <div className="article-item-info">
                    <h4>{article.title_article}</h4>
                    <p className="article-meta">
                      <span className={`status status-${article.status_article}`}>
                        {article.status_article === 'published' ? 'Publicado' : 'Borrador'}
                      </span>
                      <span className="category-badge">{article.category_article}</span>
                    </p>
                    <p className="article-author">
                      Por {article.authors?.map(a => a.name_user).join(', ') || article.author_name || 'Autor desconocido'}
                    </p>
                  </div>
                  {(isSuperAdmin || isArticleAuthor(article)) && (
                  <div className="article-item-actions">
                    <button
                      className="btn-edit"
                      onClick={() => handleEdit(article)}
                      title="Editar artículo"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(article.id_article)}
                      title="Eliminar artículo"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>}
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div className="modal-overlay" onClick={() => setShowImageModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Insertar Imagen</h3>
            <div className="modal-body">
              <div className="form-group">
                <label>Seleccionar imagen</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                />
              </div>
              <div className="form-group">
                <label>Pie de foto / Descripción (opcional)</label>
                <input
                  type="text"
                  value={imageData.caption}
                  onChange={(e) => setImageData({ ...imageData, caption: e.target.value })}
                  placeholder="Descripción de la imagen..."
                />
              </div>
              <div className="form-group">
                <label>Texto alternativo (opcional)</label>
                <input
                  type="text"
                  value={imageData.alt}
                  onChange={(e) => setImageData({ ...imageData, alt: e.target.value })}
                  placeholder="Texto alternativo para accesibilidad..."
                />
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={insertImage} className="btn-save">Insertar</button>
              <button onClick={() => setShowImageModal(false)} className="btn-cancel">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Iframe Modal */}
      {showIframeModal && (
        <div className="modal-overlay" onClick={() => setShowIframeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Insertar Contenido Externo</h3>
            <p className="modal-description">
              Inserta videos, mapas u otro contenido desde servicios externos
            </p>
            <div className="modal-body">
              <div className="form-group">
                <label>URL del contenido *</label>
                <input
                  type="url"
                  value={iframeData.url}
                  onChange={(e) => setIframeData({ ...iframeData, url: e.target.value })}
                  placeholder="https://www.youtube.com/embed/..."
                />
                <small>Ejemplo: YouTube, Vimeo, Google Maps, etc.</small>
              </div>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label>Ancho</label>
                  <input
                    type="text"
                    value={iframeData.width}
                    onChange={(e) => setIframeData({ ...iframeData, width: e.target.value })}
                    placeholder="100%"
                  />
                </div>
                <div className="form-group">
                  <label>Alto</label>
                  <input
                    type="text"
                    value={iframeData.height}
                    onChange={(e) => setIframeData({ ...iframeData, height: e.target.value })}
                    placeholder="400px"
                  />
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={insertIframe} className="btn-save">Insertar</button>
              <button onClick={() => setShowIframeModal(false)} className="btn-cancel">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArticleEditor;
