// back-end/utils/userPhoto.js
//
// One photo per person, the same everywhere (header, profile card, author
// pages, bylines, comments, chat…): `user.image_user`. It's one of:
//   'google'    their Google account's picture (google_picture_user,
//               refreshed at every Google sign-in);
//   'magazine'  their author profile's photo (author_profiles.profile_image)
//               — authors and artists;
//   'own'       the one they uploaded on their profile card
//               (uploads/user-profiles/<name>/profile.*).
// Their choice (photo_choice_user) — or, with no choice made or the chosen
// one missing, the first that exists of: magazine, own, google (the magazine
// photo first: it's what readers already saw on the author pages). Uploading
// a new photo makes it the chosen one.
//
// image_user keeps the result in the forms every reader of it understands: a
// Google URL, '/uploads/author-profiles/<file>' or the user's name (the
// /user/image/:name convention). Migration 039.
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import user_model from "../models/user_model.js";
import author_profile_model from "../models/author_profile_model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_PROFILES_DIR = path.resolve(__dirname, "../uploads/user-profiles");

export const PHOTO_CHOICES = ["google", "magazine", "own"];
const AUTO_ORDER = ["magazine", "own", "google"];

const isUrl = (v) => /^https?:\/\//i.test(String(v || ""));

/** Did this person upload a photo on their profile card? (its folder is named after them) */
async function hasOwnPhoto(name) {
    if (!name) return false;
    const dir = path.join(USER_PROFILES_DIR, name);
    if (!dir.startsWith(USER_PROFILES_DIR + path.sep)) return false;
    try {
        return (await fs.readdir(dir)).some((f) => f.startsWith("profile."));
    } catch {
        return false;
    }
}

/** The photos this person has: { google, magazine, own } (each its image_user value, or null). */
export async function photoOptions(user) {
    const profile = await author_profile_model.findOne({ where: { user_id: user.id_user }, attributes: ["profile_image"] });
    return {
        google: user.google_picture_user || (isUrl(user.image_user) ? user.image_user : null),
        magazine: profile?.profile_image ? `/uploads/author-profiles/${profile.profile_image}` : null,
        own: (await hasOwnPhoto(user.name_user)) ? user.name_user : null,
        has_profile: !!profile
    };
}

/** Which photo is used: { source, value }. */
export function resolvePhoto(choice, options) {
    const order = PHOTO_CHOICES.includes(choice) ? [choice, ...AUTO_ORDER.filter((c) => c !== choice)] : AUTO_ORDER;
    const source = order.find((c) => options[c]) || null;
    return { source, value: source ? options[source] : null };
}

/**
 * Brings image_user in line with the person's photos and choice. `extra`:
 * fields to save first (a new Google picture, a new choice). Returns the
 * user (updated) or null.
 */
export async function syncUserPhoto(userOrId, extra = {}) {
    const user = typeof userOrId === "object" && userOrId?.update ? userOrId : await user_model.findByPk(userOrId);
    if (!user) return null;
    if (Object.keys(extra).length) await user.update(extra);
    const { value } = resolvePhoto(user.photo_choice_user, await photoOptions(user));
    if ((value || null) !== (user.image_user || null)) await user.update({ image_user: value });
    return user;
}
