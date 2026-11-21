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
//  - contest-review:  a super admin published or sent back a contest the
//    user created (until the bell is opened).
//  - author-invite:  a super admin signed the user up as an author
//    (AuthorInvitationContext) — Aceptar / Rechazar; stays until answered.
//  - gallery-invite:  invited to the Galería as a visual artist
//    (GalleryContext) — Aceptar / Rechazar; stays until answered.
//  - chat-request:  a socio/a asks the user (an author / artist) to chat
//    (ChatContext) — Aceptar / Rechazar; stays until answered.
//  - chat-answer:  the author accepted, declined or ended the user's chat
//    (until it's opened or the bell is).
//  - chat-message:  a chat with unread messages (until it's opened).
//  - gallery-review:  the team approved or didn't publish one of the
//    artist's works (until the bell is opened).
//  - gallery-pending:  super admins — works waiting for review.
//  - bug-report:  super admins — someone reported an error on the web
//    («Reportar un error»; PendingReviewContext, refreshed every minute);
//    until it's marked seen or fixed in Admin › Errores, which it opens.
//  - gallery-comment / gallery-like:  readers' new comments on the artist's
//    illustrations and likes on their illustrations and obras, one per
//    illustration / obra (GalleryContext feed.activity; until the bell is
//    opened). They open the exhibition there — the comments, for comments.
//
// "New content" notifications accumulate (persist as unread) until the user
// opens the bell — the last-seen timestamp is stored per user in localStorage,
// so unread items survive reloads and pile up over time.
//
// KEPT UNTIL DELETED (user request 2026-11-21: «las notificaciones deberían
// mantenerse hasta que el usuario decida borrarlas»): every informational
// notification (`keep: true` — new content, answers, reviews, comments,
// likes, chat news, reported errors) is copied to the server the first time
// it's seen (/notifications, back-end user_notification_model.js) with its
// texts as translation keys (`tx`: shown in the reader's language) and what
// it opens (`target`, see openTarget). Opening the bell marks them read; they
// stay, greyed, until the person deletes them («×» or «Borrar todas»). Ones
// that need an answer (invitations, requests) go when answered; the
// remaining ones without an answer (the profile reminder, counts) can be
// deleted too (hidden for good).
import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../utils/axiosConfig';
import { useAuth } from './AuthContext';
import { usePendingReview } from './PendingReviewContext';
import { useAuthor } from './AuthorContext';
import { useUI } from './UIContext';
import { useMagazine } from './MagazineContext';
import { useEngagement } from './EngagementContext';
import { useSubscription } from './SubscriptionContext';
import { useWorkshop } from './WorkshopContext';
import { useAuthorInvitation } from './AuthorInvitationContext';
import { useGallery } from './GalleryContext';
import { useChat } from './ChatContext';
import { useMetadata } from './MetadataContext';
import { localDate, serverDate } from '../utils/locale';

const NotificationContext = createContext(null);
// A date from the API as a timestamp (read as UTC: serverDate), 0 if none.
const tsOf = (v) => serverDate(v)?.getTime() ?? 0;
const MAX_CONTENT_NOTIFS = 30;
// A text to show again later: a translation key (+ values) — in the reader's
// language whenever it's shown — or plain text (a title, a comment).
const tx = (k, o) => (o ? { k, o } : { k });

