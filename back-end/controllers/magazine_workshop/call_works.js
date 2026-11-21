// back-end/controllers/magazine_workshop/call_works.js
//
// Convocatorias: the works sent to a call (contest_entries) become articles.
// A super admin accepts a work → a DRAFT article is made from it, with the
// participant as its author, in the call's section (section_workshop) and
// linked to the call (call_id_article): its title, its note as the excerpt,
// its pasted text as a text block and, if the file is an image, an image
// block (copied out of the private folder). A PDF / Word file isn't
// converted: the super admin downloads it and copies its text into the draft
// in the usual editor, then publishes it there. An image is also the
// article's cover (cards, the call's list of works).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import magazine_article_model from "../../models/magazine_article_model.js";
import article_author_model from "../../models/article_author_model.js";
import article_block_model from "../../models/article_block_model.js";
import sharp from "sharp";
import { entryPath } from "./contest_entry_store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOCKS_DIR = path.resolve(__dirname, "../../uploads/article_blocks");
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const EXCERPT_MAX = 500;

const escapeHtml = (s) => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Plain text → the editor's HTML (Quill): a paragraph per line, blank lines kept. */
export function textToHtml(text) {
    return String(text || '')
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((line) => (line.trim() ? `<p>${escapeHtml(line)}</p>` : '<p><br></p>'))
        .join('');
}

// sharp, as for every upload: one image at a time, bounded memory.
sharp.cache(false);
const SHARP_INPUT_LIMIT = 80_000_000;

/** `from` as WebP in the public block images, at most `max` px a side. Returns its URL. */
async function toWebp(from, suffix, max, quality) {
    const name = `block_${Date.now()}_${suffix}.webp`;
    await sharp(from, { limitInputPixels: SHARP_INPUT_LIMIT })
        .rotate()
        .resize(max, max, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality })
        .toFile(path.join(BLOCKS_DIR, name));
    return `/uploads/article_blocks/${name}`;
}

/**
 * The entry's file, when it's an image: { block, cover } — the work for the
 * article (WebP, up to 2400 px) and a lighter cover (up to 1200 px). The
 * original stays private. null if it isn't an image (or can't be read).
 */
async function entryImages(entry) {
    const ext = path.extname(entry.file_entry || '').toLowerCase();
    if (!IMAGE_EXTENSIONS.includes(ext)) return null;
    const from = entryPath(entry.file_entry);
    if (!from || !fs.existsSync(from)) return null;
    fs.mkdirSync(BLOCKS_DIR, { recursive: true });
    try {
        return {
            block: await toWebp(from, 'obra', 2400, 88),
            cover: await toWebp(from, 'portada', 1200, 82)
        };
    } catch (err) {
        console.error('-> call works: image conversion failed =', err.message);
        return null;
    }
}

/** The article an entry was turned into, if it still exists. */
export async function entryArticle(entry) {
    if (!entry?.article_id_entry) return null;
    const a = await magazine_article_model.findByPk(entry.article_id_entry, {
        attributes: ['id_article', 'title_article', 'status_article', 'active_article', 'call_id_article']
    });
    return a && a.active_article ? a : null;
}

/** id_article → { id_article, status_article, title_article } for a list of entries. */
export async function entryArticles(entries) {
    const ids = [...new Set(entries.map((e) => e.article_id_entry).filter(Boolean))];
    if (!ids.length) return new Map();
    const rows = await magazine_article_model.findAll({
        where: { id_article: ids, active_article: true },
        attributes: ['id_article', 'title_article', 'status_article']
    });
    return new Map(rows.map((r) => [r.id_article, r.toJSON()]));
}

/**
 * The draft article for an accepted entry. Returns the article (model
 * instance). `call` is the convocatoria (magazine_workshops row).
 */
export async function createDraftFromEntry(entry, call) {
    const note = String(entry.note_entry || '').trim();
    const section = String(call.section_workshop || '').trim();
    const image = await entryImages(entry);
    const article = await magazine_article_model.create({
        title_article: entry.title_entry,
        content_article: 'Block-based content',
        excerpt_article: note ? note.slice(0, EXCERPT_MAX) : null,
        author_id: entry.user_id,
        category_article: 'general',
        status_article: 'draft',
        sections_article: section ? [section] : null,
        sections_requested_article: null,
        call_id_article: call.id_workshop,
        cover_image_article: image?.cover || null
    });
    await article_author_model.create({ article_id: article.id_article, user_id: entry.user_id, author_order: 0 });

    let order = 0;
    if (image) {
        await article_block_model.create({
            article_id: article.id_article, block_type: 'image', block_order: order++,
            image_url: image.block, image_alt: entry.title_entry.slice(0, 255)
        });
    }
    if (String(entry.text_entry || '').trim()) {
        await article_block_model.create({
            article_id: article.id_article, block_type: 'text', block_order: order++,
            content: textToHtml(entry.text_entry)
        });
    }
    return article;
}
