// magazine-front/src/components/admin/ArticleEditorBlocks.jsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../app_context/AuthContext';
import { useMagazine } from '../../app_context/MagazineContext';
import { useUI } from '../../app_context/UIContext';
import { Plus, Save, ArrowLeft, Edit, Trash2, FileText, Image as ImageIcon, Video, FolderPlus, X, User } from 'lucide-react';
import TextBlock from './blocks/TextBlock';
import ImageBlock from './blocks/ImageBlock';
import IframeBlock from './blocks/IframeBlock';
import HScrollEditor from './HScrollEditor';
import NewsletterTab from './NewsletterTab';
import axios from 'axios';
import './ArticleEditorBlocks.css';

function ArticleEditorBlocks() {
  const { currentUser, isArticleAuthor, isSuperAdmin, canPublishDirectly, canCreateContent } = useAuth();
  const {
    editorArticles,
    fetchEditorArticles,
    fetchArticles,
    editors,
    selectedArticle,
    setSelectedArticle,
    createArticle,
    updateArticle,
    deleteArticle,
    uploadCoverImage,
    fetchBlocksByArticleId,
    createBlock,
    updateBlock,
    deleteBlock,
    reorderBlocks,
    uploadBlockImage,
    uploadPanelAudio,
    submitForApproval
  } = useMagazine();
  const { showSuccess, showError, navigateToHome, showEditor, openEditorToEdit, setOpenEditorToEdit } = useUI();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState('articles');
  const [editingArticle, setEditingArticle] = useState(null);
  const [formData, setFormData] = useState({
    title_article: '',
    excerpt_article: '',
    category_article: 'general',
    authors: [currentUser?.id_user].filter(Boolean),
    project_id: '',
    status_article: 'draft',
    featured_article: false
  });
  const [selectedAuthorToAdd, setSelectedAuthorToAdd] = useState('');
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [projects, setProjects] = useState([]);
  const [selectedProjectFormat, setSelectedProjectFormat] = useState(null);
  const [articleContentType, setArticleContentType] = useState('regular');
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectData, setNewProjectData] = useState({
    title_project: '',
    description_project: '',
    type_project: '',
    format_project: '',
    status_project: 'published'
  });
  const [newProjectAuthors, setNewProjectAuthors] = useState([]);
  const [selectedProjectAuthorToAdd, setSelectedProjectAuthorToAdd] = useState('');

  // Fetch available projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch all articles (including drafts) for editor list
  useEffect(() => {
    fetchEditorArticles();
  }, []);

  // Load blocks when editing an article
  useEffect(() => {
    if (editingArticle?.id_article) {
      loadArticleBlocks(editingArticle.id_article);
    }
  }, [editingArticle]);

  // Detect project format when project_id changes (only updates content type default, not a lock)
  useEffect(() => {
    if (formData.project_id) {
      const selectedProject = projects.find(p => p.id_project === parseInt(formData.project_id));
      if (selectedProject) {
        setSelectedProjectFormat(selectedProject.format_project);
        // Suggest content type based on project format, but editor can override
        setArticleContentType(selectedProject.format_project === 'cómic' ? 'cómic' : 'regular');
      }
    } else {
      setSelectedProjectFormat(null);
    }
  }, [formData.project_id, projects]);

  // Load selected article for editing when editor opens via Edit button from ArticleDetail
  // openEditorToEdit flag ensures this only triggers when coming from an explicit Edit action,
  // not when the editor is opened to create a new article (FloatingEditorButton, Header, etc.)
  useEffect(() => {
    if (showEditor && selectedArticle && !editingArticle && openEditorToEdit) {
      setEditingArticle(selectedArticle);
      const authorIds = selectedArticle.authors?.map(a => a.id_user) ||
                       (selectedArticle.author_id ? [selectedArticle.author_id] : []);
      setFormData({
        title_article: selectedArticle.title_article,
        excerpt_article: selectedArticle.excerpt_article || '',
        category_article: selectedArticle.category_article || 'general',
        authors: authorIds,
        project_id: selectedArticle.project_id || '',
        status_article: selectedArticle.status_article,
        featured_article: selectedArticle.featured_article
      });

      // Detect content type from existing blocks
      const hasComicBlocks = selectedArticle.blocks?.some(b => b.block_type === 'comic_panel');
      setArticleContentType(hasComicBlocks ? 'cómic' : 'regular');

      // Set cover image preview if exists
      if (selectedArticle.cover_image_article) {
        const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
        const coverUrl = selectedArticle.cover_image_article.startsWith('http')
          ? selectedArticle.cover_image_article
          : selectedArticle.cover_image_article.startsWith('/')
            ? `${apiUrl}${selectedArticle.cover_image_article}`
            : `${apiUrl}/${selectedArticle.cover_image_article}`;
        setCoverImagePreview(coverUrl);
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Clear selectedArticle and reset the edit intent flag after loading
      setSelectedArticle(null);
      setOpenEditorToEdit(false);
    }
  }, [showEditor, selectedArticle, editingArticle, openEditorToEdit]);

  const fetchProjects = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
      const response = await axios.get(`${apiUrl}/magazine-project`, {
        params: { status: 'published' }
      });

      if (response.data && response.data.data) {
        setProjects(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      // Don't show error to user, just fail silently
    }
  };

  const handleProjectInputChange = (e) => {
    const { name, value } = e.target;
    setNewProjectData({
      ...newProjectData,
      [name]: value
    });
  };

  const handleAddProjectAuthor = () => {
    if (!selectedProjectAuthorToAdd) return;
    const authorId = parseInt(selectedProjectAuthorToAdd);
    if (newProjectAuthors.some(a => a.id_user === authorId)) {
      showError(t('editor.author.alreadyAdded'));
      return;
    }
    const editor = editors.find(e => e.id_user === authorId);
    if (editor) {
      setNewProjectAuthors([...newProjectAuthors, { id_user: editor.id_user, name_user: editor.name_user, image_user: editor.image_user }]);
    }
    setSelectedProjectAuthorToAdd('');
  };

  const handleRemoveProjectAuthor = (userId) => {
    if (newProjectAuthors.length <= 1) {
      showError(t('editor.author.atLeastOne'));
      return;
    }
    setNewProjectAuthors(newProjectAuthors.filter(a => a.id_user !== userId));
  };

  const handleCreateProject = async () => {
    if (!newProjectData.title_project.trim()) {
      showError(t('editor.project.titleRequired'));
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
      const primaryAuthor = newProjectAuthors[0] || { id_user: currentUser.id_user, name_user: currentUser.name_user };
      const projectDataToSend = {
        ...newProjectData,
        author_id: primaryAuthor.id_user,
        author_name: primaryAuthor.name_user,
        authors: newProjectAuthors.map((a, index) => ({ user_id: a.id_user, author_order: index }))
      };

      const response = await axios.post(`${apiUrl}/magazine-project/create`, projectDataToSend);

      if (response.data && response.data.data) {
        const newProject = response.data.data;
        showSuccess(t('messages.success.projectCreated'));

        // Refresh projects list
        await fetchProjects();

        // Auto-select the new project
        setFormData({
          ...formData,
          project_id: newProject.id_project
        });

        // Close modal and reset form
        setShowProjectModal(false);
        setNewProjectAuthors(currentUser ? [{ id_user: currentUser.id_user, name_user: currentUser.name_user, image_user: currentUser.image_user }] : []);
        setSelectedProjectAuthorToAdd('');
        setNewProjectData({
          title_project: '',
          description_project: '',
          type_project: '',
          format_project: '',
          status_project: 'published'
        });
      }
    } catch (error) {
      console.error('Error creating project:', error);
      showError(error.response?.data?.error || t('messages.error.createProject'));
    }
  };

  const handleDeleteProject = async () => {
    if (!formData.project_id) return;
    const project = projects.find(p => p.id_project === parseInt(formData.project_id));
    if (!project) return;

    const confirmed = window.confirm(t('editor.project.deleteConfirm', { title: project.title_project }));
    if (!confirmed) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
      await axios.delete(`${apiUrl}/magazine-project/remove-by-id/${project.id_project}`);
      showSuccess(t('editor.project.deleteSuccess'));

      // Deselect the project and refresh the list
      setFormData({ ...formData, project_id: '' });
      setSelectedProjectFormat(null);
      await fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      showError(error.response?.data?.error || t('editor.project.deleteError'));
    }
  };

  const loadArticleBlocks = async (article_id) => {
    const result = await fetchBlocksByArticleId(article_id);
    if (result.success) {
      const fetchedBlocks = result.data || [];
      setBlocks(fetchedBlocks);
      // Detect content type from the actual blocks, not from article metadata
      // This also fixes the case where the user switches from editing a comic to a regular article
      const hasComicBlocks = fetchedBlocks.some(b => b.block_type === 'comic_panel');
      setArticleContentType(hasComicBlocks ? 'cómic' : 'regular');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    if (fieldErrors[name]) {
      setFieldErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
    }
  };

  const handleCoverImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverImageFile(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const addBlock = (blockType) => {
    // Generate unique tempId using timestamp and random string to avoid collisions
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    setBlocks(prevBlocks => {
      const newBlock = {
        tempId: tempId,
        block_type: blockType,
        block_order: prevBlocks.length,
        content: blockType === 'text' ? '' : null,
        image_url: blockType === 'image' ? '' : null,
        image_alt: blockType === 'image' ? '' : null,
        image_caption: blockType === 'image' ? '' : null,
        iframe_url: blockType === 'iframe' ? '' : null,
        iframe_width: blockType === 'iframe' ? '100%' : null,
        iframe_height: blockType === 'iframe' ? '400px' : null
      };
      return [...prevBlocks, newBlock];
    });
  };

  const handleBlockUpdate = (updatedBlock) => {
    setBlocks(prevBlocks => {
      return prevBlocks.map(block => {
        const isMatch = (block.id_block && block.id_block === updatedBlock.id_block) ||
                       (block.tempId && block.tempId === updatedBlock.tempId);

        if (isMatch) {
          return { ...block, ...updatedBlock };
        }
        return block;
      });
    });
  };

  const handleBlockDelete = (blockToDelete) => {
    if (!confirm(t('editor.confirmDeleteBlock'))) {
      return;
    }

    setBlocks(prevBlocks => prevBlocks.filter(block =>
      !(block.id_block === blockToDelete.id_block || block.tempId === blockToDelete.tempId)
    ));
  };

  const moveBlockUp = (index) => {
    if (index === 0) return;
    setBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks];
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
      return newBlocks;
    });
  };

  const moveBlockDown = (index) => {
    setBlocks(prevBlocks => {
      if (index === prevBlocks.length - 1) return prevBlocks;
      const newBlocks = [...prevBlocks];
      [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
      return newBlocks;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = {};

    if (!formData.title_article.trim()) {
      errors.title_article = 'El título es obligatorio';
    } else if (formData.title_article.length > 200) {
      errors.title_article = `El título es demasiado largo (${formData.title_article.length}/200 caracteres máx.)`;
    }

    if (formData.excerpt_article && formData.excerpt_article.length > 500) {
      errors.excerpt_article = `El extracto es demasiado largo (${formData.excerpt_article.length}/500 caracteres máx.)`;
    }

    if (formData.authors.length === 0) {
      errors.authors = 'El artículo debe tener al menos un autor';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showError(Object.values(errors).join(' · '));
      return;
    }

    setFieldErrors({});

    // Check if there's at least one complete block
    const hasCompleteBlock = blocks.some(block => {
      if (block.block_type === 'text') {
        return block.content && block.content.trim() !== '';
      }
      if (block.block_type === 'image') {
        return block.image_url && block.image_url.trim() !== '';
      }
      if (block.block_type === 'iframe') {
        return block.iframe_url && block.iframe_url.trim() !== '';
      }
      if (block.block_type === 'comic_panel') {
        return block.image_url && block.image_url.trim() !== '';
      }
      return false;
    });

    if (!hasCompleteBlock) {
      const errorMessage = articleContentType === 'cómic'
        ? t('editor.validation.addComicPanel')
        : t('editor.validation.addContentBlock');
      showError(errorMessage);
      return;
    }

    setSaving(true);

    try {
      // Decide intent: did an editor pick "Enviar para aprobación"?
      // Only editors (non-admin, non-super-admin) go through the approval flow.
      // Admins + super admins publish directly via the regular update endpoint.
      const wantsSubmission = !canPublishDirectly && formData.status_article === 'pending_approval';

      let articleResult;
      const articleData = {
        ...formData,
        author_id: currentUser.id_user,
        authors: formData.authors,
        project_id: formData.project_id || null,
        // For editors who picked "submit", persist as draft first; the transition
        // happens via /submit-for-approval below. Admins keep their chosen status.
        status_article: wantsSubmission ? 'draft' : formData.status_article,
        content_article: 'Block-based content' // Placeholder for backward compatibility
      };

      // Create or update article
      if (editingArticle) {
        articleResult = await updateArticle(editingArticle.id_article, articleData);
      } else {
        articleResult = await createArticle(articleData);
      }

      if (articleResult.error) {
        showError(articleResult.error);
        setSaving(false);
        return;
      }

      const article_id = articleResult.data.id_article;

      // Upload cover image if provided
      if (coverImageFile) {
        const uploadResult = await uploadCoverImage(article_id, coverImageFile);
        if (uploadResult.error) {
          showError(uploadResult.error);
        }
      }

      // Save blocks
      await saveBlocks(article_id);

      // If the editor chose "Submit for approval", transition the article now.
      if (wantsSubmission) {
        const submitResult = await submitForApproval(article_id);
        if (submitResult.error) {
          // Article + blocks did save, but the transition failed. Tell user.
          showError(submitResult.error);
        }
      } else {
        showSuccess(editingArticle ? t('messages.success.articleUpdated') : t('messages.success.articleCreated'));
      }
      await Promise.all([fetchArticles(), fetchEditorArticles()]);
      resetForm();
    } catch (err) {
      showError(t('messages.error.saveArticle'));
      console.error('Submit error:', err);
    } finally {
      setSaving(false);
    }
  };

  const saveBlocks = async (article_id) => {
    // Delete removed blocks (if editing)
    if (editingArticle) {
      const existingBlocks = await fetchBlocksByArticleId(article_id);
      if (existingBlocks.success) {
        const currentBlockIds = blocks
          .filter(b => b.id_block)
          .map(b => b.id_block);

        for (const existingBlock of existingBlocks.data) {
          if (!currentBlockIds.includes(existingBlock.id_block)) {
            await deleteBlock(existingBlock.id_block);
          }
        }
      }
    }

    // Validate and filter blocks before saving
    const isBlockComplete = (block) => {
      if (block.block_type === 'text') {
        return block.content && block.content.trim() !== '';
      }
      if (block.block_type === 'image') {
        return block.image_url && block.image_url.trim() !== '';
      }
      if (block.block_type === 'iframe') {
        return block.iframe_url && block.iframe_url.trim() !== '';
      }
      if (block.block_type === 'comic_panel') {
        if (block.interaction_type === 'iframe') {
          return block.interaction_data && block.interaction_data.trim() !== '';
        }
        return block.image_url && block.image_url.trim() !== '';
      }
      return false;
    };

    // Create or update blocks
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      // Skip incomplete blocks
      if (!isBlockComplete(block)) {
        console.log(`Skipping incomplete block at index ${i}:`, block.block_type);
        continue;
      }

      const blockData = {
        article_id,
        block_type: block.block_type,
        block_order: i,
        content: block.content,
        image_url: block.image_url,
        image_alt: block.image_alt,
        image_caption: block.image_caption,
        iframe_url: block.iframe_url,
        iframe_width: block.iframe_width,
        iframe_height: block.iframe_height,
        // Interactive panel fields
        is_interactive: block.is_interactive || false,
        interaction_type: block.interaction_type || null,
        interaction_data: block.interaction_data || null,
        // Audio configuration fields
        audio_stop_panel: block.audio_stop_panel || null,
        audio_mode: block.audio_mode || null
      };

      if (block.id_block) {
        // Update existing block
        await updateBlock(block.id_block, blockData);
      } else {
        // Create new block
        await createBlock(blockData);
      }
    }
  };

  const handleDelete = async (id_article) => {
    if (!confirm(t('editor.confirmDeleteArticle'))) {
      return;
    }

    const result = await deleteArticle(id_article);
    if (!result.error) {
      showSuccess(t('messages.success.articleDeleted'));
      await fetchEditorArticles();
    }
  };

  const handleEdit = (article) => {
    setEditingArticle(article);
    const authorIds = article.authors?.map(a => a.id_user) ||
                     (article.author_id ? [article.author_id] : []);
    setFormData({
      title_article: article.title_article,
      excerpt_article: article.excerpt_article || '',
      category_article: article.category_article || 'general',
      authors: authorIds,
      project_id: article.project_id || '',
      status_article: article.status_article,
      featured_article: article.featured_article
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingArticle(null);
    setFormData({
      title_article: '',
      excerpt_article: '',
      category_article: 'general',
      authors: [currentUser?.id_user].filter(Boolean),
      project_id: '',
      status_article: 'draft',
      featured_article: false
    });
    setFieldErrors({});
    setBlocks([]);
    setCoverImageFile(null);
    setCoverImagePreview(null);
    setSelectedProjectFormat(null);
    setArticleContentType('regular');
    setSelectedAuthorToAdd('');
  };

  const handleAddAuthor = () => {
    if (!selectedAuthorToAdd) return;
    const authorId = parseInt(selectedAuthorToAdd);
    if (formData.authors.includes(authorId)) {
      showError(t('editor.author.alreadyAdded'));
      return;
    }
    setFormData({ ...formData, authors: [...formData.authors, authorId] });
    setSelectedAuthorToAdd('');
  };

  const handleRemoveAuthor = (authorId) => {
    if (formData.authors.length <= 1) {
      showError(t('editor.author.atLeastOne'));
      return;
    }
    setFormData({ ...formData, authors: formData.authors.filter(id => id !== authorId) });
  };

  const getAuthorDetails = (authorId) => editors.find(e => e.id_user === authorId);

  if (!canCreateContent) {
    return (
      <div className="editor-unauthorized">
        <h2>{t('editor.unauthorized.title')}</h2>
        <p>{t('editor.unauthorized.message')}</p>
        <p>{t('editor.unauthorized.contact')}</p>
        <button onClick={navigateToHome} className="btn-back-nav btn-back"><ArrowLeft size={20} />{t('common.buttons.backToHome')}</button>
      </div>
    );
  }

  return (
    <div className="article-editor-blocks">
      <div className="editor-container">
        <div className="editor-header">
          {/* Row 1: back + title */}
          <div className="editor-header-top">
            <div className="editor-title-section">
              <button onClick={navigateToHome} className="btn-back-nav" title={t('common.buttons.backToHome')}>
                <ArrowLeft size={24} />
              </button>
              <h1>{activeTab === 'newsletter' ? 'Envía tus recomendaciones' : (editingArticle ? t('editor.title.edit') : t('editor.title.create'))}</h1>
            </div>
          </div>

          {/* Row 2: project selector + create new project button */}
          <div className="editor-project-row">
            <div className="form-group-inline">
              <label htmlFor="project-header">{t('editor.project.label')}</label>
              <div className="project-selector-row">
                <select
                  id="project-header"
                  name="project_id"
                  value={formData.project_id}
                  onChange={handleInputChange}
                  className={`project-selector-header ${!formData.project_id ? 'select-placeholder' : ''}`}
                >
                  <option value="">{t('editor.project.noProject')}</option>
                  {projects.map(project => (
                    <option key={project.id_project} value={project.id_project}>
                      {project.title_project}
                    </option>
                  ))}
                </select>
                {formData.project_id && (
                  <button
                    type="button"
                    className="btn-delete-project"
                    onClick={handleDeleteProject}
                    title={t('editor.project.deleteTitle')}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
            <button
              type="button"
              className="btn-create-project-header"
              onClick={() => {
                setNewProjectAuthors(currentUser ? [{ id_user: currentUser.id_user, name_user: currentUser.name_user, image_user: currentUser.image_user }] : []);
                setSelectedProjectAuthorToAdd('');
                setShowProjectModal(true);
              }}
              title={t('editor.project.createNew')}
            >
              <FolderPlus size={18} />
              <span>{t('editor.project.createNew')}</span>
            </button>
          </div>

          {/* Row 3: authors + category + status inline */}
          <div className="editor-selectors-row">
            <div className="form-group-inline authors-section">
              <label>{t('editor.authors.label')}</label>
              <div className="authors-list-compact">
                {formData.authors.map((authorId, index) => {
                  const author = getAuthorDetails(authorId);
                  return (
                    <div key={authorId} className="author-item-compact">
                      <span className="author-order">{index + 1}.</span>
                      {author?.image_user && (
                        <img
                          src={`${import.meta.env.VITE_API_URL}/user/image/${author.image_user}`}
                          alt={author.name_user}
                          className="author-avatar-tiny"
                        />
                      )}
                      {!author?.image_user && <User className="author-icon-placeholder" size={14} />}
                      <span className="author-name-compact">{author?.name_user || t('editor.author.unknown', { id: authorId })}</span>
                      {index === 0 && <span className="first-author-badge-compact">{t('editor.author.firstBadge')}</span>}
                      {formData.authors.length > 1 && (
                        <button
                          type="button"
                          className="btn-remove-author-compact"
                          onClick={() => handleRemoveAuthor(authorId)}
                          title={t('editor.author.remove')}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="add-author-row-compact">
                <select
                  className="author-selector-compact"
                  value={selectedAuthorToAdd}
                  onChange={(e) => setSelectedAuthorToAdd(e.target.value)}
                >
                  <option value="">{t('editor.author.add')}</option>
                  {editors.filter(e => !formData.authors.includes(e.id_user)).map(editor => (
                    <option key={editor.id_user} value={editor.id_user}>{editor.name_user}</option>
                  ))}
                </select>
                {selectedAuthorToAdd && (
                  <button
                    type="button"
                    className="btn-add-author-compact"
                    onClick={handleAddAuthor}
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>
              {fieldErrors.authors && (
                <span className="field-error-msg">{fieldErrors.authors}</span>
              )}
            </div>

            <div className="form-group-inline">
              <label htmlFor="category-header">{t('editor.category.label')}</label>
              <select
                id="category-header"
                name="category_article"
                value={formData.category_article}
                onChange={handleInputChange}
                className={`project-selector-header ${formData.category_article === 'general' ? 'select-placeholder' : ''}`}
              >
                <option value="general">{t('editor.category.general')}</option>
                <option value="reportaje">{t('editor.category.reportage')}</option>
                <option value="multimedia">{t('editor.category.multimedia')}</option>
                <option value="cultura">{t('editor.category.culture')}</option>
                <option value="sociedad">{t('editor.category.society')}</option>
                <option value="opinion">{t('editor.category.opinion')}</option>
                <option value="crónica">{t('editor.category.cronica')}</option>
                <option value="entrevista">{t('editor.category.entrevista')}</option>
                <option value="editorial">{t('editor.category.editorial')}</option>
                <option value="fotoreportaje">{t('editor.category.fotoreportaje')}</option>
                <option value="video reportaje">{t('editor.category.videoreportaje')}</option>
                <option value="podcast">{t('editor.category.podcast')}</option>
                <option value="cómic multimedia">{t('editor.category.comic')}</option>
                <option value="crítica">{t('editor.category.critica')}</option>
                <option value="ensayo">{t('editor.category.ensayo')}</option>
                <option value="terrenito en pluton">{t('editor.category.microAbierto')}</option>
                <option value="humor">{t('editor.category.humor')}</option>
                <option value="internacional">{t('editor.category.internacional')}</option>
              </select>
            </div>

            <div className="form-group-inline">
              <label htmlFor="status-header">{t('editor.status.label')}</label>
              <select
                id="status-header"
                name="status_article"
                value={formData.status_article}
                onChange={handleInputChange}
                className={`project-selector-header ${formData.status_article === 'draft' ? 'select-placeholder' : ''}`}
              >
                <option value="draft">{t('editor.status.draft')}</option>
                {canPublishDirectly ? (
                  // Admin / super-admin: direct publish, no approval round-trip.
                  <option value="published">{t('editor.status.published')}</option>
                ) : (
                  // Editor: goes through pending_approval → super-admin approves.
                  <option value="pending_approval">Enviar para aprobación</option>
                )}
                {/* Show current state read-only for editors viewing their pending/published articles. */}
                {editingArticle?.status_article === 'pending_approval' && !canPublishDirectly && (
                  <option value="pending_approval" disabled>En revisión (pendiente)</option>
                )}
                {editingArticle?.status_article === 'published' && !canPublishDirectly && (
                  <option value="published" disabled>Publicado</option>
                )}
              </select>
            </div>
          </div>
        </div>

        <div className="editor-tabs-switch">
          <div className="content-type-switch">
            <button
              type="button"
              className={`switch-option ${activeTab === 'articles' ? 'switch-active' : ''}`}
              onClick={() => setActiveTab('articles')}
            >
              {t('editor.title.create').split(' ')[0]}
            </button>
            <button
              type="button"
              className={`switch-option ${activeTab === 'newsletter' ? 'switch-active' : ''}`}
              onClick={() => setActiveTab('newsletter')}
            >
              Recomendaciones
            </button>
          </div>
        </div>

        {activeTab === 'newsletter' && <NewsletterTab />}

        {activeTab === 'articles' && <form className="editor-form" onSubmit={handleSubmit}>
          {/* Cover Image */}
          <div className="form-group full-width cover-image-group">
            <div className="cover-image-upload">
              {coverImagePreview ? (
                <div className="cover-image-preview">
                  <img src={coverImagePreview} alt={t('editor.coverImage.preview')} />
                  <button
                    type="button"
                    className="btn-remove-preview"
                    onClick={() => {
                      setCoverImageFile(null);
                      setCoverImagePreview(null);
                      document.getElementById('cover').value = '';
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="file"
                    id="cover"
                    accept="image/*"
                    onChange={handleCoverImageChange}
                    className="cover-image-input"
                  />
                  <label htmlFor="cover" className="cover-image-label">
                    <Plus size={24} />
                    <span>{t('editor.coverImage.select')}</span>
                  </label>
                </>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="form-group full-width">
            <input
              type="text"
              id="title"
              name="title_article"
              value={formData.title_article}
              onChange={handleInputChange}
              placeholder={t('editor.title.placeholder')}
              className={fieldErrors.title_article ? 'input-error' : ''}
              required
            />
            {fieldErrors.title_article && (
              <span className="field-error-msg">{fieldErrors.title_article}</span>
            )}
          </div>

          {/* Excerpt */}
          <div className="form-group full-width">
            <textarea
              id="excerpt"
              name="excerpt_article"
              value={formData.excerpt_article}
              onChange={handleInputChange}
              rows="3"
              placeholder={t('editor.excerpt.placeholder')}
              className={fieldErrors.excerpt_article ? 'input-error' : ''}
            />
            {fieldErrors.excerpt_article && (
              <span className="field-error-msg">{fieldErrors.excerpt_article}</span>
            )}
          </div>

          {/* Content type toggle switch */}
          <div className="form-group full-width">
            <div className="content-type-switch">
              <button
                type="button"
                className={`switch-option ${articleContentType === 'regular' ? 'switch-active' : ''}`}
                onClick={() => { setArticleContentType('regular'); setBlocks([]); }}
              >
                {t('editor.contentType.regular')}
              </button>
              <button
                type="button"
                className={`switch-option ${articleContentType === 'cómic' ? 'switch-active' : ''}`}
                onClick={() => { setArticleContentType('cómic'); setBlocks([]); }}
              >
                {t('editor.contentType.comic')}
              </button>
            </div>
          </div>

          {/* Content Blocks - Conditional based on article content type */}
          <div className="form-group full-width">
            {articleContentType === 'cómic' ? (
              // H-Scroll Editor for Comics
              <HScrollEditor
                panels={blocks.filter(b => b.block_type === 'comic_panel')}
                onPanelsChange={(newPanels) => {
                  setBlocks(newPanels);
                }}
                onUploadPanel={async (index, file) => {
                  const imageUrl = await uploadBlockImage(file);
                  return { image_url: imageUrl };
                }}
                onUploadAudio={uploadPanelAudio}
              />
            ) : (
              // Regular Block Editor for non-comic articles
              <>
                <label className="content-label">{t('editor.content.label')}</label>
                <div className="blocks-container">
                  {blocks.map((block, index) => (
                    <div key={block.id_block || block.tempId} className="block-wrapper">
                      {block.block_type === 'text' && (
                        <TextBlock
                          block={block}
                          onUpdate={handleBlockUpdate}
                          onDelete={handleBlockDelete}
                          isEditing={true}
                        />
                      )}
                      {block.block_type === 'image' && (
                        <ImageBlock
                          block={block}
                          onUpdate={handleBlockUpdate}
                          onDelete={handleBlockDelete}
                          onUploadImage={uploadBlockImage}
                          isEditing={true}
                        />
                      )}
                      {block.block_type === 'iframe' && (
                        <IframeBlock
                          block={block}
                          onUpdate={handleBlockUpdate}
                          onDelete={handleBlockDelete}
                          isEditing={true}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Block Buttons */}
                <div className="add-block-buttons">
                  <button type="button" className="btn-add-block" onClick={() => addBlock('text')}>
                    <FileText size={20} />
                    {t('editor.blocks.addText')}
                  </button>
                  <button type="button" className="btn-add-block" onClick={() => addBlock('image')}>
                    <ImageIcon size={20} />
                    {t('editor.blocks.addImage')}
                  </button>
                  <button type="button" className="btn-add-block" onClick={() => addBlock('iframe')}>
                    <Video size={20} />
                    {t('editor.blocks.addIframe')}
                  </button>
                </div>
              </>
            )}
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
              <span>{t('editor.featured.label')}</span>
            </label>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button type="submit" className="btn-save" disabled={saving}>
              <Save size={20} />
              {saving
                ? t('editor.saving')
                : formData.status_article === 'pending_approval'
                ? 'Enviar para aprobación'
                : (editingArticle ? t('editor.updateArticle') : t('editor.publishArticle'))}
            </button>
            {editingArticle && (
              <button type="button" className="btn-cancel" onClick={resetForm}>
                {t('editor.cancelEdit')}
              </button>
            )}
          </div>
        </form>}

        {activeTab === 'articles' && <div className="articles-list">
          <h2>{t('editor.articlesList.title')}</h2>
          <p className="list-subtitle">{t('editor.articlesList.subtitle')}</p>

          {editorArticles.filter(a => isSuperAdmin || isArticleAuthor(a)).length === 0 ? (
            <div className="empty-state">
              <p>{t('editor.articlesList.empty')}</p>
              <p>{t('editor.articlesList.emptyHint')}</p>
            </div>
          ) : (
            <div className="articles-grid">
              {editorArticles.filter(a => isSuperAdmin || isArticleAuthor(a)).map((article) => (
                <div key={article.id_article} className="article-item">
                  <div className="article-item-info">
                    <h4>{article.title_article}</h4>
                    <p className="article-meta">
                      <span className={`status status-${article.status_article}`}>
                        {article.status_article === 'published'
                          ? t('editor.status.published')
                          : article.status_article === 'pending_approval'
                          ? 'En revisión'
                          : t('editor.status.draft')}
                      </span>
                      <span className="category-badge">{article.category_article}</span>
                    </p>
                    <p className="article-author">
                      {t('article.detail.by')} {article.authors?.map(a => a.name_user).join(', ') || article.author_name || t('editor.author.unknownAuthor')}
                    </p>
                  </div>
                  {(isSuperAdmin || isArticleAuthor(article)) && (
                  <div className="article-item-actions">
                    <button
                      className="btn-edit"
                      onClick={() => handleEdit(article)}
                      title={t('common.buttons.edit')}
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(article.id_article)}
                      title={t('common.buttons.delete')}
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

      {/* Create Project Modal — rendered via portal to escape overflow/transform ancestors */}
      {showProjectModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowProjectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('editor.project.createNew')}</h2>
              <button
                className="modal-close"
                onClick={() => setShowProjectModal(false)}
                aria-label={t('common.buttons.close')}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="project_title">{t('editor.project.titleLabel')}</label>
                <input
                  type="text"
                  id="project_title"
                  name="title_project"
                  value={newProjectData.title_project}
                  onChange={handleProjectInputChange}
                  placeholder={t('editor.project.titlePlaceholder')}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="project_description">{t('editor.project.descriptionLabel')}</label>
                <textarea
                  id="project_description"
                  name="description_project"
                  value={newProjectData.description_project}
                  onChange={handleProjectInputChange}
                  rows="3"
                  placeholder={t('editor.project.descriptionPlaceholder')}
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="project_type">{t('editor.project.typeLabel')}</label>
                  <select
                    id="project_type"
                    name="type_project"
                    value={newProjectData.type_project}
                    onChange={handleProjectInputChange}
                    className={!newProjectData.type_project ? 'select-placeholder' : ''}
                  >
                    <option value="">{t('editor.project.selectType')}</option>
                    <option value="ficción">Ficción</option>
                    <option value="no-ficción">No-ficción</option>
                    <option value="ensayo">Ensayo</option>
                    <option value="académico">Académico</option>
                    <option value="científico">Científico</option>
                    <option value="periodístico">Periodístico</option>
                    <option value="poético">Poético</option>
                    <option value="narrativo">Narrativo</option>
                    <option value="experimental">Experimental</option>
                    <option value="documental">Documental</option>
                    <option value="autobiográfico">Autobiográfico</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="project_format">{t('editor.project.formatLabel')}</label>
                  <select
                    id="project_format"
                    name="format_project"
                    value={newProjectData.format_project}
                    onChange={handleProjectInputChange}
                    className={!newProjectData.format_project ? 'select-placeholder' : ''}
                  >
                    <option value="">{t('editor.project.selectFormat')}</option>
                    <option value="cómic">Cómic</option>
                    <option value="crónica">Crónica</option>
                    <option value="ensayo">Ensayo</option>
                    <option value="cuento">Cuento</option>
                    <option value="multimedia">Multimedia</option>
                    <option value="podcast">Podcast</option>
                    <option value="video">Video</option>
                    <option value="fotografía">Fotografía</option>
                    <option value="ilustración">Ilustración</option>
                    <option value="performance">Performance</option>
                    <option value="instalación">Instalación</option>
                    <option value="novela">Novela</option>
                    <option value="artículo">Artículo</option>
                    <option value="reportaje">Reportaje</option>
                    <option value="entrevista">Entrevista</option>
                    <option value="poesía">Poesía</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>{t('editor.project.collaboratorsLabel')}</label>
                <div className="authors-list-compact">
                  {newProjectAuthors.map(author => (
                    <div key={author.id_user} className="author-tag-compact">
                      <User size={12} />
                      <span>{author.name_user}</span>
                      <button
                        type="button"
                        className="remove-author-btn"
                        onClick={() => handleRemoveProjectAuthor(author.id_user)}
                        aria-label={t('editor.author.remove')}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="add-author-row-compact">
                  <select
                    className="author-selector-compact"
                    value={selectedProjectAuthorToAdd}
                    onChange={(e) => setSelectedProjectAuthorToAdd(e.target.value)}
                  >
                    <option value="">{t('editor.project.addCollaborator')}</option>
                    {editors.filter(e => !newProjectAuthors.some(a => a.id_user === e.id_user)).map(editor => (
                      <option key={editor.id_user} value={editor.id_user}>{editor.name_user}</option>
                    ))}
                  </select>
                  {selectedProjectAuthorToAdd && (
                    <button
                      type="button"
                      className="btn-add-author-compact"
                      onClick={handleAddProjectAuthor}
                    >
                      +
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowProjectModal(false)}
              >
                {t('common.buttons.cancel')}
              </button>
              <button
                type="button"
                className="btn-save"
                onClick={handleCreateProject}
              >
                {t('editor.project.createButton')}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}

export default ArticleEditorBlocks;
