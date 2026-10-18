// magazine-front/src/components/magazine/SectionProjects.jsx
//
// The projects that belong to a magazine section (utils/sections.js), shown
// on the section's page above its articles. Nothing when there are none.
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMagazine } from '../../app_context/MagazineContext';
import { inSection } from '../../utils/sections';
import ProjectCard from './ProjectCard';
import './SectionProjects.css';

function SectionProjects({ sectionKey }) {
  const { t } = useTranslation();
  const { projects, fetchProjects } = useMagazine();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const list = useMemo(
    () => (projects || []).filter((p) => p.status_project === 'published' && inSection(p, sectionKey)),
    [projects, sectionKey]
  );
  if (list.length === 0) return null;

  return (
    <section className="section-projects" aria-labelledby={`section-projects-${sectionKey}`}>
      <h2 id={`section-projects-${sectionKey}`} className="section-projects__title">
        {t('sections.page.projects', 'Proyectos')}
      </h2>
      <div className="section-projects__grid">
        {list.map((project) => <ProjectCard key={project.id_project} project={project} />)}
      </div>
    </section>
  );
}

export default SectionProjects;
