import user_model from "../../models/user_model.js";
import bcrypt from "bcrypt";
import { generateVerificationToken, sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } from "../../services/emailService.js";
import { isSuperAdminEmail } from "../../config/environment.js";
import { Op } from "sequelize";

/**
 * Idempotent super-admin auto-promotion. If the user's email is in the
 * SUPER_ADMIN_EMAILS env list, ensure is_super_admin and is_editor are 1.
 * Safe to call on every login. Mutates the user instance in place and persists.
 */
async function ensureSuperAdminPromotion(user) {
    if (!user || !isSuperAdminEmail(user.email_user)) return false;
    if (user.is_super_admin && user.is_editor) return false;
    await user.update({
        is_super_admin: true,
        is_editor: true,
        email_verified: true
    });
    console.log(`[auth] auto-promoted ${user.email_user} to super_admin via SUPER_ADMIN_EMAILS`);
    return true;
}
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createExpirationDate = (hoursFromNow) => {
    return new Date(Date.now() + (hoursFromNow * 60 * 60 * 1000));
};

const isExpired = (expirationDate) => {
    if (!expirationDate) return true;
    return Date.now() >= new Date(expirationDate).getTime();
};

const validateUserData = (userData, isPartialUpdate = false) => {
    const errors = [];

    if (userData.is_editor !== undefined && typeof userData.is_editor !== 'boolean') {
        errors.push('is_editor debe ser un valor booleano');
    }
    if (userData.is_super_admin !== undefined && typeof userData.is_super_admin !== 'boolean') {
        errors.push('is_super_admin debe ser un valor booleano');
    }

    if (!isPartialUpdate) {
        const requiredFields = ['name_user', 'email_user'];
        requiredFields.forEach(field => {
            if (!userData[field]) errors.push(`Falta el campo: ${field}`);
        });
    }

    if (userData.email_user !== undefined) {
        if (!userData.email_user) {
            errors.push('El email es requerido');
        } else if (!emailRegex.test(userData.email_user)) {
            errors.push('El formato del email no es válido');
        }
    }

    if (userData.name_user) {
        if (userData.name_user.length < 3) errors.push('El nombre debe tener al menos 3 caracteres');
        if (userData.name_user.length > 100) errors.push('El nombre no puede exceder 100 caracteres');
        if (!/^[a-zA-Z0-9_ ]+$/.test(userData.name_user)) {
            errors.push('El nombre solo puede contener letras, números, guiones bajos y espacios');
        }
    }

    if (userData.age_user !== undefined) {
        if (!Number.isInteger(userData.age_user) || userData.age_user < 0) {
            errors.push('La edad debe ser un número entero positivo');
        }
        if (userData.age_user < 18) errors.push('La edad mínima es 18 años');
        if (userData.age_user > 120) errors.push('La edad no puede ser mayor a 120 años');
    }

    return { isValid: errors.length === 0, errors };
};

async function getAll() {
    try {
        const users = await user_model.findAll();
        if (!users || users.length === 0) return { error: "No hay usuarios registrados" };
        return { data: users };
    } catch (err) {
        console.error("-> user_controller.js - getAll() = ", err);
        return { error: "Error obteniendo los usuarios" };
    }
}

async function getById(id) {
    try {
        if (!id) return { error: "ID de usuario requerido" };
        const user = await user_model.findByPk(id);
        if (!user) return { error: "Usuario no encontrado" };
        return { data: user };
    } catch (err) {
        console.error("-> user_controller.js - getById() = ", err);
        return { error: "Error al obtener el usuario" };
    }
}

async function getByUserName(userName) {
    try {
        const user = await user_model.findOne({ where: { name_user: userName } });
        if (user) return { data: user };
        return { error: "El usuario no existe" };
    } catch (err) {
        console.error("-> user_controller.js - getByUserName() = ", err);
        return { error: "Error al obtener el usuario" };
    }
}