export const NotificationProvider = ({ children }) => {
  const { t } = useTranslation();
  const { currentUser, canHaveAuthorProfile } = useAuth();
  const { authorProfiles, fetchAllProfiles } = useAuthor();
  const { navigateToAuthorEditor, navigateToArticle, navigateToProjectDetail, navigateToWorkshopDetail, navigateToMyGallery, navigateToExhibition, navigateToAdmin, navigateToWorkshopEditor } = useUI();
  const {
    invitationFeed, respondToWorkshopInvitation, markInvitationResponsesSeen, setSelectedWorkshop,
    respondExtraSpot, markSpotAnswersSeen, markContestReviewsSeen, fetchWorkshopById
  } = useWorkshop();
  const { newReports, latestReports } = usePendingReview();
  const { setSelectedArticle, setSelectedProject, fetchArticleById } = useMagazine();
  const { subscribedProjectIds } = useEngagement();
  const subscription = useSubscription();
  const membership = subscription?.mine;
  const authorInvite = useAuthorInvitation();
  const gallery = useGallery();
  const chat = useChat();
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
    if (canHaveAuthorProfile) {
      setProfilesReady(false);
      Promise.resolve(fetchAllProfiles()).finally(() => { if (active) setProfilesReady(true); });
    }
    return () => { active = false; };
  }, [currentUser?.id_user, canHaveAuthorProfile, fetchAllProfiles]);

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

  // ── Kept notifications (the server's copy: /notifications) ──
  const [inbox, setInbox] = useState({ items: [], dismissed: [] });
  const sentKeys = useRef(new Set());
  const liveKeepRef = useRef([]);
  const userHeaders = useMemo(() => (currentUser?.id_user ? { headers: { 'x-user-id': currentUser.id_user } } : null), [currentUser?.id_user]);
  const loadInbox = useCallback(async () => {
    if (!userHeaders) { setInbox({ items: [], dismissed: [] }); return; }
    try {
      const res = await axiosInstance.get('/notifications', userHeaders);
      setInbox(res.data.data || { items: [], dismissed: [] });
    } catch { /* keep what's shown */ }
  }, [userHeaders]);
  useEffect(() => {
    sentKeys.current = new Set();
    loadInbox();
    // Another device may have read or deleted some.
    window.addEventListener('focus', loadInbox);
    return () => window.removeEventListener('focus', loadInbox);
  }, [loadInbox]);
  // Saves the ones not kept yet (once each per session); the answer is the whole list.
  const saveToInbox = useCallback(async (items) => {
    if (!userHeaders) return;
    const fresh = items.filter((n) => !sentKeys.current.has(n.id));
    if (fresh.length === 0) return;
    fresh.forEach((n) => sentKeys.current.add(n.id));
    try {
      const res = await axiosInstance.post('/notifications/sync', {
        items: fresh.map((n) => ({
          key: n.id,
          type: n.type,
          payload: { title: n.title, message: n.message, target: n.target || null },
          event_at: new Date(n.ts || Date.now()).toISOString()
        }))
      }, userHeaders);
      setInbox(res.data.data);
    } catch {
      fresh.forEach((n) => sentKeys.current.delete(n.id));
    }
  }, [userHeaders]);
  const markInboxRead = useCallback(async () => {
    if (!userHeaders) return;
    await saveToInbox(liveKeepRef.current);
    try {
      const res = await axiosInstance.post('/notifications/read', {}, userHeaders);
      setInbox(res.data.data);
    } catch { /* stays unread */ }
  }, [userHeaders, saveToInbox]);
  const dismiss = useCallback(async (key) => {
    if (!userHeaders) return;
    // Gone from the list at once.
    setInbox((b) => ({ items: b.items.filter((i) => i.key !== key), dismissed: [...b.dismissed, key] }));
    try {
      const res = await axiosInstance.delete(`/notifications/${encodeURIComponent(key)}`, userHeaders);
      setInbox(res.data.data);
    } catch { loadInbox(); }
  }, [userHeaders, loadInbox]);

  // What a kept notification opens (its `target`).
  const openTarget = useCallback(async (target) => {
    if (!target) return;
    switch (target.kind) {
      case 'article': {
        const r = await fetchArticleById(target.id);
        if (r?.success) navigateToArticle();
        break;
      }
      case 'project': {
        try {
          const res = await axiosInstance.get(`/magazine-project/by-id/${target.id}`, userHeaders || {});
          if (res.data?.data) { setSelectedProject(res.data.data); navigateToProjectDetail(); }
        } catch { /* it isn't there any more */ }
        break;
      }
      case 'workshop':
      case 'workshop-edit': {
        const r = await fetchWorkshopById(target.id);
        if (!r?.success) break;
        if (target.kind === 'workshop') navigateToWorkshopDetail();
        else navigateToWorkshopEditor(r.data, 'talleres');
        break;
      }
      case 'my-gallery': navigateToMyGallery(); break;
      case 'exhibition': navigateToExhibition(target.id, { work: target.work ?? null, piece: target.piece ?? null, comments: !!target.comments }); break;
      case 'admin': navigateToAdmin(target.tab); break;
      case 'chat': chat?.openChats(target.id); break;
      case 'membership': subscription?.openPortal?.(); break;
      case 'author-editor': navigateToAuthorEditor(); break;
      default: break;
    }
  }, [fetchArticleById, navigateToArticle, userHeaders, setSelectedProject, navigateToProjectDetail, fetchWorkshopById, navigateToWorkshopDetail, navigateToWorkshopEditor, navigateToMyGallery, navigateToExhibition, navigateToAdmin, chat, subscription, navigateToAuthorEditor]);

  // Mark every current notification as seen (called when the user opens/closes
  // the bell). Only affects the time-based content notifications and the
  // answers to the user's workshop invitations; the profile reminder and
  // pending invitations persist until acted on.
  const markAllSeen = useCallback(() => {
    // The kept ones: those on screen now saved first, then all read.
    markInboxRead();
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
    const reviewed = (invitationFeed?.contest_reviews || []).map(r => r.id_workshop);
    if (reviewed.length > 0) markContestReviewsSeen(reviewed);
    gallery.markReviewsSeen();
    gallery.markActivitySeen();
    if (chat?.conversations.some((c) => c.unseen_change)) chat.markSeen();
  }, [seenKey, membershipKey, membership?.active, membership?.since, invitationFeed?.responses, invitationFeed?.spot_answers, invitationFeed?.contest_reviews, markInvitationResponsesSeen, markSpotAnswersSeen, markContestReviewsSeen, gallery, chat, markInboxRead]);

  const notifications = useMemo(() => {
    const list = [];

    // Reminder: complete your author profile.
    if (profilesReady && currentUser && canHaveAuthorProfile) {
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
    // With a gallery a super admin prepared for them.
    if (currentUser && gallery.invitation) {
      const inviter = gallery.invitation.inviter?.name_user;
      const prepared = !!gallery.invitation.gallery;
      list.push({
        id: 'gallery-invite',
        type: 'gallery-invite',
        title: prepared
          ? t('notifications.galleryInvite.preparedTitle', 'Te han preparado una galería')
          : t('notifications.galleryInvite.title', 'Te invitan a exponer en la Galería'),
        message: prepared
          ? (inviter
            ? t('notifications.galleryInvite.preparedMessage', { name: inviter, defaultValue: '{{name}} te ha preparado una galería: acéptala para gestionarla tú.' })
            : t('notifications.galleryInvite.preparedMessageNoName', 'Te han preparado una galería: acéptala para gestionarla tú.'))
          : inviter
            ? t('notifications.galleryInvite.message', { name: inviter, defaultValue: '{{name}} te invita a exponer tu obra como artista visual.' })
            : t('notifications.galleryInvite.messageNoName', 'Te invitan a exponer tu obra como artista visual.'),
        onClick: () => gallery.openInviteModal(),
        actions: [
          { key: 'accept', variant: 'primary', label: t('notifications.authorInvite.accept', 'Aceptar'), onClick: () => gallery.respond('accept') },
          { key: 'decline', variant: 'secondary', label: t('notifications.authorInvite.decline', 'Rechazar'), onClick: () => gallery.respond('decline') }
        ]
      });
    }

    // The chat: requests to answer (the author), the author's answers not
    // seen yet (the member), unread messages (both). Each opens the chat.
    if (currentUser && chat) {
      for (const c of chat.conversations) {
        const name = c.other?.name_user || '';
        const open = () => chat.openChats(c.id_conversation);
        if (c.role === 'host' && c.status === 'requested') {
          list.push({
            id: `chat-request-${c.id_conversation}-${c.requested_at}`,
            type: 'chat-request',
            title: t('notifications.chatRequest.title', { name, defaultValue: '{{name}} quiere charlar contigo' }),
            message: c.origin === 'gallery'
              ? t('notifications.chatRequest.fromGallery', 'Te lo pide desde tu exposición en la Galería.')
              : t('notifications.chatRequest.fromAuthors', 'Te lo pide desde tu tarjeta de autora o autor.'),
            onClick: open,
            actions: [
              { key: 'accept', variant: 'primary', label: t('chat.accept', 'Aceptar'), onClick: () => chat.respond(c.id_conversation, 'accept') },
              { key: 'decline', variant: 'secondary', label: t('chat.decline', 'Rechazar'), onClick: () => chat.respond(c.id_conversation, 'decline') }
            ]
          });
        }
        if (c.unseen_change) {
          const vars = { name };
          list.push({
            id: `chat-answer-${c.id_conversation}-${c.status}-${tsOf(c.changed_at)}`,
            type: 'chat-answer',
            keep: true,
            ts: tsOf(c.changed_at),
            target: { kind: 'chat', id: c.id_conversation },
            title: c.status === 'active'
              ? tx('notifications.chatAccepted.title', vars)
              : c.status === 'declined'
                ? tx('notifications.chatDeclined.title', vars)
                : tx('notifications.chatEnded.title', vars),
            message: c.status === 'active'
              ? tx('notifications.chatAccepted.message')
              : c.status === 'declined'
                ? tx('notifications.chatDeclined.message')
                : tx('notifications.chatEnded.message'),
            onClick: () => { chat.markSeen([c.id_conversation]); open(); }
          });
        }
        if (c.unread > 0) {
          const body = c.last_message?.body || '';
          list.push({
            id: `chat-message-${c.id_conversation}-${c.last_message?.id_message || 0}`,
            type: 'chat-message',
            keep: true,
            ts: tsOf(c.last_message?.created_at),
            target: { kind: 'chat', id: c.id_conversation },
            title: tx('notifications.chatMessage.title', { name }),
            message: body.length > 120 ? `${body.slice(0, 117)}…` : body,
            onClick: open
          });
        }
      }
    }

    // The Galería.
    if (currentUser) {
      // The team's review of the artist's works.
      for (const w of gallery.feed.reviews || []) {
        const title = w.title_work || t('gallery.untitled', 'Sin título');
        const approved = w.status_work === 'approved';
        list.push({
          id: `gallery-review-${w.id_work}-${w.status_work}`,
          type: 'gallery-review',
          keep: true,
          ts: tsOf(w.reviewed_at || w.updated_at),
          target: { kind: 'my-gallery' },
          title: approved
            ? tx('notifications.galleryApproved.title')
            : tx('notifications.galleryRejected.title'),
          message: approved || !w.rejection_reason
            ? `«${title}»`
            : tx('notifications.galleryRejected.message', { title, reason: w.rejection_reason }),
          onClick: () => navigateToMyGallery()
        });
      }
      // Readers' new comments and likes on the artist's exhibition.
      const activity = gallery.feed.activity;
      for (const a of activity?.items || []) {
        const title = a.title || t('gallery.untitled', 'Sin título');
        const name = a.last_name || t('notifications.someone', 'Alguien');
        if (a.kind === 'comment') {
          list.push({
            id: `gallery-comment-${a.target_id}-${a.ids[0]}`,
            type: 'gallery-comment',
            keep: true,
            ts: tsOf(a.last_at),
            target: { kind: 'exhibition', id: activity.exhibition_id, work: a.target_id, comments: true },
            title: tx('notifications.galleryComment.title', { count: a.count, name, title }),
            message: tx('notifications.galleryComment.message', { name, text: a.last_text }),
            onClick: () => navigateToExhibition(activity.exhibition_id, { work: a.target_id, comments: true })
          });
        } else {
          const piece = a.kind === 'piece-like';
          list.push({
            id: `gallery-like-${a.kind}-${a.target_id}-${a.ids[0]}`,
            type: 'gallery-like',
            keep: true,
            ts: tsOf(a.last_at),
            target: { kind: 'exhibition', id: activity.exhibition_id, ...(piece ? { piece: a.target_id } : { work: a.target_id }) },
            title: tx('notifications.galleryLike.title', { count: a.count, name, title }),
            message: piece ? tx('notifications.galleryLike.piece') : tx('notifications.galleryLike.work'),
            onClick: () => navigateToExhibition(activity.exhibition_id, piece ? { piece: a.target_id } : { work: a.target_id })
          });
        }
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

    // Super admins: errors people reported, not looked at yet — the latest
    // ones each on its own, and how many more there are.
    if (currentUser && newReports > 0) {
      for (const r of latestReports) {
        const excerpt = r.description_report.length > 120 ? `${r.description_report.slice(0, 117)}…` : r.description_report;
        list.push({
          id: `bug-report-${r.id_report}`,
          type: 'bug-report',
          keep: true,
          ts: tsOf(r.created_at),
          target: { kind: 'admin', tab: 'reports' },
          title: r.user?.name_user
            ? tx('notifications.bugReport.title', { name: r.user.name_user })
            : tx('notifications.bugReport.titleSomeone'),
          message: `«${excerpt}»`,
          onClick: () => navigateToAdmin('reports')
        });
      }
      if (newReports > latestReports.length) {
        list.push({
          id: `bug-report-more-${newReports}`,
          type: 'bug-report',
          title: t('notifications.bugReportMore.title', { count: newReports - latestReports.length }),
          message: t('notifications.bugReportMore.message', 'Míralos en Admin › Errores.'),
          onClick: () => navigateToAdmin('reports')
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
          keep: true,
          target: { kind: 'article', id: a.id_article },
          ts,
          title: tx('notifications.newArticle.title'),
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
            keep: true,
            target: { kind: 'project', id: p.id_project },
            ts,
            title: tx('notifications.newProject.title'),
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
          keep: true,
          target: { kind: 'article', id: a.id_article },
          ts,
          title: tx('notifications.projectNewContent.title'),
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
            keep: true,
            target: { kind: 'project', id: p.id_project },
            ts: updatedTs,
            title: tx('notifications.projectUpdated.title'),
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
            keep: true,
            target: { kind: 'membership' },
            ts,
            title: tx('notifications.membership.title'),
            message: renews
              ? tx('notifications.membership.messageRenews', { date: renews })
              : tx('notifications.membership.message'),
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
          keep: true,
          target: { kind: 'workshop', id: r.workshop?.id_workshop },
          ts: r.responded_at ? tsOf(r.responded_at) : Date.now(),
          title: accepted ? tx('notifications.workshopInviteAccepted.title') : tx('notifications.workshopInviteDeclined.title'),
          message: accepted
            ? tx('notifications.workshopInviteAccepted.message', vars)
            : tx('notifications.workshopInviteDeclined.message', vars),
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
          keep: true,
          target: { kind: 'workshop', id: a.workshop?.id_workshop },
          ts: a.responded_at ? tsOf(a.responded_at) : Date.now(),
          title: accepted ? tx('notifications.spotAccepted.title') : tx('notifications.spotDeclined.title'),
          message: accepted ? tx('notifications.spotAccepted.message', vars) : tx('notifications.spotDeclined.message', vars),
          onClick: () => openWorkshop(a.workshop)
        });
      }

      // A super admin's decision on a contest this user created: published
      // (opens it) or sent back (opens it in the editor, with the reason).
      for (const r of invitationFeed?.contest_reviews || []) {
        const approved = r.review_status_workshop === 'approved';
        const title = r.title_workshop || '';
        content.push({
          id: `contest-review-${r.id_workshop}-${r.review_status_workshop}`,
          type: 'contest-review',
          keep: true,
          target: { kind: approved ? 'workshop' : 'workshop-edit', id: r.id_workshop },
          ts: r.updated_at ? tsOf(r.updated_at) : Date.now(),
          title: approved ? tx('notifications.contestApproved.title') : tx('notifications.contestRejected.title'),
          message: approved || !r.rejection_reason_workshop
            ? `«${title}»`
            : tx('notifications.contestRejected.message', { title, reason: r.rejection_reason_workshop }),
          onClick: () => (approved ? openWorkshop(r) : navigateToWorkshopEditor(r, 'talleres'))
        });
      }

      content.sort((x, y) => y.ts - x.ts);
      list.push(...content.slice(0, MAX_CONTENT_NOTIFS));
    }

    return list;
  }, [
    profilesReady, currentUser, canHaveAuthorProfile, authorProfiles, lastSeen,
    publishedArticles, publishedProjects, subscribedProjectIds, membership, subscription, membershipSeen,
    invitationFeed, openWorkshop, answerInvitation, respondExtraSpot, authorInvite, brand,
    gallery, chat, navigateToMyGallery, navigateToExhibition, navigateToAdmin, navigateToWorkshopEditor,
    newReports, latestReports,
    navigateToAuthorEditor, navigateToArticle, navigateToProjectDetail,
    setSelectedArticle, setSelectedProject, t
  ]);

  // The live informational ones are kept as soon as they show up.
  const liveKeep = useMemo(() => notifications.filter((n) => n.keep), [notifications]);
  liveKeepRef.current = liveKeep;
  useEffect(() => { saveToInbox(liveKeep); }, [liveKeep, saveToInbox]);

  // What the bell shows: first what's waiting for an answer (and reminders),
  // then everything kept, newest first — the not-yet-saved ones as unread.
  const say = useCallback((x) => (x && typeof x === 'object' && x.k ? t(x.k, x.o) : (x ?? '')), [t]);
  const shown = useMemo(() => {
    const dismissed = new Set(inbox.dismissed);
    const keptKeys = new Set(inbox.items.map((i) => i.key));
    const live = notifications
      .filter((n) => !n.keep && !dismissed.has(n.id))
      .map((n) => ({ ...n, title: say(n.title), message: say(n.message), read: false, deletable: !n.actions }));
    const pending = notifications
      .filter((n) => n.keep && !keptKeys.has(n.id) && !dismissed.has(n.id))
      .map((n) => ({ ...n, title: say(n.title), message: say(n.message), read: false, deletable: true }));
    const kept = inbox.items.map((i) => ({
      id: i.key,
      type: i.type,
      ts: tsOf(i.event_at),
      title: say(i.payload?.title),
      message: say(i.payload?.message),
      onClick: () => openTarget(i.payload?.target),
      read: i.read,
      deletable: true
    }));
    const dated = [...pending, ...kept].sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return [...live, ...dated];
  }, [notifications, inbox, say, openTarget]);
  const unread = shown.filter((n) => !n.read).length;

  // «Borrar todas»: the kept ones and the reminders shown (not what's waiting for an answer).
  const clearAll = useCallback(async () => {
    if (!userHeaders) return;
    const keys = shown.filter((n) => n.deletable && !n.keep && !inbox.items.some((i) => i.key === n.id)).map((n) => n.id);
    const pendingKeys = shown.filter((n) => n.keep && !inbox.items.some((i) => i.key === n.id)).map((n) => n.id);
    setInbox((b) => ({ items: [], dismissed: [...b.dismissed, ...b.items.map((i) => i.key), ...keys, ...pendingKeys] }));
    try {
      const res = await axiosInstance.post('/notifications/clear', { keys: [...keys, ...pendingKeys] }, userHeaders);
      setInbox(res.data.data);
    } catch { loadInbox(); }
  }, [userHeaders, shown, inbox.items, loadInbox]);

  const value = {
    notifications: shown,
    count: unread,
    unread,
    markAllSeen,
    dismiss,
    clearAll
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
