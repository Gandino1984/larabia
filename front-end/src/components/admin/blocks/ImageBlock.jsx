// magazine-front/src/components/admin/blocks/ImageBlock.jsx
import { useState } from 'react';
import { Trash2, GripVertical, Upload } from 'lucide-react';
import './BlockStyles.css';

function ImageBlock({ block, onUpdate, onDelete, onUploadImage, isEditing }) {
    const [uploading, setUploading] = useState(false);

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

    const handleMetadataChange = (field, value) => {
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

    return (
        <div className={`content-block image-block ${isEditing ? 'editing' : 'published'}`}>
            <div className="block-header">
                <GripVertical className="drag-handle" size={20} />
                <span className="block-type-label">IMAGEN</span>
                <button
                    type="button"
                    className="btn-delete-block"
                    onClick={() => onDelete(block)}
                    title="Eliminar bloque"
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
                            Cambiar imagen
                        </button>
                    </div>
                ) : (
                    <div className="image-upload-area">
                        <Upload size={40} />
                        <p>Haz clic para subir una imagen</p>
                        <button
                            type="button"
                            className="btn-upload"
                            onClick={() => document.getElementById(`file-${block.id_block || block.tempId}`).click()}
                            disabled={uploading}
                        >
                            {uploading ? 'Subiendo...' : 'Seleccionar imagen'}
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
                        placeholder="Texto alternativo (para accesibilidad)"
                        value={block.image_alt || ''}
                        onChange={(e) => handleMetadataChange('image_alt', e.target.value)}
                        className="metadata-input"
                    />
                    <input
                        type="text"
                        placeholder="Pie de foto (opcional)"
                        value={block.image_caption || ''}
                        onChange={(e) => handleMetadataChange('image_caption', e.target.value)}
                        className="metadata-input"
                    />
                </div>
            </div>
        </div>
    );
}

export default ImageBlock;
