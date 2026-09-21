// magazine-front/src/components/layout/NavGroupDropdown.jsx
//
// Generic desktop dropdown for a configurable nav "group" item (replaces the
// hardcoded MoreDropdown). Reuses the .more-dropdown* CSS so the look is
// unchanged. Renders the group's visible children; each runs its action.
import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { navLabel, canSeeNavItem } from '../../app_context/navConfig';
import SpringDropdown from './SpringDropdown';
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

      <SpringDropdown open={isOpen} className="more-dropdown-menu">
        {children.map((child) =>
          child.kind === 'group' ? (
            <NavSubGroup
              key={child.id}
              item={child}
              lang={lang}
              roles={roles}
              onSelect={(c) => { onSelect(c); setIsOpen(false); }}
            />
          ) : (
            <button
              key={child.id}
              className="more-dropdown-item"
              onClick={() => { onSelect(child); setIsOpen(false); }}
            >
              {navLabel(child, lang)}
            </button>
          )
        )}
      </SpringDropdown>
    </div>
  );
}

// A nested group rendered inline (accordion) inside a dropdown menu. Works on
// touch and mouse without hover flyouts.
function NavSubGroup({ item, lang, roles, onSelect }) {
  const [open, setOpen] = useState(false);
  const children = (item.children || []).filter(
    (c) => c.visible !== false && canSeeNavItem(c, roles)
  );
  if (children.length === 0) return null;

  return (
    <div className="more-dropdown-subgroup">
      <button
        className="more-dropdown-item more-dropdown-subgroup-btn"
        onClick={() => setOpen((o) => !o)}
      >
        <span>{navLabel(item, lang)}</span>
        <ChevronDown size={14} className={`chevron-icon ${open ? 'rotated' : ''}`} />
      </button>
      {open && (
        <div className="more-dropdown-submenu">
          {children.map((child) => (
            <button
              key={child.id}
              className="more-dropdown-item more-dropdown-subitem"
              onClick={() => onSelect(child)}
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
