// magazine-front/src/components/magazine/ProjectDetail.jsx
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, User } from 'lucide-react';
import { useUI } from '../../app_context/UIContext';
import { useMagazine } from '../../app_context/MagazineContext';
import axiosInstance from '../../utils/axiosConfig';
import ArticleCard from './ArticleCard';
import './ProjectDetail.css';

function ProjectDetail() {
  const { t } = useTranslation();
  const { navigateBack } = useUI();
  const { selectedProject } = useMagazine();
  const [projectArticles, setProjectArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';

  useEffect(() => {
    if (!selectedProject?.id_project) return;

    const fetchProjectArticles = async () => {
      setLoading(true);
      try {
        const response = await axiosInstance.get('/magazine-article', {
          params: { project_id: selectedProject.id_project }
        });
        if (!response.data.error) {
          setProjectArticles(response.data.data || []);
        } else {
          setProjectArticles([]);
        }
      } catch (err) {
        console.error('Error fetching project articles:', err);
        setProjectArticles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectArticles();
  }, [selectedProject?.id_project]);

  if (!selectedProject) return null;

  const getCoverImageUrl = () => {
    if (selectedProject.cover_image_project) {
      if (selectedProject.cover_image_project.startsWith('/')) {
        return selectedProject.cover_image_project;
      }
      return `${apiUrl}/${selectedProject.cover_image_project}`;
    }
    return null;
  };

  const coverUrl = getCoverImageUrl();

  const getAuthorImageUrl = (author) => {
    const img = author?.image_user;
    if (!img) return null;
    if (img.startsWith('http://') || img.startsWith('https://')) return img;
    return `${apiUrl}/user/image/${encodeURIComponent(img)}`;
  };

  return (
    <div className="project-detail-page">
      <button className="btn-back-nav" onClick={navigateBack}>
        <ArrowLeft size={20} />
        <span>{t('common.buttons.back')}</span>
      </button>

      <div className="project-detail-header">
        {coverUrl && (
          <div className="project-detail-cover">
            <img
              src={coverUrl}
              alt={selectedProject.title_project}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}

        <div className="project-detail-info">
          {selectedProject.format_project && (
            <span className="project-detail-format">{selectedProject.format_project}</span>
          )}
          <h1 className="project-detail-title">{selectedProject.title_project}</h1>
          {selectedProject.description_project && (
            <p className="project-detail-description">{selectedProject.description_project}</p>
          )}
          {(selectedProject.authors?.length > 0 || selectedProject.author_name) && (
            <div className="project-detail-collaborators">
              <span className="project-detail-collaborators-label">{t('project.collaborators')}</span>
              <div className="project-detail-authors-list">
                {selectedProject.authors && selectedProject.authors.length > 0 ? (
                  selectedProject.authors.map(author => (
                    <span key={author.id_user} className="project-detail-author-item">
                      {getAuthorImageUrl(author) ? (
                        <img
                          src={getAuthorImageUrl(author)}
                          alt={author.name_user}
                          className="project-author-avatar"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <User size={14} className="project-author-icon" />
                      )}
                      <span>{author.name_user}</span>
                    </span>
                  ))
                ) : (
                  <span className="project-detail-author-item">
                    <User size={14} className="project-author-icon" />
                    <span>{selectedProject.author_name}</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="project-detail-articles">
        {loading ? (
          <p className="project-detail-loading">{t('common.loading')}</p>
        ) : projectArticles.length > 0 ? (
          <div className="project-articles-grid">
            {projectArticles.map(article => (
              <ArticleCard key={article.id_article} article={article} />
            ))}
          </div>
        ) : (
          <p className="project-detail-empty">{t('project.noArticles')}</p>
        )}
      </div>
    </div>
  );
}

export default ProjectDetail;
