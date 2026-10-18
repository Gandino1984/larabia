// magazine-front/src/components/magazine/ProjectCard.jsx
//
// A project among the publications of a magazine section (utils/sections.js):
// the article cards' look, with a «Proyecto» badge. Opens the project.
import { useTranslation } from 'react-i18next';
import { useMagazine } from '../../app_context/MagazineContext';
import { useUI } from '../../app_context/UIContext';
import './ArticleCard.css';

const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';

const coverOf = (project) => {
  const c = project.cover_image_project;
  if (!c) return '/logoFondoNegro.jpg';
  if (c.startsWith('http://') || c.startsWith('https://') || c.startsWith('/')) return c;
  return `${apiUrl}/${c}`;
};

function ProjectCard({ project }) {
  const { t } = useTranslation();
  const { setSelectedProject } = useMagazine();
  const { navigateToProjectDetail } = useUI();

  const open = () => {
    setSelectedProject(project);
    navigateToProjectDetail();
  };

  return (
    <article
      className="article-card project-card"
      onClick={open}
      onKeyDown={(e) => { if (e.key === 'Enter') open(); }}
      role="link"
      tabIndex={0}
    >
      <div className="article-card-image">
        <img
          src={coverOf(project)}
          alt={project.title_project}
          onError={(e) => { e.target.src = '/logoFondoNegro.jpg'; }}
        />
        <div className="article-badges">
          <span className="article-badge article-category">
            {t('sections.projectBadge', 'Proyecto')}
            {project.format_project ? ` · ${project.format_project}` : ''}
          </span>
        </div>
      </div>
      <div className="article-card-content">
        <h3 className="article-card-title">{project.title_project}</h3>
        {project.description_project && (
          <p className="article-card-excerpt">{project.description_project}</p>
        )}
      </div>
    </article>
  );
}

export default ProjectCard;
