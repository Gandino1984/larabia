// magazine-front/src/components/admin/ArticleEditorBlocks.jsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../app_context/AuthContext';
import { useMagazine } from '../../app_context/MagazineContext';
import { useUI } from '../../app_context/UIContext';
import {
  Plus, Save, ArrowLeft, Edit, Trash2, FileText, Image as ImageIcon, Video, FolderPlus, FolderOpen,
  X, User, Eye, Check, ChevronLeft, ChevronRight, Send, Undo2, Layers, Library, AlertCircle
} from 'lucide-react';
import TextBlock from './blocks/TextBlock';
import ImageBlock from './blocks/ImageBlock';
import IframeBlock from './blocks/IframeBlock';
import HScrollEditor from './HScrollEditor';
import MicroPerfilEditor from './MicroPerfilEditor';
import axios from 'axios';
import './ArticleEditorBlocks.css';

// Decide which editor UI to show for an article: comic panels win, then the
// category-driven micro-perfil format, otherwise the regular block editor.
const detectContentType = (blocks, category) => {
  if (blocks?.some(b => b.block_type === 'comic_panel')) return 'cómic';
  if ((category || '').toLowerCase() === 'micro-perfiles') return 'microperfil';
  return 'regular';
};

// A block counts as content once it has something in it (empty blocks are
// skipped on save).
const isBlockComplete = (block) => {
  if (block.block_type === 'text') return !!(block.content && block.content.trim() !== '');
  if (block.block_type === 'image') return !!(block.image_url && block.image_url.trim() !== '');
  if (block.block_type === 'iframe') return !!(block.iframe_url && block.iframe_url.trim() !== '');
  if (block.block_type === 'comic_panel') {
    if (block.interaction_type === 'iframe') return !!(block.interaction_data && block.interaction_data.trim() !== '');
    return !!(block.image_url && block.image_url.trim() !== '');
  }
  return false;
};

// Project classification options (new-project step + edit-project modal).
const PROJECT_TYPES = [
  ['ficción', 'Ficción'], ['no-ficción', 'No-ficción'], ['ensayo', 'Ensayo'], ['académico', 'Académico'],
  ['científico', 'Científico'], ['periodístico', 'Periodístico'], ['poético', 'Poético'], ['narrativo', 'Narrativo'],
  ['experimental', 'Experimental'], ['documental', 'Documental'], ['autobiográfico', 'Autobiográfico']
];
const PROJECT_FORMATS = [
  ['cómic', 'Cómic'], ['crónica', 'Crónica'], ['ensayo', 'Ensayo'], ['cuento', 'Cuento'], ['multimedia', 'Multimedia'],
  ['podcast', 'Podcast'], ['video', 'Video'], ['fotografía', 'Fotografía'], ['ilustración', 'Ilustración'],
  ['performance', 'Performance'], ['instalación', 'Instalación'], ['novela', 'Novela'], ['artículo', 'Artículo'],
  ['reportaje', 'Reportaje'], ['entrevista', 'Entrevista'], ['poesía', 'Poesía']
];
// Publication categories: [value, i18n key].
const CATEGORIES = [
  ['reportaje', 'editor.category.reportage'], ['multimedia', 'editor.category.multimedia'],
  ['cultura', 'editor.category.culture'], ['sociedad', 'editor.category.society'],
  ['opinion', 'editor.category.opinion'], ['crónica', 'editor.category.cronica'],
  ['entrevista', 'editor.category.entrevista'], ['editorial', 'editor.category.editorial'],
  ['fotoreportaje', 'editor.category.fotoreportaje'], ['video reportaje', 'editor.category.videoreportaje'],
  ['podcast', 'editor.category.podcast'], ['cómic multimedia', 'editor.category.comic'],
  ['crítica', 'editor.category.critica'], ['ensayo', 'editor.category.ensayo'],
  ['terrenito en pluton', 'editor.category.microAbierto'], ['internacional', 'editor.category.internacional'],
  ['no-ficcion', 'editor.category.noficcion'], ['ficcion', 'editor.category.ficcion'],
  ['micro-perfiles', 'editor.category.microperfiles'], ['talleres', 'editor.category.talleres'],
  ['infantil', 'editor.category.infantil']
];