async function create(userData) {
    try {
        const validation = validateUserData(userData);
        if (!validation.isValid) return { error: "Validación fallida", details: validation.errors };

        const existingUser = await user_model.findOne({ where: { name_user: userData.name_user } });
        if (existingUser) return { error: "El usuario ya existe" };

        if (userData.email_user) {
            const existingEmail = await user_model.findOne({ where: { email_user: userData.email_user } });
            if (existingEmail) return { error: "Ya existe una cuenta con este email" };
        }

        const user = await user_model.create(userData);
        return { data: user, message: "Usuario creado" };
    } catch (err) {
        console.error("Error in create:", err);
        return { error: "Error al crear el usuario" };
    }
}

async function login(userData) {
    try {
        if (!userData.name_user || !userData.pass_user) {
            return { error: "Información de usuario incompleta" };
        }
        if (userData.pass_user.length !== 4 || !/^\d+$/.test(userData.pass_user)) {
            return { error: "Contraseña inválida" };
        }

        const user = await user_model.findOne({ where: { name_user: userData.name_user } });
        if (!user) return { error: "El usuario no existe" };

        if (user.email_verified === false || user.email_verified === 0) {
            return {
                error: "Por favor verifica tu correo electrónico antes de iniciar sesión.",
                needsVerification: true,
                email: user.email_user
            };
        }

        if (!user.pass_user) {
            return { error: "Esta cuenta solo puede acceder con Google Sign-In. Usa el botón 'Entrar con Google'." };
        }

        const isPasswordValid = await bcrypt.compare(userData.pass_user, user.pass_user);
        if (!isPasswordValid) return { error: "Contraseña incorrecta" };

        // Auto-promote configured super-admin emails on every login (idempotent).
        await ensureSuperAdminPromotion(user);

        const userResponse = {
            id_user: user.id_user,
            name_user: user.name_user,
            email_user: user.email_user,
            location_user: user.location_user,
            image_user: user.image_user,
            age_user: user.age_user,
            email_verified: user.email_verified,
            is_editor: user.is_editor,
            is_super_admin: user.is_super_admin,
            receives_newsletter: user.receives_newsletter,
            auth_provider: user.auth_provider,
            has_password: !!user.pass_user
        };

        return { data: userResponse, message: "Login exitoso" };
    } catch (err) {
        console.error("-> user_controller.js - login() = ", err);
        return { error: "Error al iniciar sesión" };
    }
}

async function register(userData) {
    try {
        if (userData.is_editor === undefined) userData.is_editor = false;
        if (userData.is_super_admin === undefined) userData.is_super_admin = false;

        const validation = validateUserData(userData);
        if (!validation.isValid) {
            return { error: "Validación fallida", details: validation.errors };
        }

        const existingUser = await user_model.findOne({ where: { name_user: userData.name_user } });
        if (existingUser) return { error: "El usuario ya existe" };

        const existingEmail = await user_model.findOne({ where: { email_user: userData.email_user } });
        if (existingEmail) {
            const isGoogleAccount = existingEmail.auth_provider === 'google' || existingEmail.google_id;
            if (isGoogleAccount) {
                return {
                    error: `Ya existe una cuenta con este email registrada mediante Google.\n\nPuedes iniciar sesión con Google usando este email.`,
                    details: 'Cuenta Google existente'
                };
            }
            return { error: "Ya existe una cuenta con este email." };
        }

        if (userData.age_user === undefined) userData.age_user = 18;
        if (userData.location_user === undefined) userData.location_user = '';

        const verificationToken = generateVerificationToken();
        const verificationTokenExpires = createExpirationDate(24);

        userData.verification_token = verificationToken;
        userData.verification_token_expires = verificationTokenExpires;
        userData.email_verified = false;

        userData.pass_user = await bcrypt.hash(userData.pass_user, 5);

        const user = await user_model.create(userData);

        const emailResult = await sendVerificationEmail(
            userData.email_user,
            userData.name_user,
            verificationToken
        );

        const userResponse = {
            id_user: user.id_user,
            name_user: user.name_user,
            email_user: user.email_user,
            location_user: user.location_user,
            age_user: user.age_user,
            email_verified: user.email_verified,
            is_editor: user.is_editor,
            is_super_admin: user.is_super_admin
        };

        return {
            message: "Registro exitoso. Por favor verifica tu correo electrónico.",
            data: userResponse,
            verificationEmailSent: emailResult.success
        };
    } catch (err) {
        console.error("Error en el registro = ", err);
        return { error: "Error de registro", details: err.message };
    }
}

