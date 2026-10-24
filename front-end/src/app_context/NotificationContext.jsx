// magazine-front/src/app_context/NotificationContext.jsx
//
// Foundation for the magazine's in-app notification/reminder system.
//
// Notifications are computed from app state into a list of
// { id, type, title, message, onClick, actions? } objects that the header
// bell + dropdown render generically, so new types can be added without
// touching consumers. `actions` = [{ key, label, variant, onClick }] buttons.
//
// Types implemented:
//  - profile:  users who can create content but have no author profile yet.
//  - article / project:  content published since the user last opened the bell.
//  - membership:  the reader's paid subscription became active (until seen).
//  - workshop-invite:  someone invited the reader to a workshop — with
//    Aceptar / Rechazar (`actions`); stays until answered.
//  - workshop-invite-response:  a reader answered an invitation this user
//    sent (until the bell is opened).
//  - workshop-spot-request:  a socio/a asks for an extra place in a full
//    workshop this user manages — «Abrir plaza» / «Rechazar»; until answered.
//  - workshop-spot-answer:  the answer to the user's own request (until the
//    bell is opened).
//  - author-invite:  a super admin signed the user up as an author
//    (AuthorInvitationContext) — Aceptar / Rechazar; stays until answered.
//  - gallery-invite:  invited to the Galería as a visual artist
//    (GalleryContext) — Aceptar / Rechazar; stays until answered.
//  - gallery-message:  a conversation of the Galería with unread messages —
//    for the artist, a visitor wrote; for the visitor, the artist answered.
//    Until it's opened.
//  - gallery-review:  the team approved or didn't publish one of the
//    artist's works (until the bell is opened).
//  - gallery-pending:  super admins — works waiting for review.
//
// "New content" notifications accumulate (persist as unread) until the user
// opens the bell — the last-seen timestamp is stored per user in localStorage,
// so unread items survive reloads and pile up over time.
import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../utils/axiosConfig';
import { useAuth } from './AuthContext';
import { useAuthor } from './AuthorContext';
import { useUI } from './UIContext';
import { useMagazine } from './MagazineContext';
import { useEngagement } from './EngagementContext';
import { useSubscription } from './SubscriptionContext';
import { useWorkshop } from './WorkshopContext';
import { useAuthorInvitation } from './AuthorInvitationContext';
import { useGallery } from './GalleryContext';
import { useMetadata } from './MetadataContext';
import { localDate, serverDate } from '../utils/locale';

const NotificationContext = createContext(null);
// A date from the API as a timestamp (read as UTC: serverDate), 0 if none.
const tsOf = (v) => serverDate(v)?.getTime() ?? 0;
const MAX_CONTENT_NOTIFS = 30;

