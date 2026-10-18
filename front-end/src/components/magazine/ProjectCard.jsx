// magazine-front/src/components/magazine/ProjectCard.jsx
//
// A project among the publications of a magazine section (utils/sections.js):
// the article cards' look, with a «Proyecto» badge. Opens the project.
import { useTranslation } from 'react-i18next';
import { useMagazine } from '../../app_context/MagazineContext';
import { useUI } from '../../app_context/UIContext';
import { projectTitle, projectDescription } from '../../utils/contentLang';
import { projectFormatLabel } from '../../utils/projectKinds';
import './ArticleCard.css';

const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';

const coverOf = (project) => {
  const c = project.cover_image_project;
  if (!c) return '/logoFondoNegro.jpg';
  if (c.startsWith('http://') || c.startsWith('https://') || c.startsWith('/')) return c;
  return `${apiUrl}/${c}`;
};

function ProjectCard({ project }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
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
          alt={projectTitle(project, lang)}
          onError={(e) => { e.target.src = '/logoFondoNegro.jpg'; }}
        />
        <div className="article-badges">
          <span className="article-badge article-category">
            {t('sections.projectBadge', 'Proyecto')}
            {project.format_project ? ` · ${projectFormatLabel(project.format_project, t)}` : ''}
          </span>
        </div>
      </div>
      <div className="article-card-content">
        <h3 className="article-card-title">{projectTitle(project, lang)}</h3>
        {projectDescription(project, lang) && (
          <p className="article-card-excerpt">{projectDescription(project, lang)}</p>
        )}
      </div>
    </article>
  );
}

export default ProjectCard;
