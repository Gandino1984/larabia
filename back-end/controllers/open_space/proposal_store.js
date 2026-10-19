// back-end/controllers/open_space/proposal_store.js
//
// Files attached to «Espacio abierto» proposals. They live in
// uploads/proposals (inside the uploads bind mount, so they survive rebuilds)
// but are NOT public: index.js answers 404 to /uploads/proposals before the
// static route, and only the team or the sender download them through the API.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import open_space_proposal_model from "../../models/open_space_proposal_model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PROPOSALS_DIR = path.resolve(__dirname, "../../uploads/proposals");

export const FILE_EXTENSIONS = ['.pdf', '.doc', '.docx', '.odt', '.txt', '.rtf'];
export const FILE_MAX_MB = 10;

export function ensureDir() {
    fs.mkdirSync(PROPOSALS_DIR, { recursive: true });
}

/**
 * Whether a path under /uploads points into the proposals folder. Checked on
 * the path as express.static will read it (decoded and normalised), so
 * «/%70roposals/…», «//proposals/…» or «/x/../proposals/…» are caught too.
 */
export function isPrivateUploadPath(reqPath) {
    let p;
    try {
        p = path.posix.normalize(decodeURIComponent(reqPath));
    } catch {
        return true; // malformed: let it be refused
    }
    const first = p.replace(/^\/+/, '').split('/')[0].toLowerCase();
    return first === 'proposals';
}

/** Absolute path of a stored file, or null if the name would leave the folder. */
export function storedPath(name) {
    if (!name) return null;
    const resolved = path.resolve(PROPOSALS_DIR, name);
    return resolved.startsWith(PROPOSALS_DIR + path.sep) ? resolved : null;
}

export function removeFile(name) {
    const p = storedPath(name);
    if (p) fs.rmSync(p, { force: true });
}

/** When an account is deleted: its proposals go with it (FK cascade), their files here. */
export async function removeFilesOfUser(userId) {
    const rows = await open_space_proposal_model.findAll({
        where: { user_id: userId },
        attributes: ['file_proposal']
    });
    rows.forEach((r) => removeFile(r.file_proposal));
}
