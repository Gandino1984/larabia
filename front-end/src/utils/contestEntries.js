// magazine-front/src/utils/contestEntries.js
//
// Contest entries (back-end: /magazine-workshop/contests/:id/entry…): the
// limits the server checks and downloading an entry's file (it isn't public:
// it goes through the API with the user's header — its author and the
// contest's managers).
import axiosInstance from './axiosConfig';

export const ENTRY_LIMITS = { title: 150, note: 600, text: 50000, fileMb: 10 };
export const ENTRY_FILE_ACCEPT = '.pdf,.doc,.docx,.odt,.txt,.rtf,.jpg,.jpeg,.png,.webp';

export async function downloadEntryFile(contestId, entry, userId) {
  const res = await axiosInstance.get(`/magazine-workshop/contests/${contestId}/entries/${entry.id_entry}/file`, {
    headers: { 'x-user-id': userId },
    responseType: 'blob'
  });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = entry.file_name_entry || 'obra';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
