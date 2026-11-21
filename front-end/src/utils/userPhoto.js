// magazine-front/src/utils/userPhoto.js
//
// A person's photo — the same everywhere: `image_user`, which the server
// keeps as the one they chose (back-end utils/userPhoto.js): their Google
// picture (a URL), their author profile's photo ('/uploads/author-profiles/…')
// or one uploaded on their profile card (their name: /user/image/<name>).
const apiUrl = import.meta.env.VITE_API_URL || 'https://api.larabiamag.com';

/** The URL of an image_user value (null if there's none). `bust`: a cache-busting stamp. */
export function userPhotoUrl(img, bust) {
  if (!img) return null;
  if (/^(https?:|data:|blob:)/.test(img)) return img;
  const url = img.startsWith('/')
    ? `${apiUrl}${img.split('/').map((s) => encodeURIComponent(s)).join('/')}`
    : `${apiUrl}/user/image/${encodeURIComponent(img)}`;
  return bust ? `${url}${url.includes('?') ? '&' : '?'}_t=${bust}` : url;
}

/** An author profile's own photo file → its URL. */
export const profilePhotoUrl = (file) => (file ? `${apiUrl}/uploads/author-profiles/${encodeURIComponent(file)}` : null);

/** The photo shown for a person with an author profile: the one they chose, else the profile's. */
export const personPhotoUrl = (user, profileImage) => userPhotoUrl(user?.image_user) || profilePhotoUrl(profileImage);