async function verifyEmail(email, token) {
    try {
        const users = await user_model.findAll({
            where: { email_user: email, verification_token: token }
        });

        if (!users || users.length === 0) {
            return { error: "Token inválido o no encontrado" };
        }

        const validUsers = users.filter(u => !isExpired(u.verification_token_expires));

        if (validUsers.length === 0) {
            return { error: "El enlace de verificación ha expirado. Solicita un nuevo enlace." };
        }

        for (const user of validUsers) {
            await user.update({
                email_verified: true,
                verification_token: null,
                verification_token_expires: null
            });
            await sendWelcomeEmail(user.email_user, user.name_user);
        }

        return {
            message: "Email verificado exitosamente",
            data: { email_verified: true, accounts_verified: validUsers.length }
        };
    } catch (err) {
        console.error("Error verifying email:", err);
        return { error: "Error al verificar el email", details: err.message };
    }
}

async function resendVerificationEmail(email) {
    try {
        const user = await user_model.findOne({ where: { email_user: email } });
        if (!user) return { error: "Usuario no encontrado" };
        if (user.email_verified) return { error: "El email ya está verificado" };

        const verificationToken = generateVerificationToken();
        const verificationTokenExpires = createExpirationDate(24);

        await user.update({
            verification_token: verificationToken,
            verification_token_expires: verificationTokenExpires
        });

        const emailResult = await sendVerificationEmail(user.email_user, user.name_user, verificationToken);
        if (!emailResult.success) return { error: "Error al enviar el email de verificación" };

        return { message: "Email de verificación reenviado exitosamente" };
    } catch (err) {
        console.error("Error resending verification email:", err);
        return { error: "Error al reenviar el email de verificación", details: err.message };
    }
}

async function requestPasswordReset(email) {
    try {
        if (!email || !emailRegex.test(email)) return { error: "Email inválido" };

        const users = await user_model.findAll({ where: { email_user: email } });
        if (!users || users.length === 0) return { error: "No existe ninguna cuenta con ese email" };

        const usersWithPasswords = users.filter(u => u.pass_user);
        if (usersWithPasswords.length === 0) {
            return { error: "Esta cuenta usa Google Sign-In. Por favor inicia sesión con Google." };
        }

        const resetToken = generateVerificationToken();
        const resetTokenExpires = createExpirationDate(1);

        for (const user of usersWithPasswords) {
            await user.update({
                password_reset_token: resetToken,
                password_reset_token_expires: resetTokenExpires
            });
        }

        const emailResult = await sendPasswordResetEmail(email, usersWithPasswords[0].name_user, resetToken);
        if (!emailResult.success) return { error: "Error al enviar el email de restablecimiento" };

        return {
            message: "Se ha enviado un email con instrucciones para restablecer tu contraseña",
            data: { email, accounts_count: usersWithPasswords.length }
        };
    } catch (err) {
        console.error("Error in requestPasswordReset:", err);
        return { error: "Error al solicitar el restablecimiento de contraseña", details: err.message };
    }
}