export const NotificationProvider = ({ children }) => {
  const { t } = useTranslation();
  const { currentUser, canCreateContent } = useAuth();
  const { authorProfiles, fetchAllProfiles } = useAuthor();
  const { navigateToAuthorEditor, navigateToArticle, navigateToProjectDetail, navigateToWorkshopDetail, navigateToMyGallery, navigateToExhibition, navigateToAdmin } = useUI();
  const {
    invitationFeed, respondToWorkshopInvitation, markInvitationResponsesSeen, setSelectedWorkshop,
    respondExtraSpot, markSpotAnswersSeen
  } = useWorkshop();
  const { setSelectedArticle, setSelectedProject } = useMagazine();
  const { subscribedProjectIds } = useEngagement();
  const subscription = useSubscription();
  const membership = subscription?.mine;
  const authorInvite = useAuthorInvitation();
  const gallery = useGallery();
  const brand = useMetadata()?.metadata?.name || 'La Rabia';

  const [publishedArticles, setPublishedArticles] = useState([]);
  const [publishedProjects, setPublishedProjects] = useState([]);
  const [profilesReady, setProfilesReady] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);

  const seenKey = currentUser ? `larabia_notif_seen_${currentUser.id_user}` : null;
  // The membership notice has its own "seen" mark (the subscription it was
  // shown for), so every new subscriber sees it once — even if they opened the
  // bell between paying and the notice appearing.
  const membershipKey = currentUser ? `larabia_membership_seen_${currentUser.id_user}` : null;
  const [membershipSeen, setMembershipSeen] = useState(null);
  useEffect(() => {
    if (!membershipKey) { setMembershipSeen(null); return; }
    try { setMembershipSeen(localStorage.getItem(membershipKey)); } catch { setMembershipSeen(null); }
  }, [membershipKey]);

  // Initialise the last-seen mark. First ever load for a user is set to "now"
  // so they aren't flooded with the whole publication history.
  useEffect(() => {
    if (!seenKey) { setLastSeen(null); return; }
    try {
      const v = localStorage.getItem(seenKey);
      if (v) {
        setLastSeen(Number(v));
      } else {
        const now = Date.now();
        localStorage.setItem(seenKey, String(now));
        setLastSeen(now);
      }
    } catch {
      setLastSeen(Date.now());
    }
  }, [seenKey]);

  // Load published content (self-contained) + author profiles when logged in.
  useEffect(() => {
    if (!currentUser) {
      setPublishedArticles([]);
      setPublishedProjects([]);
      setProfilesReady(false);
      return;
    }
    let active = true;
    (async () => {
      const [aRes, pRes] = await Promise.allSettled([
        axiosInstance.get('/magazine-article'),
        axiosInstance.get('/magazine-project')
      ]);
      if (!active) return;
      if (aRes.status === 'fulfilled' && !aRes.value.data.error) setPublishedArticles(aRes.value.data.data || []);
      if (pRes.status === 'fulfilled' && !pRes.value.data.error) setPublishedProjects(pRes.value.data.data || []);
    })();
    if (canCreateContent) {
      setProfilesReady(false);
      Promise.resolve(fetchAllProfiles()).finally(() => { if (active) setProfilesReady(true); });
    }
    return () => { active = false; };
  }, [currentUser?.id_user, canCreateContent, fetchAllProfiles]);

  // Workshop invitations: open the workshop, or answer from the bell.
  const openWorkshop = useCallback((workshop) => {
    setSelectedWorkshop(workshop);
    navigateToWorkshopDetail();
  }, [setSelectedWorkshop, navigateToWorkshopDetail]);
  const answerInvitation = useCallback(async (invitation, response) => {
    if (response === 'decline'
      && !window.confirm(t('workshops.invitation.confirmDecline', '¿Rechazar la invitación? La plaza quedará libre para otra persona.'))) return;
    const res = await respondToWorkshopInvitation(invitation, response);
    // Accepting books a place: subscribers only (and the magazine team).
    if (res?.code === 'subscription_required') subscription?.openModal?.('workshops');
  }, [respondToWorkshopInvitation, subscription, t]);
  const shortDate = (d) => {
    if (!d) return null;
    const dt = serverDate(d);
    return dt ? localDate(dt, { day: 'numeric', month: 'short' }) : null;
  };

  // Mark every current notification as seen (called when the user opens/closes
  // the bell). Only affects the time-based content notifications and the
  // answers to the user's workshop invitations; the profile reminder and
  // pending invitations persist until acted on.
  const markAllSeen = useCallback(() => {
    const now = Date.now();
    if (seenKey) { try { localStorage.setItem(seenKey, String(now)); } catch { /* ignore */ } }
    setLastSeen(now);
    if (membershipKey && membership?.active && membership.since) {
      const mark = String(membership.since);
      try { localStorage.setItem(membershipKey, mark); } catch { /* ignore */ }
      setMembershipSeen(mark);
    }
    const answered = (invitationFeed?.responses || []).map(r => r.id_invitation);
    if (answered.length > 0) markInvitationResponsesSeen(answered);
    const spotAnswered = (invitationFeed?.spot_answers || []).map(a => a.id_spot_request);
    if (spotAnswered.length > 0) markSpotAnswersSeen(spotAnswered);
    gallery.markReviewsSeen();
  }, [seenKey, membershipKey, membership?.active, membership?.since, invitationFeed?.responses, invitationFeed?.spot_answers, markInvitationResponsesSeen, markSpotAnswersSeen, gallery]);

  const notifications = useMemo(() => {
    const list = [];

    // Reminder: complete your author profile.
    if (profilesReady && currentUser && canCreateContent) {
      const hasProfile = authorProfiles.some(p => p.user_id === currentUser.id_user);
      if (!hasProfile) {
        list.push({
          id: 'complete-author-profile',
          type: 'profile',
          title: t('notifications.completeProfile.title'),
          message: t('notifications.completeProfile.message'),
          onClick: () => navigateToAuthorEditor()
        });
      }
    }

    // Signed up as an author by a super admin, waiting for an answer.
    if (currentUser && authorInvite.invitation) {
      const inviter = authorInvite.invitation.inviter?.name_user;
      list.push({
        id: 'author-invite',
        type: 'author-invite',
        title: t('notifications.authorInvite.title', 'Te han dado de alta como autora o autor'),
        message: inviter
          ? t('notifications.authorInvite.message', { name: inviter, defaultValue: '{{name}} te invita a formar parte de Autoras/es.' })
          : t('notifications.authorInvite.messageNoName', 'Te invitan a formar parte de Autoras/es.'),
        onClick: () => authorInvite.openModal(),
        actions: [
          { key: 'accept', variant: 'primary', label: t('notifications.authorInvite.accept', 'Aceptar'), onClick: () => authorInvite.respond('accept') },
          {
            key: 'decline',
            variant: 'secondary',
            label: t('notifications.authorInvite.decline', 'Rechazar'),
            onClick: () => {
              if (window.confirm(t('authorInvitation.confirmDeclineShort', { brand, defaultValue: '¿Rechazar la invitación? Tu perfil de autora o autor dejará de mostrarse y tus publicaciones pasarán a firmarse como «{{brand}}».' }))) {
                authorInvite.respond('decline');
              }
            }
          }
        ]
      });
    }

    // Invited to the Galería as a visual artist, waiting for an answer.
    if (currentUser && gallery.invitation) {
      const inviter = gallery.invitation.inviter?.name_user;
      list.push({
        id: 'gallery-invite',
        type: 'gallery-invite',
        title: t('notifications.galleryInvite.title', 'Te invitan a exponer en la Galería'),
        message: inviter
          ? t('notifications.galleryInvite.message', { name: inviter, defaultValue: '{{name}} te invita a exponer tu obra como artista visual.' })
          : t('notifications.galleryInvite.messageNoName', 'Te invitan a exponer tu obra como artista visual.'),
        onClick: () => gallery.openInviteModal(),
        actions: [
          { key: 'accept', variant: 'primary', label: t('notifications.authorInvite.accept', 'Aceptar'), onClick: () => gallery.respond('accept') },
          { key: 'decline', variant: 'secondary', label: t('notifications.authorInvite.decline', 'Rechazar'), onClick: () => gallery.respond('decline') }
        ]
      });
    }

    // The Galería: unread messages (as artist or as visitor).
    if (currentUser) {
      for (const c of gallery.feed.messages || []) {
        const name = c.other?.name_user || '';
        const body = c.last_message?.body || '';
        list.push({
          id: `gallery-message-${c.id_conversation}-${c.last_message?.id_message || 0}`,
          type: 'gallery-message',
          title: c.role === 'artist'
            ? t('notifications.galleryMessage.title', { name, defaultValue: 'Mensaje de {{name}} en tu galería' })
            : t('notifications.galleryReply.title', { name, defaultValue: '{{name}} te ha respondido' }),
          message: body.length > 120 ? `${body.slice(0, 117)}…` : body,
          onClick: () => (c.role === 'artist'
            ? navigateToMyGallery({ tab: 'messages', conversationId: c.id_conversation })
            : c.exhibition && navigateToExhibition(c.exhibition.id_exhibition, { chat: true }))
        });
      }
      // The team's review of the artist's works.
      for (const w of gallery.feed.reviews || []) {
        const title = w.title_work || t('gallery.untitled', 'Sin título');
        const approved = w.status_work === 'approved';
        list.push({
          id: `gallery-review-${w.id_work}-${w.status_work}`,
          type: 'gallery-review',
          title: approved
            ? t('notifications.galleryApproved.title', 'Tu obra ya está en la galería')
            : t('notifications.galleryRejected.title', 'Una obra tuya no se ha publicado'),
          message: approved || !w.rejection_reason
            ? `«${title}»`
            : t('notifications.galleryRejected.message', { title, reason: w.rejection_reason, defaultValue: '«{{title}}»: {{reason}}' }),
          onClick: () => navigateToMyGallery()
        });
      }
      // Super admins: works waiting for review.
      if (gallery.feed.pending_review > 0) {
        list.push({
          id: `gallery-pending-${gallery.feed.pending_review}`,
          type: 'gallery-pending',
          title: t('notifications.galleryPending.title', { count: gallery.feed.pending_review }),
          message: t('notifications.galleryPending.message', 'Revísalas en Admin › Galería.'),
          onClick: () => navigateToAdmin('gallery')
        });
      }
    }

    // Invitations to a workshop, waiting for an answer.
    if (currentUser) {
      for (const inv of invitationFeed?.invitations || []) {
        const when = shortDate(inv.workshop?.date_workshop);
        const message = t('notifications.workshopInvite.message', {
          name: inv.inviter?.name_user || '',
          title: inv.workshop?.title_workshop || '',
          defaultValue: '{{name}} te invita a «{{title}}»'
        });
        list.push({
          id: `workshop-invite-${inv.id_invitation}`,
          type: 'workshop-invite',
          title: t('notifications.workshopInvite.title', 'Invitación a un taller'),
          message: when ? `${message} · ${when}` : message,
          onClick: () => openWorkshop(inv.workshop),
          actions: [
            { key: 'accept', variant: 'primary', label: t('notifications.workshopInvite.accept', 'Aceptar'), onClick: () => answerInvitation(inv, 'accept') },
            { key: 'decline', variant: 'secondary', label: t('notifications.workshopInvite.decline', 'Rechazar'), onClick: () => answerInvitation(inv, 'decline') }
          ]
        });
      }
    }

    // Socios/as asking for an extra place in a workshop this user manages.
    if (currentUser) {
      for (const r of invitationFeed?.spot_requests || []) {
        list.push({
          id: `workshop-spot-request-${r.id_spot_request}`,
          type: 'workshop-spot-request',
          title: t('notifications.spotRequest.title', 'Piden una plaza extra'),
          message: t('notifications.spotRequest.message', {
            name: r.requester?.name_user || '',
            title: r.workshop?.title_workshop || '',
            defaultValue: '{{name}} pide una plaza en «{{title}}», que está completo'
          }),
          onClick: () => openWorkshop(r.workshop),
          actions: [
            { key: 'accept', variant: 'primary', label: t('notifications.spotRequest.accept', 'Abrir plaza'), onClick: () => respondExtraSpot(r.workshop.id_workshop, r.requester.id_user, 'accept') },
            {
              key: 'decline', variant: 'secondary', label: t('notifications.spotRequest.decline', 'Rechazar'),
              onClick: () => {
                if (window.confirm(t('workshops.extra.confirmDecline', { name: r.requester?.name_user || '', defaultValue: '¿Rechazar la solicitud de {{name}}? No se abrirá ninguna plaza.' }))) {
                  respondExtraSpot(r.workshop.id_workshop, r.requester.id_user, 'decline');
                }
              }
            }
          ]
        });
      }
    }

    // New content published since the user last opened the bell.
    if (currentUser && lastSeen) {
      const content = [];
      const subs = new Set(subscribedProjectIds || []);
      const projectById = new Map(publishedProjects.map(p => [p.id_project, p]));

      for (const a of publishedArticles) {
        const ts = tsOf(a.date_published);
        if (ts <= lastSeen) continue;
        // Articles inside a followed project get a project-context notification
        // below instead of the generic one (avoids duplicates).
        if (a.project_id && subs.has(a.project_id)) continue;
        content.push({
          id: `article-${a.id_article}`,
          type: 'article',
          ts,
          title: t('notifications.newArticle.title'),
          message: a.title_article,
          onClick: () => { setSelectedArticle(a); navigateToArticle(); }
        });
      }
      for (const p of publishedProjects) {
        const ts = tsOf(p.date_published);
        if (ts > lastSeen) {
          content.push({
            id: `project-${p.id_project}`,
            type: 'project',
            ts,
            title: t('notifications.newProject.title'),
            message: p.title_project,
            onClick: () => { setSelectedProject(p); navigateToProjectDetail(); }
          });
        }
      }

      // Followed-project notifications: new content inside a followed project, and
      // updates to a followed project (edited after it was first published).
      for (const a of publishedArticles) {
        if (!a.project_id || !subs.has(a.project_id)) continue;
        const ts = tsOf(a.date_published);
        if (ts <= lastSeen) continue;
        const proj = projectById.get(a.project_id);
        content.push({
          id: `sub-article-${a.id_article}`,
          type: 'subscription',
          ts,
          title: t('notifications.projectNewContent.title'),
          message: proj ? `${proj.title_project}: ${a.title_article}` : a.title_article,
          onClick: () => { setSelectedArticle(a); navigateToArticle(); }
        });
      }
      for (const p of publishedProjects) {
        if (!subs.has(p.id_project)) continue;
        const publishedTs = tsOf(p.date_published);
        const updatedTs = tsOf(p.updated_at);
        // Only "updated" (not the initial publish, which is covered above).
        if (updatedTs > lastSeen && publishedTs <= lastSeen) {
          content.push({
            id: `sub-project-${p.id_project}-${updatedTs}`,
            type: 'subscription',
            ts: updatedTs,
            title: t('notifications.projectUpdated.title'),
            message: p.title_project,
            onClick: () => { setSelectedProject(p); navigateToProjectDetail(); }
          });
        }
      }

      // Paid subscription activated (shown until the bell is opened).
      if (membership?.active && membership.since) {
        const ts = tsOf(membership.since);
        if (membershipSeen !== String(membership.since)) {
          const renews = membership.current_period_end
            ? localDate(membership.current_period_end, { day: 'numeric', month: 'long', year: 'numeric' })
            : null;
          content.push({
            id: `membership-${ts}`,
            type: 'membership',
            ts,
            title: t('notifications.membership.title', 'Ya eres socio/a'),
            message: renews
              ? t('notifications.membership.messageRenews', { date: renews, defaultValue: 'Gracias por apoyar La Rabia. Próxima renovación: {{date}}' })
              : t('notifications.membership.message', 'Gracias por apoyar La Rabia.'),
            onClick: () => subscription?.openPortal?.()
          });
        }
      }

      // Answers to the workshop invitations this user sent.
      for (const r of invitationFeed?.responses || []) {
        const accepted = r.status === 'accepted';
        const vars = { name: r.invitee?.name_user || '', title: r.workshop?.title_workshop || '' };
        content.push({
          id: `workshop-invite-response-${r.id_invitation}`,
          type: 'workshop-invite-response',
          ts: r.responded_at ? tsOf(r.responded_at) : Date.now(),
          title: accepted
            ? t('notifications.workshopInviteAccepted.title', 'Invitación aceptada')
            : t('notifications.workshopInviteDeclined.title', 'Invitación rechazada'),
          message: accepted
            ? t('notifications.workshopInviteAccepted.message', { ...vars, defaultValue: '{{name}} ha aceptado tu invitación a «{{title}}» y tiene plaza.' })
            : t('notifications.workshopInviteDeclined.message', { ...vars, defaultValue: '{{name}} ha rechazado tu invitación a «{{title}}». Su plaza vuelve a estar libre.' }),
          onClick: () => openWorkshop(r.workshop)
        });
      }

      // Answers to this user's requests for an extra place.
      for (const a of invitationFeed?.spot_answers || []) {
        const accepted = a.status === 'accepted';
        const vars = { title: a.workshop?.title_workshop || '' };
        content.push({
          id: `workshop-spot-answer-${a.id_spot_request}`,
          type: 'workshop-spot-answer',
          ts: a.responded_at ? tsOf(a.responded_at) : Date.now(),
          title: accepted
            ? t('notifications.spotAccepted.title', 'Tienes plaza')
            : t('notifications.spotDeclined.title', 'Sin plaza extra'),
          message: accepted
            ? t('notifications.spotAccepted.message', { ...vars, defaultValue: 'Te han abierto una plaza en «{{title}}». ¡Nos vemos allí!' })
            : t('notifications.spotDeclined.message', { ...vars, defaultValue: 'No se ha podido abrir una plaza más en «{{title}}».' }),
          onClick: () => openWorkshop(a.workshop)
        });
      }

      content.sort((x, y) => y.ts - x.ts);
      list.push(...content.slice(0, MAX_CONTENT_NOTIFS));
    }

    return list;
  }, [
    profilesReady, currentUser, canCreateContent, authorProfiles, lastSeen,
    publishedArticles, publishedProjects, subscribedProjectIds, membership, subscription, membershipSeen,
    invitationFeed, openWorkshop, answerInvitation, respondExtraSpot, authorInvite, brand,
    gallery, navigateToMyGallery, navigateToExhibition, navigateToAdmin,
    navigateToAuthorEditor, navigateToArticle, navigateToProjectDetail,
    setSelectedArticle, setSelectedProject, t
  ]);

  const value = {
    notifications,
    count: notifications.length,
    markAllSeen
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationProvider');
  return ctx;
};

export default NotificationContext;
