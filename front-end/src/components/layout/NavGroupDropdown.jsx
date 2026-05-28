// magazine-front/src/components/layout/NavGroupDropdown.jsx
//
// Generic desktop dropdown for a configurable nav "group" item (replaces the
// hardcoded MoreDropdown). Reuses the .more-dropdown* CSS so the look is
// unchanged. Renders the group's visible children; each runs its action.
import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { navLabel, canSeeNavItem } from '../../app_context/navConfig';
import './MoreDropdown.css';

function NavGroupDropdown({ item, lang, roles, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const children = (item.children || []).filter(
    (c) => c.visible !== false && canSeeNavItem(c, roles)
  );
  if (children.length === 0) return null;

  return (
    <div className="more-dropdown" ref={dropdownRef}>
      <button
        className="more-dropdown-btn nav-link"
        onClick={() => setIsOpen((o) => !o)}
        aria-label={navLabel(item, lang)}
      >
        <span>{navLabel(item, lang)}</span>
        <ChevronDown size={16} className={`chevron-icon ${isOpen ? 'rotated' : ''}`} />
      </button>

      {isOpen && (
        <div className="more-dropdown-menu">
          {children.map((child) => (
            <button
              key={child.id}
              className="more-dropdown-item"
              onClick={() => { onSelect(child); setIsOpen(false); }}
            >
              {navLabel(child, lang)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default NavGroupDropdown;
