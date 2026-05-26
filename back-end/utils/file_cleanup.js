import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function deleteFile(filePath) {
    if (!filePath) {
        console.log('⚠️  deleteFile called with empty filePath');
        return false;
    }

    try {
        console.log(`🔍 deleteFile called with: "${filePath}"`);

        let actualPath = filePath;

        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
            const url = new URL(filePath);
            actualPath = url.pathname;
            console.log(`   → Extracted pathname from URL: "${actualPath}"`);
        }

        if (actualPath.startsWith('/')) {
            actualPath = actualPath.substring(1);
            console.log(`   → Removed leading slash: "${actualPath}"`);
        }

        // Files live in back-end/uploads/ or back-end/assets/. __dirname is .../back-end/utils
        const fullPath = path.join(__dirname, '..', actualPath);
        console.log(`   → Constructed fullPath: "${fullPath}"`);

        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            console.log(`   ✅ Deleted file: ${actualPath}`);
            return true;
        } else {
            console.log(`   ⚠️  File not found at: ${fullPath}`);
            return false;
        }
    } catch (error) {
        console.error(`   ❌ Error deleting file ${filePath}:`, error.message);
        return false;
    }
}

export function deleteFiles(filePaths) {
    if (!Array.isArray(filePaths)) return 0;
    let deletedCount = 0;
    for (const filePath of filePaths) {
        if (deleteFile(filePath)) deletedCount++;
    }
    return deletedCount;
}

export function cleanupProjectImages(project) {
    if (!project) return;
    if (project.cover_image_project && deleteFile(project.cover_image_project)) {
        console.log('✅ Cleaned up project cover image');
    }
}

export function cleanupArticleImages(article) {
    if (!article) return;
    if (article.cover_image_article && deleteFile(article.cover_image_article)) {
        console.log('✅ Cleaned up article cover image');
    }
}

export function cleanupBlockImages(blocks) {
    if (!Array.isArray(blocks) || blocks.length === 0) return;
    let deletedCount = 0;
    for (const block of blocks) {
        if (block.image_url && deleteFile(block.image_url)) deletedCount++;
    }
    if (deletedCount > 0) {
        console.log(`✅ Cleaned up ${deletedCount} block images`);
    }
}

export default {
    deleteFile,
    deleteFiles,
    cleanupProjectImages,
    cleanupArticleImages,
    cleanupBlockImages
};
