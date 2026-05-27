import { OAuth2Client } from 'google-auth-library';
import user_model from '../../models/user_model.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { isSuperAdminEmail } from '../../config/environment.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Idempotent super-admin auto-promotion. See user_controller.js for full notes.
 * Mirrored here so Google OAuth users get promoted on first sign-in without
 * needing a separate login pass.
 */
async function ensureSuperAdminPromotion(user) {
    if (!user || !isSuperAdminEmail(user.email_user)) return false;
    if (user.is_super_admin && user.is_admin && user.is_editor) return false;
    await user.update({
        is_super_admin: true,
        is_admin: true,
        is_editor: true,
        email_verified: true
    });
    console.log(`[auth] auto-promoted ${user.email_user} to super_admin via SUPER_ADMIN_EMAILS`);
    return true;
}

function sanitizeUserData(user) {
    return {
        id_user: user.id_user,
        name_user: user.name_user,
        email_user: user.email_user,
        location_user: user.location_user,
        image_user: user.image_user,
        age_user: user.age_user,
        email_verified: user.email_verified,
        is_editor: user.is_editor,
        is_admin: user.is_admin,
        is_super_admin: user.is_super_admin,
        is_premium_reader: user.is_premium_reader,
        receives_newsletter: user.receives_newsletter,
        auth_provider: user.auth_provider,
        has_password: !!user.pass_user,
        google_id: user.google_id
    };
}

async function verifyGoogleToken(idToken) {
    try {
        if (!process.env.GOOGLE_CLIENT_ID) {
            throw new Error('GOOGLE_CLIENT_ID no está configurado en el servidor');
        }
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        if (!payload.email_verified) {
            throw new Error('Email de Google no verificado');
        }
        return payload;
    } catch (error) {
        console.error('Error verifying Google token:', error.message);
        throw new Error('Token de Google inválido: ' + error.message);
    }
}

async function generateRandomPassword() {
    const randomPassword = crypto.randomBytes(32).toString('hex');
    return bcrypt.hash(randomPassword, 5);
}

/**
 * Google login or registration. Magazine has no user-type concept — one account per email.
 *  - If Google ID is already linked to an account → log in
 *  - If email exists with no Google ID → offer linking (user must confirm with password)
 *  - If neither → create new account
 *
 * @param {string} idToken Google ID token from the client
 * @param {boolean} isRegisterMode If true and email is new, skip the "needs type selection" flow
 *                                  and create the account directly.
 */
async function googleLogin(idToken, isRegisterMode = false) {
    try {
        const googleUser = await verifyGoogleToken(idToken);

        // Already linked to this Google ID?
        const linked = await user_model.findOne({ where: { google_id: googleUser.sub } });
        if (linked) {
            await ensureSuperAdminPromotion(linked);
            return {
                data: sanitizeUserData(linked),
                message: 'Login exitoso con Google'
            };
        }

        // Email exists but not linked to Google → offer linking
        const existingByEmail = await user_model.findOne({ where: { email_user: googleUser.email } });
        if (existingByEmail) {
            // If account is "google" auth_provider with no password, link automatically (legacy edge case)
            if (existingByEmail.auth_provider === 'google' && !existingByEmail.pass_user) {
                await existingByEmail.update({ google_id: googleUser.sub, email_verified: true });
                await ensureSuperAdminPromotion(existingByEmail);
                return {
                    data: sanitizeUserData(existingByEmail),
                    message: 'Login exitoso con Google'
                };
            }
            return {
                needsLinking: true,
                googleUser: {
                    email: googleUser.email,
                    name: googleUser.name,
                    picture: googleUser.picture,
                    sub: googleUser.sub
                },
                existingAccounts: [{
                    id_user: existingByEmail.id_user,
                    name_user: existingByEmail.name_user,
                    email_user: existingByEmail.email_user
                }]
            };
        }

        // No account exists. Magazine has no user types to choose between, so
        // first-time Google sign-in creates the account and logs in immediately
        // — no separate registration round-trip needed (which the magazine-front
        // doesn't know how to handle anyway).
        return completeGoogleRegistration(
            googleUser.sub,
            googleUser.email,
            googleUser.name,
            googleUser.picture
        );
    } catch (error) {
        console.error('googleLogin error:', error.message);
        return { error: error.message || 'Error al autenticar con Google' };
    }
}

