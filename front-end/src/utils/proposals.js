// magazine-front/src/utils/proposals.js
//
// «Espacio abierto» proposals (back-end: /open-space/proposals): the kinds,
// the limits the server checks, the labels, and downloading the attached file
// (it isn't public, so it goes through the API with the user's header).
import axiosInstance from './axiosConfig';

export const PROPOSAL_KINDS = ['poesia', 'relato', 'microrrelato', 'cronica', 'ensayo', 'otro'];
export const PROPOSAL_LIMITS = { title: 150, summary: 600, text: 50000, fileMb: 5 };
export const PROPOSAL_FILE_ACCEPT = '.pdf,.doc,.docx,.odt,.txt,.rtf';

const KIND_DEFAULTS = {
  poesia: 'Poesía', relato: 'Relato', microrrelato: 'Microrrelato',
  cronica: 'Crónica', ensayo: 'Ensayo', otro: 'Otro'
};
export const proposalKindLabel = (kind, t) => t(`openspace.kind.${kind}`, KIND_DEFAULTS[kind] || kind);

// How the status reads to the person who sent it…
const STATUS_DEFAULTS = { new: 'Recibida', read: 'Leída', accepted: 'Aceptada', declined: 'No seleccionada' };
export const proposalStatusLabel = (status, t) => t(`openspace.status.${status}`, STATUS_DEFAULTS[status] || status);

// …and to the team.
const ADMIN_STATUS_DEFAULTS = { new: 'Nueva', read: 'Leída', accepted: 'Aceptada', declined: 'Descartada' };
export const proposalAdminStatusLabel = (status, t) => t(`admin.proposals.status.${status}`, ADMIN_STATUS_DEFAULTS[status] || status);

export async function downloadProposalFile(proposal, userId) {
  const res = await axiosInstance.get(`/open-space/proposals/${proposal.id_proposal}/file`, {
    headers: { 'x-user-id': userId },
    responseType: 'blob'
  });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = proposal.file_name_proposal || 'propuesta';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
