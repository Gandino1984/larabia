// back-end/controllers/magazine_workshop/contest_entry_store.js
//
// The files of contest entries (models/contest_entry_model.js). They live in
// uploads/contest-entries (inside the uploads bind mount, so they survive
// rebuilds) but are NOT public: index.js answers 404 to that folder before
// the static route (proposal_store.isPrivateUploadPath), and only the entry's
// author and the contest's managers download them through the API.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import contest_entry_model from "../../models/contest_entry_model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ENTRIES_DIR = path.resolve(__dirname, "../../uploads/contest-entries");

// Texts and images (a photography or illustration contest).
export const ENTRY_EXTENSIONS = ['.pdf', '.doc', '.docx', '.odt', '.txt', '.rtf', '.jpg', '.jpeg', '.png', '.webp'];
export const ENTRY_MAX_MB = 10;

export function ensureEntriesDir() {
    fs.mkdirSync(ENTRIES_DIR, { recursive: true });
}

/** Absolute path of a stored file, or null if the name would leave the folder. */
export function entryPath(name) {
    if (!name) return null;
    const resolved = path.resolve(ENTRIES_DIR, name);
    return resolved.startsWith(ENTRIES_DIR + path.sep) ? resolved : null;
}

export function removeEntryFile(name) {
    const p = entryPath(name);
    if (p) fs.rmSync(p, { force: true });
}

/**
 * Remove entries with their files: someone's in a contest (withdrawn,
 * removed or blocked), a whole contest's, or everything of an account.
 */
export async function removeEntries(where) {
    const rows = await contest_entry_model.findAll({ where, attributes: ['id_entry', 'file_entry'] });
    rows.forEach((r) => removeEntryFile(r.file_entry));
    if (rows.length) await contest_entry_model.destroy({ where: { id_entry: rows.map((r) => r.id_entry) } });
    return rows.length;
}

/** When an account is deleted: its entries go with it (FK cascade), their files here. */
export async function removeEntryFilesOfUser(userId) {
    const rows = await contest_entry_model.findAll({ where: { user_id: userId }, attributes: ['file_entry'] });
    rows.forEach((r) => removeEntryFile(r.file_entry));
}