const EMPTY_WIZARD_PROJECT = { title_project: '', description_project: '', type_project: '', format_project: '' };
const TOTAL_STEPS = 6;

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
    submitForApproval,
    revertToDraft
  } = useMagazine();
  const {
    showSuccess, showError, navigateToHome, navigateToArticlesList, showEditor,
    openEditorToEdit, setOpenEditorToEdit, editorInitialView, editorReturnTo
  } = useUI();
  const { t } = useTranslation();

  // The creator is a step-by-step process ('wizard'); the author's own list
  // lives apart in "Mis publicaciones" ('mine').
  const [view, setView] = useState(editorInitialView || 'wizard');
  const [step, setStep] = useState(1);
  // Step 1: the publication goes in a new project or an existing one.
  const [projectMode, setProjectMode] = useState(null); // 'new' | 'existing' | null
  // The new project being set up in the wizard (created on the first save).
  const [wizardProject, setWizardProject] = useState(EMPTY_WIZARD_PROJECT);
  const [wizardProjectCoverFile, setWizardProjectCoverFile] = useState(null);
  const [wizardProjectCoverPreview, setWizardProjectCoverPreview] = useState(null);
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
  // Project cover image (separate from the article cover above).
  const [projectCoverFile, setProjectCoverFile] = useState(null);
  const [projectCoverPreview, setProjectCoverPreview] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [projects, setProjects] = useState([]);
  const [selectedProjectFormat, setSelectedProjectFormat] = useState(null);
  const [articleContentType, setArticleContentType] = useState('regular');
  const [showProjectModal, setShowProjectModal] = useState(false);
  // null = creating a new project; an id = editing/continuing an existing draft.
  const [editingProjectId, setEditingProjectId] = useState(null);
  // Articles (incl. comics) that belong to the project being edited, so the
  // author can jump straight into editing their panels in the article creator.
  const [projectArticles, setProjectArticles] = useState([]);
  // Editor article-list filter: 'all' | 'draft' | 'pending_approval' | 'published'.
  const [articleListFilter, setArticleListFilter] = useState('all');
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
  // Re-run once the logged-in user is known so the auth header is sent and the
  // author's own drafts/pending come back (not just published content).
  useEffect(() => {
    if (currentUser?.id_user) fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id_user]);

  // Fetch articles (including the author's own drafts) for the editor list
  useEffect(() => {
    fetchEditorArticles();
  }, [fetchEditorArticles]);

  // Open on the requested view ("Mis publicaciones" from the articles section).
  useEffect(() => {
    if (showEditor) setView(editorInitialView || 'wizard');
  }, [showEditor, editorInitialView]);

  // The content mark (step 5) clears as soon as there is some content.
  useEffect(() => {
    if (blocks.some(isBlockComplete)) clearFieldError('content');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  // Each step / view starts at the top of the page.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, view]);

  // Detect project format when project_id changes. A comic project suggests the
  // comic content type for a new, still-empty publication (never a lock).
  useEffect(() => {
    if (formData.project_id) {
      const selectedProject = projects.find(p => p.id_project === parseInt(formData.project_id));
      if (selectedProject) {
        setSelectedProjectFormat(selectedProject.format_project);
        if (!editingArticle && selectedProject.format_project === 'cómic' && !blocks.some(isBlockComplete)) {
          setArticleContentType('cómic');
        }
      }
    } else {
      setSelectedProjectFormat(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      // Detect content type from blocks + category (micro-perfil is category-driven).
      setArticleContentType(detectContentType(selectedArticle.blocks, selectedArticle.category_article));
      loadArticleBlocks(selectedArticle.id_article, selectedArticle.category_article);
      setProjectMode(selectedArticle.project_id ? 'existing' : null);
      setView('wizard');
      setStep(1);

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
      // Send identity so the back-end applies role visibility: authors also get
      // their own draft/pending projects (not just published ones) to attach to.
      const response = await axios.get(`${apiUrl}/magazine-project`, {
        headers: { 'x-user-id': currentUser?.id_user }
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

  const handleProjectCoverChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        showError(t('editor.coverImage.mustBeImage'));
        e.target.value = '';
        return;
      }
      setProjectCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setProjectCoverPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProjectCover = async () => {
    const hadNewFile = !!projectCoverFile;
    setProjectCoverFile(null);
    setProjectCoverPreview(null);
    const input = document.getElementById('project_cover');
    if (input) input.value = '';
    // If we're clearing an already-saved cover (not just an unsaved pick),
    // remove it on the server too.
    if (editingProjectId && !hadNewFile) {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
        await axios.delete(`${apiUrl}/magazine-project/remove-cover-image/${editingProjectId}`, {
          headers: { 'x-user-id': currentUser?.id_user }
        });
        await fetchProjects();
      } catch (error) {
        console.error('Error removing project cover:', error);
      }
    }
  };

  const handleAddProjectAuthor = (rawId) => {
    const authorId = parseInt(rawId);
    if (!authorId) return;
    if (newProjectAuthors.some(a => a.id_user === authorId)) {
      showError(t('editor.author.alreadyAdded'));
      return;
    }
    const editor = editors.find(e => e.id_user === authorId);
    if (editor) {
      setNewProjectAuthors(prev => [...prev, { id_user: editor.id_user, name_user: editor.name_user, image_user: editor.image_user }]);
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

  // Build the content payload from the current modal state (no status — status
  // is managed separately so editing an existing project never changes it by
  // surprise).
  const buildProjectPayload = () => {
    const primaryAuthor = newProjectAuthors[0] || { id_user: currentUser.id_user, name_user: currentUser.name_user };
    return {
      title_project: newProjectData.title_project,
      description_project: newProjectData.description_project,
      type_project: newProjectData.type_project,
      format_project: newProjectData.format_project,
      author_id: primaryAuthor.id_user,
      author_name: primaryAuthor.name_user,
      authors: newProjectAuthors.map((a, index) => ({ user_id: a.id_user, author_order: index }))
    };
  };

  // Create the project on first save, then update it on subsequent saves —
  // returns the persisted project id. `statusOverride` sets the status on a NEW
  // project (defaults to draft) and only changes an EXISTING project's status
  // when explicitly given (so editing a published project keeps it published).
  // Upload the selected project cover (if any) once the project has an id.
  const uploadProjectCover = async (projectId) => {
    if (!projectCoverFile || !projectId) return;
    const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
    const formData = new FormData();
    formData.append('image', projectCoverFile);
    await axios.post(`${apiUrl}/magazine-project/upload-cover-image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'x-user-id': currentUser?.id_user,
        'x-project-id': projectId
      }
    });
    setProjectCoverFile(null);
  };

  const persistProject = async (statusOverride) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
    const authHeader = { headers: { 'x-user-id': currentUser?.id_user } };
    const payload = buildProjectPayload();
    if (editingProjectId) {
      if (statusOverride) payload.status_project = statusOverride;
      await axios.patch(`${apiUrl}/magazine-project/update/${editingProjectId}`, payload, authHeader);
      await uploadProjectCover(editingProjectId);
      return editingProjectId;
    }
    payload.status_project = statusOverride || 'draft';
    const response = await axios.post(`${apiUrl}/magazine-project/create`, payload, authHeader);
    const id = response.data?.data?.id_project;
    if (id) setEditingProjectId(id);
    await uploadProjectCover(id);
    return id;
  };

  const resetProjectModal = () => {
    setShowProjectModal(false);
    setEditingProjectId(null);
    setProjectArticles([]);
    setNewProjectAuthors(currentUser ? [{ id_user: currentUser.id_user, name_user: currentUser.name_user, image_user: currentUser.image_user }] : []);
    setSelectedProjectAuthorToAdd('');
    setNewProjectData({
      title_project: '',
      description_project: '',
      type_project: '',
      format_project: '',
      status_project: 'draft'
    });
    setProjectCoverFile(null);
    setProjectCoverPreview(null);
  };

  const openEditProjectModal = (project) => {
    if (!project) return;
    setEditingProjectId(project.id_project);
    setNewProjectData({
      title_project: project.title_project || '',
      description_project: project.description_project || '',
      type_project: project.type_project || '',
      format_project: project.format_project || '',
      status_project: project.status_project || 'draft'
    });
    const authors = (project.authors && project.authors.length > 0)
      ? project.authors.map(a => ({ id_user: a.id_user, name_user: a.name_user, image_user: a.image_user }))
      : (currentUser ? [{ id_user: currentUser.id_user, name_user: currentUser.name_user, image_user: currentUser.image_user }] : []);
    setNewProjectAuthors(authors);
    setSelectedProjectAuthorToAdd('');
    setProjectCoverFile(null);
    // Show the existing cover (if any) as the initial preview.
    if (project.cover_image_project) {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
      const c = project.cover_image_project;
      setProjectCoverPreview(
        c.startsWith('http') ? c : c.startsWith('/') ? `${apiUrl}${c}` : `${apiUrl}/${c}`
      );
    } else {
      setProjectCoverPreview(null);
    }
    fetchProjectArticles(project.id_project);
    setShowProjectModal(true);
  };

  // Load the articles/comics that belong to a project so they can be opened for
  // editing (their panels live in the article, not in the project).
  const fetchProjectArticles = async (projectId) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
      const response = await axios.get(`${apiUrl}/magazine-article`, {
        params: { project_id: projectId, status: 'all' },
        headers: { 'x-user-id': currentUser?.id_user }
      });
      setProjectArticles(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching project articles:', error);
      setProjectArticles([]);
    }
  };

  // Jump from the project modal into editing one of its articles (loads its
  // blocks/panels in the article creator's edit mode).
  const handleEditProjectArticle = (article) => {
    resetProjectModal();
    handleEdit(article);
  };

  // Save progress without submitting: persists (or updates) the project as a
  // draft and keeps the modal open so the author can keep working.
  const handleSaveProjectDraft = async () => {
    if (!newProjectData.title_project.trim()) {
      showError(t('editor.project.titleRequired'));
      return;
    }
    try {
      // No status override: a new project is created as a draft; an existing one
      // keeps whatever status it already had (draft/pending/published).
      const id = await persistProject();
      await fetchProjects();
      if (id) setFormData(prev => ({ ...prev, project_id: id }));
      showSuccess(t('editor.project.draftSaved'));
    } catch (error) {
      console.error('Error saving project draft:', error);
      showError(error.response?.data?.error || t('messages.error.createProject'));
    }
  };

  // Final action: super admins publish directly; everyone else submits the
  // saved draft for super-admin review.
  const handleSubmitProject = async () => {
    if (!newProjectData.title_project.trim()) {
      showError(t('editor.project.titleRequired'));
      return;
    }
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
      const authHeader = { headers: { 'x-user-id': currentUser?.id_user } };
      // Super admins publish now; everyone else persists (new = draft) then submits.
      const id = await persistProject(canPublishDirectly ? 'published' : undefined);
      if (!id) throw new Error('No project id returned');

      if (!canPublishDirectly) {
        await axios.post(`${apiUrl}/magazine-project/submit-for-approval/${id}`, {}, authHeader);
        showSuccess(t('editor.project.submittedForReview'));
      } else {
        showSuccess(t('messages.success.projectCreated'));
      }

      await fetchProjects();
      setFormData(prev => ({ ...prev, project_id: id }));
      resetProjectModal();
    } catch (error) {
      console.error('Error submitting project:', error);
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
      await axios.delete(`${apiUrl}/magazine-project/remove-by-id/${project.id_project}`, {
        headers: { 'x-user-id': currentUser?.id_user }
      });
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

  const loadArticleBlocks = async (article_id, category) => {
    const result = await fetchBlocksByArticleId(article_id);
    if (result.success) {
      const fetchedBlocks = result.data || [];
      setBlocks(fetchedBlocks);
      // Detect content type from the actual blocks + category. Micro-perfil is
      // driven by the category since it stores a plain image block.
      setArticleContentType(detectContentType(fetchedBlocks, category ?? formData.category_article));
    }
  };

  // After a save, take the saved blocks (now with ids, so the next save updates
  // instead of duplicating) without re-detecting the content type — a comic
  // saved before its first panel must stay a comic. Unsaved (empty) blocks are
  // kept at the end so nothing the author added disappears.
  const reloadSavedBlocks = async (article_id) => {
    const result = await fetchBlocksByArticleId(article_id);
    if (!result.success) return;
    const fetched = result.data || [];
    setBlocks(prev => {
      const pending = prev.filter(b => !isBlockComplete(b));
      if (articleContentType === 'microperfil' && !fetched.some(b => b.block_type === 'image')) return prev;
      return [...fetched, ...pending];
    });
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

  // Switch to the micro-perfil format: force the category (so it publishes to
  // the micro-perfiles section) and keep a single image block to edit.
  const selectMicroPerfil = () => {
    setArticleContentType('microperfil');
    setFormData(prev => ({ ...prev, category_article: 'micro-perfiles' }));
    setBlocks(prev => {
      const existingImage = prev.find(b => b.block_type === 'image');
      if (existingImage) return [existingImage];
      return [{
        tempId: `mp_${Date.now()}`,
        block_type: 'image',
        block_order: 0,
        image_url: '',
        image_caption: '',
        is_interactive: false,
        interaction_type: null,
        interaction_data: null,
      }];
    });
  };

  // When leaving the micro-perfil format, drop the forced category.
  const clearMicroPerfilCategory = () => {
    setFormData(prev => prev.category_article === 'micro-perfiles' ? { ...prev, category_article: 'general' } : prev);
  };

  const handleCoverImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // The cover must be an image. accept="image/*" is not enforced on some
      // (esp. mobile) file pickers, so validate here too — otherwise a video
      // slips through and the server rejects it with a confusing 400.
      if (!file.type.startsWith('image/')) {
        showError(t('editor.coverImage.mustBeImage'));
        e.target.value = '';
        return;
      }

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

  // ---------------------------------------------------------------------
  // Step-by-step creator
  // ---------------------------------------------------------------------

  // What still blocks a step: the field at fault and why (null when it's
  // complete). Steps 1–3 gate the "Next" button; content is only required to
  // publish.
  const stepProblem = (n) => {
    const problem = (field, message) => ({ field, message });
    if (n === 1) {
      if (projectMode === 'new') {
        return wizardProject.title_project.trim() ? null
          : problem('project_title', t('editor.wizard.need.projectTitle', 'Ponle un título al nuevo proyecto'));
      }
      if (projectMode === 'existing') {
        return formData.project_id ? null
          : problem('project_id', t('editor.wizard.need.projectPick', 'Elige un proyecto'));
      }
      return editingArticle ? null
        : problem('project_mode', t('editor.wizard.need.projectMode', 'Elige si la publicación va en un proyecto nuevo o en uno existente'));
    }
    if (n === 2) {
      if (projectMode === 'new' && !wizardProject.type_project) {
        return problem('project_type', t('editor.wizard.need.projectType', 'Elige el tipo del proyecto'));
      }
      if (!editingArticle && (!formData.category_article || formData.category_article === 'general')) {
        return problem('category_article', t('editor.wizard.need.category', 'Elige la categoría de la publicación'));
      }
      if (formData.authors.length === 0) {
        return problem('authors', t('editor.wizard.need.authors', 'Añade al menos una autora o autor'));
      }
      return null;
    }
    if (n === 3) {
      if (!formData.title_article.trim()) return problem('title_article', t('editor.wizard.need.title', 'Escribe un título'));
      if (formData.title_article.length > 200) {
        return problem('title_article', t('editor.wizard.need.titleLong', { count: formData.title_article.length, defaultValue: 'El título es demasiado largo ({{count}}/200 caracteres)' }));
      }
      if (formData.excerpt_article && formData.excerpt_article.length > 500) {
        return problem('excerpt_article', t('editor.wizard.need.excerptLong', { count: formData.excerpt_article.length, defaultValue: 'El extracto es demasiado largo ({{count}}/500 caracteres)' }));
      }
      return null;
    }
    return null;
  };
  const stepIssue = (n) => stepProblem(n)?.message || null;

  // The element to focus for each field with a problem.
  const FIELD_IDS = {
    project_mode: 'pub-choice-new',
    project_title: 'pub-project-title',
    project_id: 'pub-project',
    project_type: 'pub-project-type',
    category_article: 'pub-category',
    authors: 'pub-add-author',
    title_article: 'title',
    excerpt_article: 'excerpt'
  };

  // Mark the field at fault in red (with its message under it), show the error
  // card, go to its step and put the cursor on it.
  const flagProblem = (field, message, n) => {
    setFieldErrors({ [field]: message });
    showError(message);
    setStep(n);
    setTimeout(() => {
      const el = document.getElementById(FIELD_IDS[field]);
      if (el) el.focus({ preventScroll: false });
    }, 350);
  };

  // A field stops being marked as soon as the author touches it.
  const clearFieldError = (field) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // What the content still needs before it can be published (null = ready).
  const contentIssue = () => {
    if (!blocks.some(isBlockComplete)) {
      return articleContentType === 'cómic'
        ? t('editor.validation.addComicPanel')
        : articleContentType === 'microperfil'
        ? t('editor.microperfil.needImage')
        : t('editor.validation.addContentBlock');
    }
    if (articleContentType === 'microperfil') {
      const caption = (blocks[0]?.image_caption || '').trim();
      if (!caption) return t('editor.microperfil.needCaption');
      if (caption.length > 700) return t('editor.microperfil.captionTooLong', { count: caption.length });
    }
    return null;
  };

  const goNext = () => {
    const problem = stepProblem(step);
    if (problem) {
      flagProblem(problem.field, problem.message, step);
      return;
    }
    setFieldErrors({});
    setStep(prev => Math.min(TOTAL_STEPS, prev + 1));
  };

  const goPrev = () => setStep(prev => Math.max(1, prev - 1));

  // A step can be opened from the progress bar once the earlier gated steps are
  // complete (any step while editing a saved publication).
  const canVisitStep = (n) => !!editingArticle || [1, 2, 3].filter(k => k < n).every(k => !stepIssue(k));

  // Step 4: changing the content type clears content that isn't of that type.
  const chooseContentType = (type) => {
    clearFieldError('content');
    if (type === articleContentType) return;
    if (blocks.some(isBlockComplete) && !confirm(t('editor.wizard.confirmTypeChange', 'Cambiar el tipo de contenido borrará el contenido que ya has añadido. ¿Continuar?'))) {
      return;
    }
    if (type === 'microperfil') {
      setBlocks([]);
      selectMicroPerfil();
      return;
    }
    setArticleContentType(type);
    setBlocks([]);
    clearMicroPerfilCategory();
  };

  const handleWizardProjectCoverChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        showError(t('editor.coverImage.mustBeImage'));
        e.target.value = '';
        return;
      }
      setWizardProjectCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setWizardProjectCoverPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const clearWizardProject = () => {
    setWizardProject(EMPTY_WIZARD_PROJECT);
    setWizardProjectCoverFile(null);
    setWizardProjectCoverPreview(null);
  };

  // Create the new project set up in steps 1–2 (its authors are the
  // publication's). Returns its id.
  const createWizardProject = async (status) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
    const authHeader = { headers: { 'x-user-id': currentUser?.id_user } };
    const authorIds = formData.authors.length ? formData.authors : [currentUser.id_user];
    const primary = getAuthorDetails(authorIds[0]) || currentUser;
    const payload = {
      title_project: wizardProject.title_project.trim(),
      description_project: wizardProject.description_project,
      type_project: wizardProject.type_project,
      format_project: wizardProject.format_project,
      status_project: status,
      author_id: authorIds[0],
      author_name: primary?.name_user || currentUser.name_user,
      authors: authorIds.map((id, index) => ({ user_id: id, author_order: index }))
    };
    const response = await axios.post(`${apiUrl}/magazine-project/create`, payload, authHeader);
    const id = response.data?.data?.id_project;
    if (!id) throw new Error(response.data?.error || 'No project id returned');
    if (wizardProjectCoverFile) {
      const fd = new FormData();
      fd.append('image', wizardProjectCoverFile);
      await axios.post(`${apiUrl}/magazine-project/upload-cover-image`, fd, {
        headers: { 'Content-Type': 'multipart/form-data', 'x-user-id': currentUser?.id_user, 'x-project-id': id }
      });
    }
    return id;
  };

  // Save the publication.
  //   'draft'   — save as a draft (every new publication stays a draft until published)
  //   'publish' — super admins publish; everyone else submits it for review
  //   'update'  — save changes to a published / in-review publication, keeping its status
  const saveArticle = async (intent) => {
    // A new publication needs its project (step 1) and a title (step 3) even as
    // a draft; publishing needs every step complete plus some content.
    const required = intent === 'draft' ? [1, 3] : [1, 2, 3];
    for (const n of required) {
      const problem = stepProblem(n);
      if (problem) {
        flagProblem(problem.field, problem.message, n);
        return;
      }
    }
    if (intent !== 'draft') {
      const issue = contentIssue();
      if (issue) {
        flagProblem('content', issue, 5);
        return;
      }
    }
    setFieldErrors({});
    setSaving(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
      const authHeader = { headers: { 'x-user-id': currentUser?.id_user } };
      const publishNow = intent === 'publish' && canPublishDirectly;
      const submitForReview = intent === 'publish' && !canPublishDirectly;

      // New project: create it first (published along with the publication by
      // a super admin; otherwise a draft, submitted for review with it).
      let projectId = formData.project_id || null;
      let createdProjectId = null;
      if (projectMode === 'new') {
        createdProjectId = await createWizardProject(publishNow ? 'published' : 'draft');
        projectId = createdProjectId;
        setFormData(prev => ({ ...prev, project_id: createdProjectId }));
        setProjectMode('existing');
        clearWizardProject();
        fetchProjects();
      }

      const currentStatus = editingArticle?.status_article || 'draft';
      const targetStatus = publishNow ? 'published' : intent === 'update' ? currentStatus : 'draft';
      const articleData = {
        ...formData,
        author_id: currentUser.id_user,
        authors: formData.authors,
        project_id: projectId,
        status_article: targetStatus,
        content_article: 'Block-based content' // Placeholder for backward compatibility
      };
      // If the author removed the cover (no new file and no preview left), clear
      // it on save. Otherwise leave it untouched (a new file is uploaded below).
      if (!coverImageFile && !coverImagePreview) {
        articleData.cover_image_article = null;
      }

      const articleResult = editingArticle
        ? await updateArticle(editingArticle.id_article, articleData)
        : await createArticle(articleData);
      if (articleResult.error) {
        showError(articleResult.error);
        return;
      }
      const article_id = articleResult.data.id_article;

      if (coverImageFile) {
        const uploadResult = await uploadCoverImage(article_id, coverImageFile);
        if (uploadResult.error) showError(uploadResult.error);
        else setCoverImageFile(null);
      }

      const { failedCount = 0 } = await saveBlocks(article_id, !!editingArticle) || {};
      if (failedCount > 0) {
        // Some blocks didn't persist — warn instead of a misleading success.
        showError(t('editor.blocks.saveFailed', { count: failedCount }));
      }

      if (submitForReview) {
        // Shows its own success / error message.
        await submitForApproval(article_id);
        if (createdProjectId) {
          try {
            await axios.post(`${apiUrl}/magazine-project/submit-for-approval/${createdProjectId}`, {}, authHeader);
          } catch (error) {
            console.error('Error submitting the new project for review:', error);
          }
        }
      } else if (failedCount === 0) {
        showSuccess(
          intent === 'draft'
            ? t('editor.wizard.draftSaved', 'Borrador guardado')
            : publishNow
            ? (editingArticle ? t('messages.success.articleUpdated') : t('messages.success.articleCreated'))
            : t('messages.success.articleUpdated')
        );
      }
      await Promise.all([fetchArticles(), fetchEditorArticles()]);

      if (intent === 'publish') {
        // Done: back to the author's list, where the new status shows.
        resetForm();
        setView('mine');
      } else {
        // Keep working on the saved publication: further saves update it.
        setEditingArticle(prev => ({ ...(prev || {}), ...articleResult.data, status_article: targetStatus }));
        await reloadSavedBlocks(article_id);
      }
    } catch (err) {
      showError(err.response?.data?.error || t('messages.error.saveArticle'));
      console.error('Submit error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Take a published / in-review publication back to draft.
  const handleRevertToDraft = async (article) => {
    const confirmed = confirm(t('editor.mine.confirmRevert', {
      title: article.title_article,
      defaultValue: '¿Pasar «{{title}}» a borrador? Dejará de estar visible hasta que la vuelvas a publicar.'
    }));
    if (!confirmed) return;
    const result = await revertToDraft(article.id_article);
    if (!result.error && editingArticle?.id_article === article.id_article) {
      setEditingArticle(prev => ({ ...prev, status_article: 'draft' }));
      setFormData(prev => ({ ...prev, status_article: 'draft' }));
    }
  };

  // Unsaved work that closing / starting over would lose (a never-saved
  // publication with something in it).
  const hasUnsavedNewWork = () => !editingArticle && (
    !!formData.title_article.trim() || blocks.some(isBlockComplete) || !!wizardProject.title_project.trim() || !!coverImageFile
  );

  const handleClose = () => {
    if (hasUnsavedNewWork() && !confirm(t('editor.wizard.confirmClose', 'Tienes cambios sin guardar. ¿Cerrar el editor igualmente?'))) {
      return;
    }
    resetForm();
    if (editorReturnTo === 'articlesList') navigateToArticlesList();
    else navigateToHome();
  };

  // "Nueva publicación" from "Mis publicaciones".
  const startNewPublication = () => {
    if (hasUnsavedNewWork() && !confirm(t('editor.mine.confirmDiscard', 'Tienes una publicación sin guardar. ¿Descartarla?'))) {
      return;
    }
    resetForm();
    setView('wizard');
  };

  // "Editar" from "Mis publicaciones".
  const openPublicationForEdit = (article) => {
    if (hasUnsavedNewWork() && !confirm(t('editor.mine.confirmDiscard', 'Tienes una publicación sin guardar. ¿Descartarla?'))) {
      return;
    }
    handleEdit(article);
  };

  const saveBlocks = async (article_id, isExistingArticle = !!editingArticle) => {
    // Delete removed blocks (if editing)
    if (isExistingArticle) {
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
    let failedCount = 0;
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

      const blockResult = block.id_block
        ? await updateBlock(block.id_block, blockData)
        : await createBlock(blockData);
      if (blockResult?.error) failedCount++;
    }

    // Report so a partial failure isn't hidden behind a "saved" toast — the
    // author needs to know their content (text, panels, etc.) didn't persist.
    return { failedCount };
  };

  const handleDelete = async (id_article) => {
    if (!confirm(t('editor.confirmDeleteArticle'))) {
      return;
    }

    const result = await deleteArticle(id_article);
    if (!result.error) {
      showSuccess(t('messages.success.articleDeleted'));
      if (editingArticle?.id_article === id_article) resetForm();
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
    // Load the existing cover into the preview so it shows AND isn't wiped on
    // save (save clears the cover when there's no preview and no new file).
    setCoverImageFile(null);
    if (article.cover_image_article) {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
      const c = article.cover_image_article;
      setCoverImagePreview(c.startsWith('http') ? c : c.startsWith('/') ? `${apiUrl}${c}` : `${apiUrl}/${c}`);
    } else {
      setCoverImagePreview(null);
    }
    loadArticleBlocks(article.id_article, article.category_article);
    setProjectMode(article.project_id ? 'existing' : null);
    clearWizardProject();
    setFieldErrors({});
    setView('wizard');
    setStep(1);
  };

  // Open the saved draft in a new tab (renders images + comic panels/audio like
  // the public view). Save first to see the latest changes.
  const handlePreviewDraft = () => {
    if (!editingArticle?.id_article) return;
    window.open(`${window.location.origin}/?article=${editingArticle.id_article}&preview=1`, '_blank', 'noopener,noreferrer');
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
    setProjectMode(null);
    clearWizardProject();
    setStep(1);
  };

  const handleAddAuthor = (rawId) => {
    const authorId = parseInt(rawId);
    if (!authorId) return;
    if (formData.authors.includes(authorId)) {
      showError(t('editor.author.alreadyAdded'));
      return;
    }
    // Functional update avoids stale-state loss when adding several in a row.
    setFormData(prev => ({ ...prev, authors: [...prev.authors, authorId] }));
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

  // Google-auth users store a full avatar URL in image_user; local uploads store
  // a filename served by the API. Resolve both so the thumbnail never breaks.
  const resolveUserImage = (img) => {
    if (!img) return null;
    if (img.startsWith('http://') || img.startsWith('https://')) return img;
    return `${import.meta.env.VITE_API_URL}/user/image/${img}`;
  };

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

  const STEPS = [
    { n: 1, short: t('editor.wizard.step.project', 'Proyecto'), long: t('editor.wizard.step.projectLong', 'Elige el proyecto') },
    { n: 2, short: t('editor.wizard.step.classification', 'Clasificación'), long: t('editor.wizard.step.classificationLong', 'Clasificación y autoras/es') },
    { n: 3, short: t('editor.wizard.step.basics', 'Portada y título'), long: t('editor.wizard.step.basicsLong', 'Portada, título y extracto') },
    { n: 4, short: t('editor.wizard.step.type', 'Tipo'), long: t('editor.wizard.step.typeLong', 'Tipo de contenido') },
    { n: 5, short: t('editor.wizard.step.content', 'Contenido'), long: t('editor.wizard.step.contentLong', 'Contenido') },
    { n: 6, short: t('editor.wizard.step.review', 'Publicar'), long: t('editor.wizard.step.reviewLong', 'Revisar y publicar') }
  ];
  const CONTENT_TYPES = [
    { key: 'regular', Icon: FileText, title: t('editor.contentType.regular'), desc: t('editor.wizard.type.regularDesc', 'Texto, imágenes y vídeos organizados en bloques.') },
    { key: 'cómic', Icon: Layers, title: t('editor.contentType.comic'), desc: t('editor.wizard.type.comicDesc', 'Viñetas que se leen en horizontal, con audio y paneles interactivos.') },
    { key: 'microperfil', Icon: User, title: t('editor.contentType.microperfil'), desc: t('editor.wizard.type.microperfilDesc', 'Una imagen con su texto y audio opcional. Se publica en Micro-perfiles.') }
  ];

  const status = editingArticle?.status_article || 'draft';
  const statusLabel = (s) => (
    s === 'published' ? t('editor.status.published')
      : s === 'pending_approval' ? t('editor.review.statusShort')
      : t('editor.status.draft')
  );
  const selectedProject = projects.find(p => p.id_project === parseInt(formData.project_id));
  // A project can be managed (edited/deleted) by a super admin or by one of its
  // authors.
  const canManageProject = !!selectedProject && (
    isSuperAdmin
    || selectedProject.author_id === currentUser?.id_user
    || selectedProject.authors?.some(a => a.id_user === currentUser?.id_user)
  );
  const categoryLabel = (() => {
    const found = CATEGORIES.find(([value]) => value === formData.category_article);
    return found ? t(found[1]) : t('editor.category.general');
  })();
  const publishIssues = [1, 2, 3].map(stepIssue).filter(Boolean);
  const pendingContent = contentIssue();
  if (pendingContent) publishIssues.push(pendingContent);
  const completeBlocks = blocks.filter(isBlockComplete).length;
  const saveIntent = status === 'draft' ? 'draft' : 'update';

  // ---- Step 1: project ---------------------------------------------------
  const stepProject = (
    <>
      <p className="pub-step-hint">
        {t('editor.wizard.projectHint', 'Cada publicación forma parte de un proyecto. Crea uno nuevo o añádela a uno que ya exista.')}
      </p>
      <div className={`pub-choice-grid ${fieldErrors.project_mode ? 'has-error' : ''}`}>
        <button
          type="button"
          id="pub-choice-new"
          className={`pub-choice ${projectMode === 'new' ? 'is-selected' : ''}`}
          onClick={() => { setProjectMode('new'); clearFieldError('project_mode'); }}
          aria-pressed={projectMode === 'new'}
        >
          <FolderPlus size={28} />
          <span className="pub-choice__title">{t('editor.wizard.newProject', 'Nuevo proyecto')}</span>
          <span className="pub-choice__desc">{t('editor.wizard.newProjectDesc', 'Crea un proyecto que contenga esta publicación.')}</span>
        </button>
        <button
          type="button"
          className={`pub-choice ${projectMode === 'existing' ? 'is-selected' : ''}`}
          onClick={() => { setProjectMode('existing'); clearFieldError('project_mode'); }}
          aria-pressed={projectMode === 'existing'}
        >
          <FolderOpen size={28} />
          <span className="pub-choice__title">{t('editor.wizard.existingProject', 'Proyecto existente')}</span>
          <span className="pub-choice__desc">{t('editor.wizard.existingProjectDesc', 'Añade la publicación a un proyecto que ya existe.')}</span>
        </button>
      </div>
      {fieldErrors.project_mode && <span className="field-error-msg" role="alert">{fieldErrors.project_mode}</span>}

      {projectMode === 'existing' && (
        <div className="form-group pub-field">
          <label htmlFor="pub-project">{t('editor.project.label')}</label>
          <div className="project-selector-row">
            <select
              id="pub-project"
              name="project_id"
              value={formData.project_id}
              onChange={handleInputChange}
              className={`${!formData.project_id ? 'select-placeholder' : ''} ${fieldErrors.project_id ? 'input-error' : ''}`}
              aria-invalid={!!fieldErrors.project_id}
            >
              <option value="">{t('editor.wizard.pickProject', 'Elige un proyecto…')}</option>
              {projects.map(project => {
                const statusTag = project.status_project === 'draft'
                  ? ` · ${t('editor.status.draft')}`
                  : project.status_project === 'pending_approval'
                  ? ` · ${t('editor.review.statusShort')}`
                  : '';
                return (
                  <option key={project.id_project} value={project.id_project}>
                    {project.title_project}{statusTag}
                  </option>
                );
              })}
            </select>
            {canManageProject && (
              <>
                <button
                  type="button"
                  className="btn-edit-project"
                  onClick={() => openEditProjectModal(selectedProject)}
                  title={t('editor.project.editTitle')}
                >
                  <Edit size={15} />
                </button>
                <button
                  type="button"
                  className="btn-delete-project"
                  onClick={handleDeleteProject}
                  title={t('editor.project.deleteTitle')}
                >
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </div>
          {fieldErrors.project_id && <span className="field-error-msg" role="alert">{fieldErrors.project_id}</span>}
          {selectedProject?.description_project && (
            <p className="pub-project-desc">{selectedProject.description_project}</p>
          )}
        </div>
      )}

      {projectMode === 'new' && (
        <div className="pub-new-project">
          <div className="form-group">
            <label htmlFor="pub-project-title">{t('editor.project.titleLabel')}</label>
            <input
              type="text"
              id="pub-project-title"
              value={wizardProject.title_project}
              onChange={(e) => { setWizardProject(prev => ({ ...prev, title_project: e.target.value })); clearFieldError('project_title'); }}
              placeholder={t('editor.project.titlePlaceholder')}
              className={fieldErrors.project_title ? 'input-error' : ''}
              aria-invalid={!!fieldErrors.project_title}
            />
            {fieldErrors.project_title && <span className="field-error-msg" role="alert">{fieldErrors.project_title}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="pub-project-description">{t('editor.project.descriptionLabel')}</label>
            <textarea
              id="pub-project-description"
              rows="3"
              value={wizardProject.description_project}
              onChange={(e) => setWizardProject(prev => ({ ...prev, description_project: e.target.value }))}
              placeholder={t('editor.project.descriptionPlaceholder')}
            />
          </div>
          <div className="form-group cover-image-group">
            <label>{t('editor.project.coverLabel')}</label>
            <div className="cover-image-upload">
              {wizardProjectCoverPreview ? (
                <div className="cover-image-preview">
                  <img src={wizardProjectCoverPreview} alt={t('editor.coverImage.preview')} />
                  <button
                    type="button"
                    className="btn-remove-preview"
                    onClick={() => { setWizardProjectCoverFile(null); setWizardProjectCoverPreview(null); }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="file"
                    id="wizard_project_cover"
                    accept="image/*"
                    onChange={handleWizardProjectCoverChange}
                    className="cover-image-input"
                  />
                  <label htmlFor="wizard_project_cover" className="cover-image-label">
                    <Plus size={24} />
                    <span>{t('editor.coverImage.select')}</span>
                  </label>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {editingArticle && !projectMode && (
        <p className="pub-step-note">{t('editor.wizard.noProjectNote', 'Esta publicación no pertenece a ningún proyecto.')}</p>
      )}
    </>
  );

  // ---- Step 2: classification + authors ----------------------------------
  const stepClassification = (
    <>
      {projectMode === 'new' && (
        <fieldset className="pub-fieldset">
          <legend>{t('editor.wizard.projectClassification', 'Clasificación del proyecto')}</legend>
          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="pub-project-type">{t('editor.project.typeLabel')}</label>
              <select
                id="pub-project-type"
                value={wizardProject.type_project}
                onChange={(e) => { setWizardProject(prev => ({ ...prev, type_project: e.target.value })); clearFieldError('project_type'); }}
                className={`${!wizardProject.type_project ? 'select-placeholder' : ''} ${fieldErrors.project_type ? 'input-error' : ''}`}
                aria-invalid={!!fieldErrors.project_type}
              >
                <option value="">{t('editor.project.selectType')}</option>
                {PROJECT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              {fieldErrors.project_type && <span className="field-error-msg" role="alert">{fieldErrors.project_type}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="pub-project-format">{t('editor.project.formatLabel')}</label>
              <select
                id="pub-project-format"
                value={wizardProject.format_project}
                onChange={(e) => {
                  const format = e.target.value;
                  setWizardProject(prev => ({ ...prev, format_project: format }));
                  // A comic project suggests the comic content type (step 4).
                  if (format === 'cómic' && !blocks.some(isBlockComplete)) setArticleContentType('cómic');
                }}
                className={!wizardProject.format_project ? 'select-placeholder' : ''}
              >
                <option value="">{t('editor.project.selectFormat')}</option>
                {PROJECT_FORMATS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          </div>
        </fieldset>
      )}

      <fieldset className="pub-fieldset">
        <legend>{t('editor.wizard.publicationCategory', 'Categoría de la publicación')}</legend>
        <div className="form-group">
          <select
            id="pub-category"
            name="category_article"
            value={formData.category_article}
            onChange={handleInputChange}
            disabled={articleContentType === 'microperfil'}
            title={articleContentType === 'microperfil' ? t('editor.microperfil.categoryLocked') : undefined}
            className={`${formData.category_article === 'general' ? 'select-placeholder' : ''} ${fieldErrors.category_article ? 'input-error' : ''}`}
            aria-label={t('editor.wizard.publicationCategory', 'Categoría de la publicación')}
            aria-invalid={!!fieldErrors.category_article}
          >
            <option value="general">{editingArticle ? t('editor.category.general') : t('editor.wizard.pickCategory', 'Elige una categoría…')}</option>
            {CATEGORIES.map(([value, key]) => <option key={value} value={value}>{t(key)}</option>)}
          </select>
          {fieldErrors.category_article && <span className="field-error-msg" role="alert">{fieldErrors.category_article}</span>}
        </div>
      </fieldset>

      <fieldset className={`pub-fieldset ${fieldErrors.authors ? 'has-error' : ''}`}>
        <legend>{t('editor.authors.label')}</legend>
        <p className="pub-step-hint">
          {t('editor.wizard.authorsHint', '¿Quieres añadir colaboradoras/es? La primera persona de la lista figura como autora principal.')}
        </p>
        <div className="authors-list-compact">
          {formData.authors.map((authorId, index) => {
            const author = getAuthorDetails(authorId);
            return (
              <div key={authorId} className="author-item-compact">
                <span className="author-order">{index + 1}.</span>
                {author?.image_user
                  ? <img src={resolveUserImage(author.image_user)} alt={author.name_user} className="author-avatar-tiny" />
                  : <User className="author-icon-placeholder" size={14} />}
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
            id="pub-add-author"
            className="author-selector-compact"
            value=""
            onChange={(e) => { if (e.target.value) { handleAddAuthor(e.target.value); clearFieldError('authors'); } }}
            aria-label={t('editor.author.add')}
          >
            <option value="">{t('editor.author.add')}</option>
            {editors.filter(e => !formData.authors.includes(e.id_user)).map(editor => (
              <option key={editor.id_user} value={editor.id_user}>{editor.name_user}</option>
            ))}
          </select>
        </div>
        {fieldErrors.authors && <span className="field-error-msg" role="alert">{fieldErrors.authors}</span>}
      </fieldset>
    </>
  );

  // ---- Step 3: cover, title, excerpt -------------------------------------
  const stepBasics = (
    <>
      <div className="form-group full-width cover-image-group">
        <label>{t('editor.wizard.coverLabel', 'Imagen de portada')}</label>
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
                  // The file <input> is only mounted when there's no preview,
                  // so it may not exist here — guard against a null crash.
                  const coverInput = document.getElementById('cover');
                  if (coverInput) coverInput.value = '';
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

      <div className="form-group full-width">
        <label htmlFor="title">{t('editor.wizard.titleLabel', 'Título *')}</label>
        <input
          type="text"
          id="title"
          name="title_article"
          value={formData.title_article}
          onChange={handleInputChange}
          placeholder={t('editor.title.placeholder')}
          className={fieldErrors.title_article ? 'input-error' : ''}
          aria-invalid={!!fieldErrors.title_article}
        />
        {fieldErrors.title_article && <span className="field-error-msg" role="alert">{fieldErrors.title_article}</span>}
      </div>

      <div className="form-group full-width">
        <label htmlFor="excerpt">{t('editor.wizard.excerptLabel', 'Extracto')}</label>
        <textarea
          id="excerpt"
          name="excerpt_article"
          value={formData.excerpt_article}
          onChange={handleInputChange}
          rows="3"
          placeholder={t('editor.excerpt.placeholder')}
          className={fieldErrors.excerpt_article ? 'input-error' : ''}
          aria-invalid={!!fieldErrors.excerpt_article}
        />
        {fieldErrors.excerpt_article && <span className="field-error-msg" role="alert">{fieldErrors.excerpt_article}</span>}
      </div>
    </>
  );

  // ---- Step 4: content type ----------------------------------------------
  const stepType = (
    <>
      <p className="pub-step-hint">{t('editor.wizard.typeHint', 'Elige cómo se va a leer tu publicación.')}</p>
      <div className="pub-choice-grid pub-choice-grid--3">
        {CONTENT_TYPES.map(({ key, Icon, title, desc }) => (
          <button
            key={key}
            type="button"
            className={`pub-choice ${articleContentType === key ? 'is-selected' : ''}`}
            onClick={() => chooseContentType(key)}
            aria-pressed={articleContentType === key}
          >
            <Icon size={28} />
            <span className="pub-choice__title">{title}</span>
            <span className="pub-choice__desc">{desc}</span>
          </button>
        ))}
      </div>
    </>
  );

  // ---- Step 5: content ---------------------------------------------------
  const stepContent = (
    <>
      <p className="pub-step-hint">
        {CONTENT_TYPES.find(c => c.key === articleContentType)?.title}
        {' · '}
        <button type="button" className="pub-link" onClick={() => setStep(4)}>
          {t('editor.wizard.changeType', 'Cambiar tipo')}
        </button>
      </p>
      {fieldErrors.content && <span className="field-error-msg" role="alert">{fieldErrors.content}</span>}
      <div className={`form-group full-width pub-content ${fieldErrors.content ? 'has-error' : ''}`}>
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
        ) : articleContentType === 'microperfil' ? (
          // Dedicated micro-perfil UI (single image + caption + optional audio)
          <MicroPerfilEditor
            block={blocks[0]}
            onChange={(newBlock) => setBlocks([newBlock])}
            onUploadImage={uploadBlockImage}
            onUploadAudio={uploadPanelAudio}
          />
        ) : (
          // Regular Block Editor for non-comic articles
          <>
            <div className="blocks-container">
              {blocks.map((block) => (
                <div key={block.id_block || block.tempId} className="block-wrapper">
                  {block.block_type === 'text' && (
                    <TextBlock block={block} onUpdate={handleBlockUpdate} onDelete={handleBlockDelete} isEditing={true} />
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
                    <IframeBlock block={block} onUpdate={handleBlockUpdate} onDelete={handleBlockDelete} isEditing={true} />
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
    </>
  );

  // ---- Step 6: review + publish ------------------------------------------
  const reviewProjectName = projectMode === 'new'
    ? t('editor.wizard.review.newProject', { title: wizardProject.title_project || '—', defaultValue: '{{title}} (nuevo)' })
    : selectedProject?.title_project || t('editor.project.noProject');
  const reviewContent = articleContentType === 'cómic'
    ? t('editor.wizard.review.panels', { count: completeBlocks, defaultValue: 'Viñetas: {{count}}' })
    : articleContentType === 'microperfil'
    ? (completeBlocks ? t('editor.wizard.review.microperfil', 'Imagen con texto') : '—')
    : t('editor.wizard.review.blocks', { count: completeBlocks, defaultValue: 'Bloques: {{count}}' });
  const publishLabel = canPublishDirectly
    ? t('editor.wizard.publish', 'Publicar')
    : t('editor.wizard.submitReview', 'Enviar a revisión');

  const stepReview = (
    <div className="pub-review">
      <dl className="pub-review__list">
        <dt>{t('editor.wizard.step.project', 'Proyecto')}</dt>
        <dd>
          {reviewProjectName}
          <button type="button" className="pub-link" onClick={() => setStep(1)}>{t('editor.wizard.review.change', 'Cambiar')}</button>
        </dd>
        <dt>{t('editor.category.label')}</dt>
        <dd>
          {categoryLabel}
          <button type="button" className="pub-link" onClick={() => setStep(2)}>{t('editor.wizard.review.change', 'Cambiar')}</button>
        </dd>
        <dt>{t('editor.authors.label')}</dt>
        <dd>{formData.authors.map(id => getAuthorDetails(id)?.name_user).filter(Boolean).join(', ') || '—'}</dd>
        <dt>{t('editor.wizard.titleLabel', 'Título *').replace(' *', '')}</dt>
        <dd>
          {formData.title_article || '—'}
          <button type="button" className="pub-link" onClick={() => setStep(3)}>{t('editor.wizard.review.change', 'Cambiar')}</button>
        </dd>
        <dt>{t('editor.wizard.coverLabel', 'Imagen de portada')}</dt>
        <dd>
          {coverImagePreview
            ? <img src={coverImagePreview} alt="" className="pub-review__cover" />
            : t('editor.wizard.review.noCover', 'Sin portada')}
        </dd>
        <dt>{t('editor.wizard.step.typeLong', 'Tipo de contenido')}</dt>
        <dd>{CONTENT_TYPES.find(c => c.key === articleContentType)?.title}</dd>
        <dt>{t('editor.wizard.step.content', 'Contenido')}</dt>
        <dd>
          {reviewContent}
          <button type="button" className="pub-link" onClick={() => setStep(5)}>{t('editor.wizard.review.change', 'Cambiar')}</button>
        </dd>
        <dt>{t('editor.status.label')}</dt>
        <dd><span className={`status status-${status}`}>{statusLabel(status)}</span></dd>
      </dl>

      {publishIssues.length > 0 && (
        <div className="pub-review__issues" role="status">
          <AlertCircle size={18} />
          <div>
            <strong>{t('editor.wizard.review.issuesTitle', 'Antes de publicar:')}</strong>
            <ul>{publishIssues.map(issue => <li key={issue}>{issue}</li>)}</ul>
          </div>
        </div>
      )}

      <label className="checkbox-label">
        <input
          type="checkbox"
          name="featured_article"
          checked={!!formData.featured_article}
          onChange={handleInputChange}
        />
        <span>{t('editor.featured.label')}</span>
      </label>

      {status === 'draft' && (
        <p className="pub-step-note">{t('editor.wizard.review.draftNote', 'La publicación se guarda como borrador hasta que la publiques.')}</p>
      )}

      <div className="pub-review__actions">
        {editingArticle?.id_article ? (
          <button type="button" className="pub-btn pub-btn--ghost" onClick={handlePreviewDraft} title={t('editor.previewDraftHint')}>
            <Eye size={18} />
            <span>{t('editor.previewDraft')}</span>
          </button>
        ) : (
          <span className="pub-review__preview-hint">{t('editor.wizard.review.previewNeedsSave', 'Guarda el borrador para ver la vista previa.')}</span>
        )}

        {status === 'draft' ? (
          <>
            <button type="button" className="pub-btn pub-btn--ghost" onClick={() => saveArticle('draft')} disabled={saving}>
              <Save size={18} />
              <span>{saving ? t('editor.saving') : t('editor.project.saveDraftButton')}</span>
            </button>
            <button
              type="button"
              className="pub-btn pub-btn--primary"
              onClick={() => saveArticle('publish')}
              disabled={saving || publishIssues.length > 0}
            >
              <Send size={18} />
              <span>{publishLabel}</span>
            </button>
          </>
        ) : (
          <>
            <button type="button" className="pub-btn pub-btn--ghost" onClick={() => handleRevertToDraft(editingArticle)} disabled={saving}>
              <Undo2 size={18} />
              <span>
                {status === 'pending_approval'
                  ? t('editor.mine.withdraw', 'Retirar de revisión')
                  : t('editor.mine.revert', 'Pasar a borrador')}
              </span>
            </button>
            {status === 'pending_approval' && canPublishDirectly && (
              <button type="button" className="pub-btn pub-btn--ghost" onClick={() => saveArticle('publish')} disabled={saving || publishIssues.length > 0}>
                <Send size={18} />
                <span>{t('editor.wizard.publish', 'Publicar')}</span>
              </button>
            )}
            <button
              type="button"
              className="pub-btn pub-btn--primary"
              onClick={() => saveArticle('update')}
              disabled={saving || publishIssues.length > 0}
            >
              <Save size={18} />
              <span>{saving ? t('editor.saving') : t('editor.wizard.saveChanges', 'Guardar cambios')}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );

  // ---- "Mis publicaciones" -----------------------------------------------
  const mine = editorArticles.filter(a => isSuperAdmin || isArticleAuthor(a));
  const mineCounts = {
    all: mine.length,
    draft: mine.filter(a => a.status_article === 'draft').length,
    pending_approval: mine.filter(a => a.status_article === 'pending_approval').length,
    published: mine.filter(a => a.status_article === 'published').length
  };
  const mineVisible = articleListFilter === 'all' ? mine : mine.filter(a => a.status_article === articleListFilter);
  const MINE_FILTERS = [
    { key: 'all', label: t('editor.articlesList.filterAll') },
    { key: 'draft', label: t('editor.status.draft') },
    { key: 'pending_approval', label: t('editor.review.statusShort') },
    { key: 'published', label: t('editor.status.published') }
  ];

  return (
    <div className="article-editor-blocks">
      <div className="editor-container pub-editor">
        <header className="pub-editor-header">
          {/* Close (top-right): back to where the editor was opened from. */}
          <button
            type="button"
            className="pub-editor-close"
            onClick={handleClose}
            title={t('editor.wizard.close', 'Cerrar el editor')}
            aria-label={t('editor.wizard.close', 'Cerrar el editor')}
          >
            <X size={24} />
          </button>

          <h1 className="pub-editor-title">
            {view === 'mine'
              ? t('editor.mine.title', 'Mis publicaciones')
              : editingArticle ? t('editor.title.edit') : t('editor.title.create')}
          </h1>

          <div className="pub-editor-header-actions">
            {view === 'wizard' ? (
              <button type="button" className="pub-btn pub-btn--ghost" onClick={() => setView('mine')}>
                <Library size={18} />
                <span>{t('editor.mine.button', 'Mis publicaciones')}</span>
              </button>
            ) : (
              <>
                {(editingArticle || hasUnsavedNewWork()) && (
                  <button type="button" className="pub-btn pub-btn--ghost" onClick={() => setView('wizard')}>
                    <Edit size={18} />
                    <span>{t('editor.mine.backToEditor', 'Volver a la publicación en curso')}</span>
                  </button>
                )}
                <button type="button" className="pub-btn pub-btn--primary" onClick={startNewPublication}>
                  <Plus size={18} />
                  <span>{t('editor.mine.new', 'Nueva publicación')}</span>
                </button>
              </>
            )}
          </div>

          {/* Progress: completed steps, current step, next steps. */}
          {view === 'wizard' && (
            <nav className="pub-progress" aria-label={t('editor.wizard.stepsLabel', 'Pasos de la publicación')}>
              <ol className="pub-steps">
                {STEPS.map(({ n, short }) => {
                  const state = n < step ? 'is-done' : n === step ? 'is-current' : 'is-next';
                  const clickable = n !== step && canVisitStep(n);
                  return (
                    <li key={n} className={`pub-step ${state}`}>
                      <button
                        type="button"
                        className="pub-step__btn"
                        onClick={() => clickable && setStep(n)}
                        disabled={!clickable && n !== step}
                        aria-current={n === step ? 'step' : undefined}
                      >
                        <span className="pub-step__bar" aria-hidden="true" />
                        <span className="pub-step__num">
                          {String(n).padStart(2, '0')}
                          {n < step && <Check size={13} className="pub-step__check" />}
                        </span>
                        <span className="pub-step__label">{short}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}
        </header>

        {view === 'wizard' && (
          <div className="pub-wizard">
            {status === 'pending_approval' && (
              <div className="editor-review-banner" role="status">
                <strong>{t('editor.review.pendingTitle')}</strong>
                <p>{t('editor.review.pendingBody')}</p>
              </div>
            )}
            {editingArticle?.rejection_reason && status === 'draft' && (
              <div className="editor-rejection-banner" role="alert">
                <strong>{t('editor.rejection.title')}</strong>
                <p>{editingArticle.rejection_reason}</p>
              </div>
            )}

            <section className="pub-step-panel" aria-labelledby="pub-step-title">
              <div className="pub-step-heading">
                <span className="pub-step-eyebrow">
                  {t('editor.wizard.stepOf', { n: step, total: TOTAL_STEPS, defaultValue: 'Paso {{n}} de {{total}}' })}
                </span>
                <h2 id="pub-step-title" className="pub-step-title">{STEPS[step - 1].long}</h2>
              </div>
              {step === 1 && stepProject}
              {step === 2 && stepClassification}
              {step === 3 && stepBasics}
              {step === 4 && stepType}
              {step === 5 && stepContent}
              {step === 6 && stepReview}
            </section>

            <div className="pub-wizard-footer">
              <div className="pub-wizard-footer__side">
                {step > 1 && (
                  <button type="button" className="pub-btn pub-btn--ghost" onClick={goPrev}>
                    <ChevronLeft size={18} />
                    <span>{t('editor.wizard.prev', 'Anterior')}</span>
                  </button>
                )}
              </div>
              {step < TOTAL_STEPS && (
                <button type="button" className="pub-btn pub-btn--ghost" onClick={() => saveArticle(saveIntent)} disabled={saving}>
                  <Save size={18} />
                  <span>
                    {saving
                      ? t('editor.saving')
                      : saveIntent === 'draft'
                      ? t('editor.project.saveDraftButton')
                      : t('editor.wizard.saveChanges', 'Guardar cambios')}
                  </span>
                </button>
              )}
              <div className="pub-wizard-footer__side pub-wizard-footer__side--end">
                {step < TOTAL_STEPS && (
                  <button type="button" className="pub-btn pub-btn--primary" onClick={goNext}>
                    <span>{t('editor.wizard.next', 'Siguiente')}</span>
                    <ChevronRight size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'mine' && (
          <div className="pub-mine">
            <p className="list-subtitle">
              {t('editor.mine.subtitle', 'Edita, elimina o revisa el estado de tus publicaciones.')}
            </p>
            <div className="articles-filter">
              {MINE_FILTERS.map(f => (
                <button
                  key={f.key}
                  type="button"
                  className={`articles-filter__btn ${articleListFilter === f.key ? 'is-active' : ''}`}
                  onClick={() => setArticleListFilter(f.key)}
                >
                  {f.label} <span className="articles-filter__count">{mineCounts[f.key]}</span>
                </button>
              ))}
            </div>
            {mineVisible.length === 0 ? (
              <div className="empty-state">
                <p>{t('editor.articlesList.empty')}</p>
                <p>{t('editor.articlesList.emptyHint')}</p>
              </div>
            ) : (
              <div className="articles-grid">
                {mineVisible.map((article) => (
                  <div key={article.id_article} className="article-item">
                    <div className="article-item-info">
                      <h4>{article.title_article}</h4>
                      <p className="article-meta">
                        <span className={`status status-${article.status_article}`}>{statusLabel(article.status_article)}</span>
                        <span className="category-badge">{article.category_article}</span>
                      </p>
                      <p className="article-author">
                        {t('article.detail.by')} {article.authors?.map(a => a.name_user).join(', ') || article.author_name || t('editor.author.unknownAuthor')}
                      </p>
                      {article.rejection_reason && article.status_article === 'draft' && (
                        <p className="pub-mine__rejection">
                          <strong>{t('editor.rejection.title')}</strong> {article.rejection_reason}
                        </p>
                      )}
                    </div>
                    <div className="article-item-actions">
                      <button className="btn-edit" onClick={() => openPublicationForEdit(article)} title={t('common.buttons.edit')}>
                        <Edit size={18} />
                      </button>
                      {(article.status_article === 'published' || article.status_article === 'pending_approval') && (
                        <button
                          className="btn-edit"
                          onClick={() => handleRevertToDraft(article)}
                          title={article.status_article === 'pending_approval'
                            ? t('editor.mine.withdraw', 'Retirar de revisión')
                            : t('editor.mine.revert', 'Pasar a borrador')}
                        >
                          <Undo2 size={18} />
                        </button>
                      )}
                      <button className="btn-delete" onClick={() => handleDelete(article.id_article)} title={t('common.buttons.delete')}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Project Modal — rendered via portal to escape overflow/transform ancestors */}
      {showProjectModal && createPortal(
        <div className="modal-overlay" onClick={resetProjectModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProjectId ? t('editor.project.editTitle') : t('editor.project.createNew')}</h2>
              <button
                className="modal-close"
                onClick={resetProjectModal}
                aria-label={t('common.buttons.close')}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {editingProjectId && (
                <div className="project-status-line">
                  <span>{t('editor.status.label')}:</span>
                  <span className={`status status-${newProjectData.status_project}`}>
                    {newProjectData.status_project === 'published'
                      ? t('editor.status.published')
                      : newProjectData.status_project === 'pending_approval'
                      ? 'En revisión'
                      : t('editor.status.draft')}
                  </span>
                </div>
              )}
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

              <div className="form-group cover-image-group">
                <label>{t('editor.project.coverLabel')}</label>
                <div className="cover-image-upload">
                  {projectCoverPreview ? (
                    <div className="cover-image-preview">
                      <img src={projectCoverPreview} alt={t('editor.coverImage.preview')} />
                      <button
                        type="button"
                        className="btn-remove-preview"
                        onClick={handleRemoveProjectCover}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="file"
                        id="project_cover"
                        accept="image/*"
                        onChange={handleProjectCoverChange}
                        className="cover-image-input"
                      />
                      <label htmlFor="project_cover" className="cover-image-label">
                        <Plus size={24} />
                        <span>{t('editor.coverImage.select')}</span>
                      </label>
                    </>
                  )}
                </div>
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
                    {PROJECT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
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
                    {PROJECT_FORMATS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>{t('editor.project.collaboratorsLabel')}</label>
                <div className="authors-list-compact">
                  {newProjectAuthors.map(author => (
                    <div key={author.id_user} className="author-tag-compact">
                      {author.image_user
                        ? <img src={resolveUserImage(author.image_user)} alt={author.name_user} className="author-avatar-tiny" />
                        : <User size={12} />}
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
                    value=""
                    onChange={(e) => { if (e.target.value) handleAddProjectAuthor(e.target.value); }}
                  >
                    <option value="">{t('editor.project.addCollaborator')}</option>
                    {editors.filter(e => !newProjectAuthors.some(a => a.id_user === e.id_user)).map(editor => (
                      <option key={editor.id_user} value={editor.id_user}>{editor.name_user}</option>
                    ))}
                  </select>
                </div>
              </div>

              {editingProjectId && projectArticles.length > 0 && (
                <div className="form-group">
                  <label>{t('editor.project.articlesLabel')}</label>
                  <ul className="project-articles-list">
                    {projectArticles.map(article => (
                      <li key={article.id_article} className="project-article-item">
                        <span className="project-article-title">
                          {article.title_article}
                          <span className={`status status-${article.status_article}`}>
                            {article.status_article === 'published'
                              ? t('editor.status.published')
                              : article.status_article === 'pending_approval'
                              ? t('editor.review.statusShort')
                              : t('editor.status.draft')}
                          </span>
                        </span>
                        <button
                          type="button"
                          className="btn-edit-project-article"
                          onClick={() => handleEditProjectArticle(article)}
                        >
                          <Edit size={13} /> {t('common.buttons.edit')}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="project-articles-hint">{t('editor.project.articlesHint')}</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={resetProjectModal}
              >
                {t('common.buttons.cancel')}
              </button>
              <button
                type="button"
                className="btn-save-draft"
                onClick={handleSaveProjectDraft}
                title={t('editor.project.saveDraftTitle')}
              >
                <Save size={15} />
                <span>{t('editor.project.saveDraftButton')}</span>
              </button>
              <button
                type="button"
                className="btn-save"
                onClick={handleSubmitProject}
              >
                {canPublishDirectly
                  ? t('editor.project.publishButton')
                  : t('editor.project.submitReviewButton')}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}

export default ArticleEditorBlocks;
