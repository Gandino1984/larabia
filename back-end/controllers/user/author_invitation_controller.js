// back-end/controllers/user/author_invitation_controller.js
//
// Authors a super admin signs up in «Autoras/es» for people who have no
// account yet (or are only readers). Until they answer, the super admin can
// already write their profile and credit them on publications. When they
// sign in with that email they accept (→ editora) or decline: declining
// hides their author profile, and the publications that credited them pass
// to the magazine — signed «La Rabia» when nobody else signs them.
//
// A new account is a Google account without a password, so the first
// Google sign-in with that email links to it (google_oauth_controller.js).
//
// user.author_invite_status: null (never invited) | 'pending' | 'accepted' | 'declined'
import user_model from "../../models/user_model.js";
import author_profile_model from "../../models/author_profile_model.js";
import article_author_model from "../../models/article_author_model.js";
import project_author_model from "../../models/project_author_model.js";
import workshop_author_model from "../../models/workshop_author_model.js";
import magazine_article_model from "../../models/magazine_article_model.js";
import magazine_project_model from "../../models/magazine_project_model.js";
import magazine_workshop_model from "../../models/magazine_workshop_model.js";
import magazine_metadata_model from "../../models/magazine_metadata_model.js";
import { getRequestUser, roleSnapshot, requireSuperAdmin } from "../../utils/authHelper.js";
import { sanitizeUserData } from "./google_oauth_controller.js";
import { sendAuthorInvitationEmail } from "../../services/emailService.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cleanName = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');
const cleanEmail = (value) => String(value ?? '').trim().toLowerCase();

function checkEmail(email) {
    return emailRegex.test(email) && email.length <= 255;
}

// What a super admin sees of an invited author.
function invitationOf(user) {
    return {
        id_user: user.id_user,
        name_user: user.name_user,
        email_user: user.email_user,
        image_user: user.image_user,
        author_invite_status: user.author_invite_status,
        author_invited_at: user.author_invited_at,
        // Signed in at least once: the address is theirs, it can't be corrected.
        has_signed_in: !!(user.google_id || user.pass_user)
    };
}

// Where someone is credited: the authors table of each kind of publication,
// plus its legacy primary author (author_id / author_name).
const CREDITS = [
    { junction: article_author_model, fk: 'article_id', model: magazine_article_model, pk: 'id_article' },
    { junction: project_author_model, fk: 'project_id', model: magazine_project_model, pk: 'id_project' },
    { junction: workshop_author_model, fk: 'workshop_id', model: magazine_workshop_model, pk: 'id_workshop' }
];

/**
 * Someone declined: their credits go away. A publication still signed by
 * others keeps those; one nobody else signs is signed by the magazine.
 */
async function passCreditsToMagazine(user) {
    const meta = await magazine_metadata_model.findByPk(1).catch(() => null);
    const brand = meta?.name || 'La Rabia';
    for (const { junction, fk, model, pk } of CREDITS) {
        const credited = await junction.findAll({ where: { user_id: user.id_user }, attributes: [fk] });
        const primary = await model.findAll({ where: { author_id: user.id_user }, attributes: [pk] });
        const ids = [...new Set([...credited.map((r) => r[fk]), ...primary.map((r) => r[pk])])];
        if (ids.length === 0) continue;
        await junction.destroy({ where: { user_id: user.id_user } });
        for (const id of ids) {
            const record = await model.findByPk(id, { attributes: [pk, 'author_id'] });
            if (!record) continue;
            const next = await junction.findOne({ where: { [fk]: id }, order: [['author_order', 'ASC']] });
            if (!next) {
                await record.update({ author_id: null, author_name: brand });
            } else if (record.author_id === user.id_user || record.author_id === null) {
                const nextUser = await user_model.findByPk(next.user_id, { attributes: ['id_user', 'name_user'] });
                await record.update({ author_id: next.user_id, author_name: nextUser?.name_user || null });
            }
        }
    }
}

async function sendInvitation(user, inviter) {
    return sendAuthorInvitationEmail(user.email_user, user.name_user, inviter?.name_user);
}

/**
 * POST /user/invite-author  { name, email }  — super admins.
 * 409 + code: 'already_team' (already an editora or above), 'already_invited',
 * 'name_taken' (another account has that name).
 */
async function invite(req, res) {
    try {
        const admin = await requireSuperAdmin(req, res);
        if (!admin) return;

        const name = cleanName(req.body?.name);
        const email = cleanEmail(req.body?.email);
        if (name.length < 2 || name.length > 100) {
            return res.status(400).json({ error: 'El nombre debe tener entre 2 y 100 caracteres', code: 'invalid_name' });
        }
        if (!checkEmail(email)) {
            return res.status(400).json({ error: 'El email no es válido', code: 'invalid_email' });
        }

        let user = await user_model.findOne({ where: { email_user: email } });
        if (user) {
            if (roleSnapshot(user).canCreateContent) {
                return res.status(409).json({
                    error: `${user.name_user} ya forma parte del equipo de la revista`,
                    code: 'already_team',
                    data: invitationOf(user)
                });
            }
            if (user.author_invite_status === 'pending') {
                return res.status(409).json({
                    error: `${user.name_user} ya tiene una invitación pendiente`,
                    code: 'already_invited',
                    data: invitationOf(user)
                });
            }
            // A reader, or someone who declined before: invite their account.
            await user.update({
                author_invite_status: 'pending',
                author_invited_by: admin.id_user,
                author_invited_at: new Date()
            });
        } else {
            const sameName = await user_model.findOne({ where: { name_user: name } });
            if (sameName) {
                return res.status(409).json({
                    error: `Ya hay una cuenta llamada «${name}». Usa un nombre que la distinga.`,
                    code: 'name_taken'
                });
            }
            user = await user_model.create({
                name_user: name,
                email_user: email,
                pass_user: null,
                google_id: null,
                auth_provider: 'google',
                email_verified: false,
                location_user: '',
                age_user: 18,
                author_invite_status: 'pending',
                author_invited_by: admin.id_user,
                author_invited_at: new Date()
            });
        }

        const emailSent = await sendInvitation(user, admin);
        res.json({
            error: null,
            data: invitationOf(user),
            emailSent,
            success: emailSent
                ? `Invitación enviada a ${user.email_user}`
                : `${user.name_user} ya está en Autoras/es, pero el email de invitación no se pudo enviar`
        });
    } catch (err) {
        console.error('author_invitation_controller - invite:', err);
        res.status(500).json({ error: 'Error al dar de alta a la autora o autor', details: err.message });
    }
}