async function resetPasswordWithToken(email, token, newPassword) {
    try {
        if (!email || !token || !newPassword) {
            return { error: "Email, token y nueva contraseña son requeridos" };
        }
        if (newPassword.length !== 4 || !/^\d+$/.test(newPassword)) {
            return { error: "La contraseña debe tener exactamente 4 dígitos" };
        }

        const users = await user_model.findAll({
            where: { email_user: email, password_reset_token: token }
        });

        if (!users || users.length === 0) {
            return { error: "Token inválido. Solicita un nuevo enlace de restablecimiento." };
        }

        const validUsers = users.filter(u => !isExpired(u.password_reset_token_expires));
        if (validUsers.length === 0) {
            return { error: "Token expirado. Solicita un nuevo enlace de restablecimiento." };
        }

        const hashedPassword = await bcrypt.hash(newPassword, 5);
        for (const user of validUsers) {
            await user.update({
                pass_user: hashedPassword,
                password_reset_token: null,
                password_reset_token_expires: null
            });
        }

        return {
            message: "Contraseña restablecida exitosamente. Ya puedes iniciar sesión.",
            data: { accounts_updated: validUsers.length }
        };
    } catch (err) {
        console.error("Error in resetPasswordWithToken:", err);
        return { error: "Error al restablecer la contraseña", details: err.message };
    }
}

async function changePassword(userId, oldPassword, newPassword) {
    try {
        if (!userId || !oldPassword || !newPassword) {
            return { error: "ID de usuario, contraseña actual y nueva contraseña son requeridos" };
        }
        if (oldPassword.length !== 4 || !/^\d+$/.test(oldPassword)) {
            return { error: "La contraseña actual debe tener exactamente 4 dígitos" };
        }
        if (newPassword.length !== 4 || !/^\d+$/.test(newPassword)) {
            return { error: "La nueva contraseña debe tener exactamente 4 dígitos" };
        }
        if (oldPassword === newPassword) {
            return { error: "La nueva contraseña debe ser diferente a la actual" };
        }

        const user = await user_model.findByPk(userId);
        if (!user) return { error: "Usuario no encontrado" };

        const isPasswordValid = await bcrypt.compare(oldPassword, user.pass_user);
        if (!isPasswordValid) return { error: "La contraseña actual es incorrecta" };

        const hashedPassword = await bcrypt.hash(newPassword, 5);
        await user.update({ pass_user: hashedPassword });

        return {
            message: "Contraseña cambiada exitosamente",
            data: { user_id: user.id_user, user_name: user.name_user }
        };
    } catch (err) {
        console.error("Error in changePassword:", err);
        return { error: "Error al cambiar la contraseña", details: err.message };
    }
}

async function update(id, userData) {
    try {
        if (!id) return { error: "El ID de usuario es requerido" };

        if (Object.keys(userData).length === 0) {
            return { error: "No hay campos para actualizar" };
        }

        const user = await user_model.findByPk(id);
        if (!user) return { error: "El usuario no existe" };

        const isEmailChanging = userData.email_user && userData.email_user !== user.email_user;
        const emailVerifiedExplicitlySet = userData.email_verified !== undefined;

        if (isEmailChanging) {
            const existing = await user_model.findOne({
                where: { email_user: userData.email_user, id_user: { [Op.ne]: id } }
            });

            if (existing) {
                return { error: "Ya existe otra cuenta con este email" };
            }

            if (!emailVerifiedExplicitlySet) userData.email_verified = false;

            const verificationToken = generateVerificationToken();
            const verificationTokenExpires = createExpirationDate(24);
            userData.verification_token = verificationToken;
            userData.verification_token_expires = verificationTokenExpires;

            if (userData.email_verified === false) {
                await sendVerificationEmail(userData.email_user, user.name_user, verificationToken);
            }
        }

        const allowedFields = [
            'name_user', 'email_user', 'pass_user', 'location_user', 'image_user',
            'age_user', 'email_verified', 'verification_token', 'verification_token_expires',
            'is_editor', 'is_super_admin', 'receives_newsletter'
        ];

        const fieldsToUpdate = {};
        for (const f of allowedFields) {
            if (userData[f] !== undefined) fieldsToUpdate[f] = userData[f];
        }

        const validation = validateUserData(fieldsToUpdate, true);
        if (!validation.isValid) {
            return { error: "La validación falló", details: validation.errors.join(', ') };
        }

        Object.assign(user, fieldsToUpdate);
        await user.save();

        const sanitizedUser = {
            id_user: user.id_user,
            name_user: user.name_user,
            email_user: user.email_user,
            location_user: user.location_user,
            image_user: user.image_user,
            age_user: user.age_user,
            email_verified: user.email_verified,
            is_editor: user.is_editor,
            is_super_admin: user.is_super_admin,
            receives_newsletter: user.receives_newsletter,
            auth_provider: user.auth_provider,
            has_password: !!user.pass_user,
            google_id: user.google_id
        };

        return {
            message: isEmailChanging && userData.email_verified === false
                ? "Usuario actualizado. Por favor verifica tu nuevo email."
                : "Usuario actualizado.",
            data: sanitizedUser
        };
    } catch (error) {
        console.error("Error in update:", error);
        let errorMessage = "Error de actualización";
        let errorDetails = error.message || "Error desconocido";
        if (error.name === 'SequelizeUniqueConstraintError') {
            errorMessage = "Datos duplicados";
            errorDetails = "El email o nombre de usuario ya está en uso";
        }
        return { error: errorMessage, details: errorDetails };
    }
}