async function linkGoogleAccount(userId, googleId, password) {
    try {
        if (!userId || !googleId || !password) {
            return { error: 'Faltan campos requeridos' };
        }

        const user = await user_model.findByPk(userId);
        if (!user) return { error: 'Usuario no encontrado' };

        if (!user.pass_user) {
            return { error: 'Esta cuenta no tiene contraseña configurada' };
        }

        const isPasswordValid = await bcrypt.compare(password, user.pass_user);
        if (!isPasswordValid) return { error: 'Contraseña incorrecta' };

        if (user.google_id === googleId) {
            return { data: sanitizeUserData(user), message: 'Esta cuenta ya está vinculada a Google' };
        }

        if (user.google_id && user.google_id !== googleId) {
            return { error: 'Esta cuenta ya está vinculada a otra cuenta de Google.' };
        }

        await user.update({ google_id: googleId, email_verified: true });
        await ensureSuperAdminPromotion(user);

        return { data: sanitizeUserData(user), message: 'Cuenta de Google vinculada exitosamente' };
    } catch (error) {
        console.error('linkGoogleAccount error:', error.message);
        return { error: error.message || 'Error al vincular cuenta de Google' };
    }
}

/**
 * Auto-link Google ID to an existing account when the user has confirmed the selection.
 * (Google already verified the email, so no password is required for this path — same
 * logic as uribarri's selectGoogleAccount.)
 */
async function selectGoogleAccount(userId, googleId) {
    try {
        if (!userId || !googleId) return { error: 'Faltan campos requeridos' };

        const user = await user_model.findByPk(userId);
        if (!user) return { error: 'Usuario no encontrado' };

        if (user.google_id === googleId) {
            return { data: sanitizeUserData(user), message: 'Login exitoso con Google' };
        }
        if (user.google_id && user.google_id !== googleId) {
            return { error: 'Esta cuenta ya está vinculada a otra cuenta de Google.' };
        }

        await user.update({ google_id: googleId, email_verified: true });
        await ensureSuperAdminPromotion(user);

        return { data: sanitizeUserData(user), message: 'Login exitoso con Google' };
    } catch (error) {
        console.error('selectGoogleAccount error:', error.message);
        return { error: error.message || 'Error al seleccionar cuenta' };
    }
}

async function completeGoogleRegistration(googleId, email, name, picture) {
    try {
        const existing = await user_model.findOne({ where: { email_user: email } });
        if (existing) {
            return { error: 'Ya existe una cuenta con este email' };
        }

        let username = name || email.split('@')[0];
        const existingUsername = await user_model.findOne({ where: { name_user: username } });
        if (existingUsername) {
            const randomSuffix = Math.floor(Math.random() * 10000);
            username = `${username}${randomSuffix}`;
        }

        const hashedPassword = await generateRandomPassword();

        // Bootstrap super admin on first registration if the email is on the allowlist.
        // Super admins are implicitly admins + editors, so set all three flags together.
        const promoteToSuperAdmin = isSuperAdminEmail(email);

        const newUser = await user_model.create({
            name_user: username,
            email_user: email,
            pass_user: hashedPassword,
            google_id: googleId,
            auth_provider: 'google',
            email_verified: true,
            location_user: '',
            image_user: picture || null,
            age_user: 18,
            is_editor: promoteToSuperAdmin,
            is_admin: promoteToSuperAdmin,
            is_super_admin: promoteToSuperAdmin,
            receives_newsletter: false
        });

        if (promoteToSuperAdmin) {
            console.log(`[auth] auto-promoted ${email} to super_admin on Google registration`);
        }

        return {
            data: sanitizeUserData(newUser),
            message: 'Cuenta creada exitosamente con Google'
        };
    } catch (error) {
        console.error('completeGoogleRegistration error:', error.message);
        return { error: error.message || 'Error al completar el registro con Google' };
    }
}

export {
    verifyGoogleToken,
    googleLogin,
    linkGoogleAccount,
    selectGoogleAccount,
    completeGoogleRegistration
};

export default {
    verifyGoogleToken,
    googleLogin,
    linkGoogleAccount,
    selectGoogleAccount,
    completeGoogleRegistration
};