/** GET /user/invite-author/:id_user — super admins: the invitation of that author. */
async function details(req, res) {
    try {
        const admin = await requireSuperAdmin(req, res);
        if (!admin) return;

        const user = await user_model.findByPk(req.params.id_user);
        if (!user || !user.author_invite_status) {
            return res.status(404).json({ error: 'Esta persona no tiene invitación' });
        }
        const inviter = user.author_invited_by
            ? await user_model.findByPk(user.author_invited_by, { attributes: ['id_user', 'name_user'] })
            : null;
        res.json({ error: null, data: { ...invitationOf(user), inviter } });
    } catch (err) {
        console.error('author_invitation_controller - details:', err);
        res.status(500).json({ error: 'Error al obtener la invitación', details: err.message });
    }
}

/**
 * POST /user/invite-author/:id_user/resend  { email? } — super admins.
 * Sends the email again; `email` corrects the address of someone who hasn't
 * signed in yet.
 */
async function resend(req, res) {
    try {
        const admin = await requireSuperAdmin(req, res);
        if (!admin) return;

        const user = await user_model.findByPk(req.params.id_user);
        if (!user || user.author_invite_status !== 'pending') {
            return res.status(404).json({ error: 'Esta persona no tiene una invitación pendiente' });
        }

        const email = req.body?.email !== undefined ? cleanEmail(req.body.email) : null;
        if (email && email !== cleanEmail(user.email_user)) {
            if (!checkEmail(email)) {
                return res.status(400).json({ error: 'El email no es válido', code: 'invalid_email' });
            }
            if (user.google_id || user.pass_user) {
                return res.status(409).json({
                    error: 'Esta persona ya ha iniciado sesión: su email no se puede cambiar',
                    code: 'signed_in'
                });
            }
            const taken = await user_model.findOne({ where: { email_user: email } });
            if (taken) {
                return res.status(409).json({ error: `Ya hay una cuenta con el email ${email}`, code: 'email_taken' });
            }
            await user.update({ email_user: email });
        }

        await user.update({ author_invited_at: new Date() });
        const emailSent = await sendInvitation(user, admin);
        if (!emailSent) {
            return res.status(502).json({ error: 'El email de invitación no se pudo enviar', data: invitationOf(user) });
        }
        res.json({ error: null, data: invitationOf(user), emailSent, success: `Invitación enviada a ${user.email_user}` });
    } catch (err) {
        console.error('author_invitation_controller - resend:', err);
        res.status(500).json({ error: 'Error al reenviar la invitación', details: err.message });
    }
}

/**
 * GET /user/author-invitation — the signed-in user's pending invitation, or
 * data: null (also when signed out: never a 401, the front-end would log out).
 */
async function mine(req, res) {
    try {
        const user = await getRequestUser(req);
        if (!user || user.author_invite_status !== 'pending' || roleSnapshot(user).canCreateContent) {
            return res.json({ error: null, data: null });
        }
        const inviter = user.author_invited_by
            ? await user_model.findByPk(user.author_invited_by, { attributes: ['id_user', 'name_user'] })
            : null;
        res.json({
            error: null,
            data: { status: 'pending', invited_at: user.author_invited_at, inviter }
        });
    } catch (err) {
        console.error('author_invitation_controller - mine:', err);
        res.status(500).json({ error: 'Error al obtener la invitación', details: err.message });
    }
}

/**
 * POST /user/author-invitation/respond  { response: 'accept' | 'decline' }
 * Returns the session user (with the new role when accepting).
 */
async function respond(req, res) {
    try {
        const user = await getRequestUser(req);
        if (!user) {
            return res.status(403).json({ error: 'Inicia sesión para responder', code: 'login_required' });
        }
        const response = req.body?.response;
        if (response !== 'accept' && response !== 'decline') {
            return res.status(400).json({ error: "La respuesta debe ser 'accept' o 'decline'" });
        }
        if (user.author_invite_status !== 'pending') {
            return res.status(409).json({ error: 'No tienes ninguna invitación pendiente', code: 'no_invitation' });
        }

        if (response === 'accept') {
            await user.update({ is_editor: true, email_verified: true, author_invite_status: 'accepted' });
            return res.json({
                error: null,
                data: sanitizeUserData(user),
                success: 'Invitación aceptada: ya puedes publicar en la revista'
            });
        }

        await user.update({ author_invite_status: 'declined' });
        // Their profile leaves «Autoras/es»; their publications pass to the magazine.
        await author_profile_model.update({ status_profile: 'draft' }, { where: { user_id: user.id_user } });
        await passCreditsToMagazine(user);
        res.json({ error: null, data: sanitizeUserData(user), success: 'Has rechazado la invitación' });
    } catch (err) {
        console.error('author_invitation_controller - respond:', err);
        res.status(500).json({ error: 'Error al responder la invitación', details: err.message });
    }
}

export { invite, details, resend, mine, respond };

export default { invite, details, resend, mine, respond };
