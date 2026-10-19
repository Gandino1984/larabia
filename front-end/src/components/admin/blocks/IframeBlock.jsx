// magazine-front/src/components/admin/blocks/IframeBlock.jsx
import { Trash2, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './BlockStyles.css';

function IframeBlock({ block, onUpdate, onDelete, isEditing }) {
    const { t } = useTranslation();
    const handleChange = (field, value) => {
        onUpdate({
            ...block,
            [field]: value
        });
    };

    return (
        <div className={`content-block iframe-block ${isEditing ? 'editing' : 'published'}`}>
            <div className="block-header">
                <GripVertical className="drag-handle" size={20} />
                <span className="block-type-label">{t('editor.blocks.iframeLabel', 'Contenido incrustado')}</span>
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
                <input
                    type="url"
                    placeholder={t('editor.blocks.iframeUrl', 'URL del contenido a insertar (YouTube, Vimeo, Google Maps, etc.)')}
                    value={block.iframe_url || ''}
                    onChange={(e) => handleChange('iframe_url', e.target.value)}
                    className="iframe-url-input"
                />
                <div className="iframe-dimensions">
                    <input
                        type="text"
                        placeholder={t('editor.blocks.width', 'Ancho')}
                        value={block.iframe_width || '100%'}
                        onChange={(e) => handleChange('iframe_width', e.target.value)}
                        className="dimension-input"
                    />
                    <input
                        type="text"
                        placeholder={t('editor.blocks.height', 'Alto')}
                        value={block.iframe_height || '400px'}
                        onChange={(e) => handleChange('iframe_height', e.target.value)}
                        className="dimension-input"
                    />
                </div>
                {block.iframe_url && (
                    <div className="iframe-preview">
                        <iframe
                            src={block.iframe_url}
                            width={block.iframe_width || '100%'}
                            height={block.iframe_height || '400px'}
                            frameBorder="0"
                            allowFullScreen
                            title={t('article.detail.embedTitle', 'Contenido embebido')}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default IframeBlock;