async function removeById(id_user) {
    try {
        if (!id_user) return { error: "El ID de usuario es requerido" };
        const user = await user_model.findByPk(id_user);
        if (!user) return { error: "Usuario no encontrado" };

        // Delete user profile image folder under uploads/user-profiles/{userName}/
        const userFolderPath = path.join(__dirname, '..', '..', 'uploads', 'user-profiles', user.name_user);
        if (fs.existsSync(userFolderPath)) {
            try {
                fs.rmSync(userFolderPath, { recursive: true, force: true });
            } catch (err) {
                console.error('Error deleting user folder:', err);
            }
        }

        // FK cascades handle article_authors, article_author_invitations, project_authors, author_profiles
        await user.destroy();

        return { data: id_user, message: 'El usuario se ha eliminado exitosamente.' };
    } catch (err) {
        console.error("-> user_controller.js - removeById() = ", err);
        return { error: "Error al borrar el usuario", details: err.message };
    }
}

async function updateProfileImage(userName, imagePath) {
    try {
        const user = await user_model.findOne({ where: { name_user: userName } });
        if (!user) return { error: "Usuario no encontrado" };
        await user.update({ image_user: imagePath });
        return { data: { image_user: imagePath }, message: "Imagen de perfil actualizada." };
    } catch (err) {
        console.error("Error updating profile image:", err);
        return { error: "Error al actualizar la imagen de perfil", details: err.message };
    }
}

async function getByEmail(email_user) {
    try {
        if (!email_user) return { error: "El email es obligatorio" };
        const user = await user_model.findOne({
            where: { email_user },
            attributes: { exclude: ['pass_user'] }
        });
        if (!user) return { error: "Usuario no encontrado con ese email" };
        return { data: user };
    } catch (err) {
        console.error("-> user_controller.js - getByEmail() = ", err);
        return { error: "Error al buscar usuario por email" };
    }
}

async function searchByName(name_user) {
    try {
        if (!name_user || name_user.length < 2) {
            return { error: "Ingresa al menos 2 caracteres para buscar" };
        }
        const users = await user_model.findAll({
            where: { name_user: { [Op.like]: `%${name_user}%` } },
            attributes: { exclude: ['pass_user'] },
            limit: 10
        });
        if (!users || users.length === 0) return { error: "No se encontraron usuarios", data: [] };
        return { data: users };
    } catch (err) {
        console.error("-> user_controller.js - searchByName() = ", err);
        return { error: "Error al buscar usuarios por nombre" };
    }
}

export {
    getAll,
    getById,
    create,
    update,
    removeById,
    login,
    register,
    getByUserName,
    updateProfileImage,
    verifyEmail,
    resendVerificationEmail,
    getByEmail,
    searchByName,
    requestPasswordReset,
    resetPasswordWithToken,
    changePassword
};

export default {
    getAll,
    getById,
    create,
    update,
    removeById,
    login,
    register,
    getByUserName,
    updateProfileImage,
    verifyEmail,
    resendVerificationEmail,
    getByEmail,
    searchByName,
    requestPasswordReset,
    resetPasswordWithToken,
    changePassword
};
