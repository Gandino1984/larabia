import { useState, useEffect, useRef } from 'react';
import { useMetadata } from '../../../app_context/MetadataContext';
import { useUI } from '../../../app_context/UIContext';
import './AdminMetadataTab.css';

function AdminMetadataTab() {
  const { metadata, loaded, updateMetadata, uploadLogo, resolveLogoUrl, fetchMetadata } = useMetadata();
  const { showSuccess, showError } = useUI();

  const [name, setName] = useState('');
  const [slogan, setSlogan] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({ light: false, dark: false });

  const lightInputRef = useRef(null);
  const darkInputRef = useRef(null);

  // Seed form fields when metadata loads or refreshes
  useEffect(() => {
    if (loaded) {
      setName(metadata.name || '');
      setSlogan(metadata.slogan || '');
      setDescription(metadata.description || '');
    }
  }, [loaded, metadata.name, metadata.slogan, metadata.description]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showError('El nombre no puede estar vacío');
      return;
    }
    setSaving(true);
    const result = await updateMetadata({ name: name.trim(), slogan: slogan.trim(), description });
    setSaving(false);
    if (result.error) showError(result.error);
    else showSuccess(result.success);
  };

  const handleLogoChange = async (e, variant) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading((p) => ({ ...p, [variant]: true }));
    const result = await uploadLogo(file, variant);
    setUploading((p) => ({ ...p, [variant]: false }));
    e.target.value = ''; // reset input so the same file can be re-selected
    if (result.error) showError(result.error);
    else {
      showSuccess(result.success);
      await fetchMetadata(); // also cache-bust by re-fetching
    }
  };

  const lightUrl = resolveLogoUrl(metadata.logo_light);
  const darkUrl = resolveLogoUrl(metadata.logo_dark);

  return (
    <section className="admin-metadata">
      <form className="admin-metadata__form" onSubmit={handleSave}>
        <div className="admin-metadata__field">
          <label htmlFor="meta-name">Nombre de la revista</label>
          <input
            id="meta-name"
            type="text"
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="La Rabia"
          />
        </div>

        <div className="admin-metadata__field">
          <label htmlFor="meta-slogan">Eslogan</label>
          <input
            id="meta-slogan"
            type="text"
            maxLength={255}
            value={slogan}
            onChange={(e) => setSlogan(e.target.value)}
            placeholder="Revista comunitaria del distrito 02 de Bilbao"
          />
        </div>

        <div className="admin-metadata__field">
          <label htmlFor="meta-description">Descripción</label>
          <textarea
            id="meta-description"
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="¿De qué va la revista? Esta descripción aparece en el pie de los correos y en la página de contacto."
          />
        </div>

        <div className="admin-metadata__actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar datos'}
          </button>
        </div>
      </form>

      <div className="admin-metadata__logos">
        <h3>Logotipos</h3>
        <p className="admin-metadata__hint">
          Los logos sustituyen los archivos LaRabia por defecto. Las animaciones y comportamiento del header se mantienen exactamente igual.
        </p>

        <div className="admin-metadata__logo-grid">
          {/* Light variant — shown on dark backgrounds */}
          <article className="admin-metadata__logo-card admin-metadata__logo-card--on-dark">
            <header>
              <h4>Logo para fondos oscuros</h4>
              <p>Versión clara. Cabecera por defecto.</p>
            </header>
            <div className="admin-metadata__logo-preview" data-bg="dark">
              {lightUrl ? <img src={lightUrl} alt="Logo claro" /> : <span className="admin-metadata__missing">Sin logo</span>}
            </div>
            <div className="admin-metadata__logo-controls">
              <input
                type="file"
                accept="image/*"
                ref={lightInputRef}
                onChange={(e) => handleLogoChange(e, 'light')}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => lightInputRef.current?.click()}
                disabled={uploading.light}
              >
                {uploading.light ? 'Subiendo…' : 'Subir nuevo'}
              </button>
            </div>
          </article>

          {/* Dark variant — shown on light backgrounds */}
          <article className="admin-metadata__logo-card admin-metadata__logo-card--on-light">
            <header>
              <h4>Logo para fondos claros</h4>
              <p>Versión oscura. Header al pasar el ratón, correos, etc.</p>
            </header>
            <div className="admin-metadata__logo-preview" data-bg="light">
              {darkUrl ? <img src={darkUrl} alt="Logo oscuro" /> : <span className="admin-metadata__missing">Sin logo</span>}
            </div>
            <div className="admin-metadata__logo-controls">
              <input
                type="file"
                accept="image/*"
                ref={darkInputRef}
                onChange={(e) => handleLogoChange(e, 'dark')}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => darkInputRef.current?.click()}
                disabled={uploading.dark}
              >
                {uploading.dark ? 'Subiendo…' : 'Subir nuevo'}
              </button>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

export default AdminMetadataTab;
