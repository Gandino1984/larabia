// magazine-front/src/components/admin/blocks/TextBlock.jsx
import { useRef } from 'react';
import { Trash2, GripVertical } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './BlockStyles.css';
import './TextBlock.css';

function TextBlock({ block, onUpdate, onDelete, isEditing }) {
    const quillRef = useRef(null);

    const handleChange = (content) => {
        onUpdate({ ...block, content: content });
    };

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

    return (
        <div className={`content-block text-block ${isEditing ? 'editing' : 'published'}`}>
            <div className="block-header">
                <GripVertical className="drag-handle" size={20} />
                <span className="block-type-label">TEXTO</span>
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
                <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={block.content || ''}
                    onChange={handleChange}
                    modules={modules}
                    formats={formats}
                    placeholder="Escribe aquí el contenido del párrafo..."
                    className="text-block-editor"
                />
            </div>
        </div>
    );
}

export default TextBlock;
