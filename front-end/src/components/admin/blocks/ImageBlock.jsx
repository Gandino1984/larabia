// magazine-front/src/components/admin/blocks/ImageBlock.jsx
//
// `lang` (utils/contentLang.js): 'es' edits the original alt text and caption;
// 'en' / 'eu' edit that language's version (translations_block). The image is
// the same in every language.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, GripVertical, Upload } from 'lucide-react';
import { LANG_NAMES, parseTranslations, withTranslation } from '../../../utils/contentLang';
import './BlockStyles.css';

function ImageBlock({ block, onUpdate, onDelete, onUploadImage, isEditing, lang = 'es' }) {
    const { t } = useTranslation();
    const [uploading, setUploading] = useState(false);
    const translating = lang !== 'es';
    const tr = parseTranslations(block.translations_block)[lang] || {};

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const uploadedUrl = await onUploadImage(file);
            onUpdate({
                ...block,
                image_url: uploadedUrl
            });
        } catch (err) {
            console.error('Error uploading image:', err);
        } finally {
            setUploading(false);
        }
    };

    // field: 'image_alt' | 'image_caption' (their versions: 'alt' | 'caption').
    const handleMetadataChange = (field, value) => {
        if (translating) {
            const key = field === 'image_alt' ? 'alt' : 'caption';
            onUpdate({ ...block, translations_block: withTranslation(block.translations_block, lang, key, value) });
            return;
        }
        onUpdate({
            ...block,
            [field]: value
        });
    };

    const getImageSrc = () => {
        if (!block.image_url) return null;
        if (block.image_url.startsWith('http')) {
            return block.image_url;
        }
        const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
        // Remove leading slash from image_url to avoid double slashes
        const imageUrl = block.image_url.startsWith('/') ? block.image_url.substring(1) : block.image_url;
        return `${apiUrl}/${imageUrl}`;
    };

    const inLang = translating ? ` (${LANG_NAMES[lang]})` : '';

    return (
        <div className={`content-block image-block ${isEditing ? 'editing' : 'published'}`}>
            <div className="block-header">
                <GripVertical className="drag-handle" size={20} />
                <span className="block-type-label">
                    {t('editor.blocks.imageLabel', 'Imagen')}{translating ? ` · ${LANG_NAMES[lang]}` : ''}
                </span>
                <button
                    type="button"
                    className="btn-delete-block"
                    onClick={() => onDelete(block)}
                    title={t('editor.blocks.delete', 'Eliminar bloque')}
                    aria-label={t('editor.blocks.delete', 'Eliminar bloque')}
                >
                    <Trash2 size={16} />
                </button>
            </div>
            <div className="block-content">
                {block.image_url ? (
                    <div className="image-preview">
                        <img
                            src={getImageSrc()}
                            alt={block.image_alt || ''}
                            className="block-image"
                        />
                        <button
                            type="button"
                            className="btn-change-image"
                            onClick={() => document.getElementById(`file-${block.id_block || block.tempId}`).click()}
                        >
                            {t('editor.blocks.changeImage', 'Cambiar imagen')}
                        </button>
                    </div>
                ) : (
                    <div className="image-upload-area">
                        <Upload size={40} />
                        <p>{t('editor.blocks.uploadHint', 'Haz clic para subir una imagen')}</p>
                        <button
                            type="button"
                            className="btn-upload"
                            onClick={() => document.getElementById(`file-${block.id_block || block.tempId}`).click()}
                            disabled={uploading}
                        >
                            {uploading ? t('editor.blocks.uploading', 'Subiendo...') : t('editor.blocks.selectImage', 'Seleccionar imagen')}
                        </button>
                    </div>
                )}
                <input
                    type="file"
                    id={`file-${block.id_block || block.tempId}`}
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
                <div className="image-metadata">
                    <input
                        type="text"
                        lang={lang}
                        aria-label={`${t('editor.blocks.altLabel', 'Texto alternativo')}${inLang}`}
                        placeholder={translating && block.image_alt
                            ? block.image_alt
                            : `${t('editor.blocks.altPlaceholder', 'Texto alternativo (para accesibilidad)')}${inLang}`}
                        value={translating ? tr.alt || '' : block.image_alt || ''}
                        onChange={(e) => handleMetadataChange('image_alt', e.target.value)}
                        className="metadata-input"
                    />
                    <input
                        type="text"
                        lang={lang}
                        aria-label={`${t('editor.blocks.captionLabel', 'Pie de foto')}${inLang}`}
                        placeholder={translating && block.image_caption
                            ? block.image_caption
                            : `${t('editor.blocks.captionPlaceholder', 'Pie de foto (opcional)')}${inLang}`}
                        value={translating ? tr.caption || '' : block.image_caption || ''}
                        onChange={(e) => handleMetadataChange('image_caption', e.target.value)}
                        className="metadata-input"
                    />
                </div>
            </div>
        </div>
    );
}

export default ImageBlock;
