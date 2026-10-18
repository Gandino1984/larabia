// magazine-front/src/components/admin/blocks/TextBlock.jsx
//
// `lang` (utils/contentLang.js): 'es' edits the original; 'en' / 'eu' edit that
// language's version (translations_block), with the original shown above.
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, GripVertical } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { LANG_NAMES, hasText, parseTranslations, withTranslation } from '../../../utils/contentLang';
import './BlockStyles.css';
import './TextBlock.css';

// Custom toolbar with formatting options
const modules = {
    toolbar: [
        // Text formatting
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline'],

        // Text color
        [{ 'color': [] }],

        // Text alignment
        [{ 'align': [] }],

        // Lists
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],

        // Clear formatting
        ['clean']
    ]
};

const formats = [
    'header',
    'bold', 'italic', 'underline',
    'color',
    'align',
    'list', 'bullet',
];

function TextBlock({ block, onUpdate, onDelete, isEditing, lang = 'es' }) {
    const { t } = useTranslation();
    const quillRef = useRef(null);
    const translating = lang !== 'es';
    const value = translating
        ? parseTranslations(block.translations_block)[lang]?.content || ''
        : block.content || '';

    const handleChange = (content) => {
        // Quill reports its empty paragraph when a version is first opened:
        // that isn't an edit.
        if (!hasText(content) && !hasText(value)) return;
        if (translating) {
            onUpdate({ ...block, translations_block: withTranslation(block.translations_block, lang, 'content', content) });
        } else {
            onUpdate({ ...block, content: content });
        }
    };

    return (
        <div className={`content-block text-block ${isEditing ? 'editing' : 'published'}`}>
            <div className="block-header">
                <GripVertical className="drag-handle" size={20} />
                <span className="block-type-label">
                    {t('editor.blocks.textLabel', 'Texto')}{translating ? ` · ${LANG_NAMES[lang]}` : ''}
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
                {translating && hasText(block.content) && (
                    <details className="block-original">
                        <summary>{t('contentLang.showOriginal', 'Ver el original')}</summary>
                        <div className="block-original__text" lang="es" dangerouslySetInnerHTML={{ __html: block.content }} />
                    </details>
                )}
                <ReactQuill
                    key={lang}
                    ref={quillRef}
                    theme="snow"
                    value={value}
                    onChange={handleChange}
                    modules={modules}
                    formats={formats}
                    placeholder={translating
                        ? t('contentLang.textPlaceholder', { lang: LANG_NAMES[lang], defaultValue: 'Escribe aquí la versión en {{lang}} de este párrafo…' })
                        : t('editor.blocks.textPlaceholder', 'Escribe aquí el contenido del párrafo...')}
                    className="text-block-editor"
                />
            </div>
        </div>
    );
}

export default TextBlock;
