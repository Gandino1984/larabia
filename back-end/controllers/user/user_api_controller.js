import userController from "./user_controller.js";
import bcrypt from 'bcrypt';
import user_model from "../../models/user_model.js";
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import googleOAuthController from "./google_oauth_controller.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getAll(req, res) {
    const { error, data } = await userController.getAll();
    res.json({ error, data });
}

async function getById(req, res) {
    const id = req.body.id_user;
    const { error, data } = await userController.getById(id);
    res.json({ error, data });
}

async function getByUserName(req, res) {
    const name = req.body.name_user;
    const { error, data } = await userController.getByUserName(name);
    res.json({ error, data });
}

async function login(req, res) {
    const { name_user, pass_user } = req.body;
    try {
        if (!name_user || !pass_user) {
            res.status(400).json({ error: 'Los parámetros name_user, pass_user son obligatorios' });
            return;
        }
        const { error, data, message } = await userController.login({ name_user, pass_user });
        res.json({ error, data, message });
    } catch (error) {
        console.error('Login API error:', error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
}

async function register(req, res) {
    const { name_user, pass_user, email_user, location_user, image_user, age_user } = req.body;
    try {
        if (!name_user || !pass_user || !email_user) {
            res.status(400).json({
                error: 'Los parámetros name_user, pass_user y email_user son obligatorios'
            });
            return;
        }
        const result = await userController.register({
            name_user,
            pass_user,
            email_user,
            location_user,
            image_user,
            age_user
        });
        res.json(result);
    } catch (err) {
        console.error('-> user_api_controller.js - register() = ', err);
        res.status(500).json({ error: 'Error en el registro de usuario' });
    }
}

async function create(req, res) {
    const { name_user, pass_user, email_user, location_user, image_user, age_user, is_editor, is_super_admin } = req.body;
    const result = await userController.create({
        name_user, pass_user, email_user, location_user, image_user, age_user, is_editor, is_super_admin
    });
    res.json(result);
}

async function update(req, res) {
    const {
        id_user, name_user, email_user, pass_user, location_user, image_user, age_user,
        email_verified, verification_token, verification_token_expires,
        is_editor, is_admin, is_super_admin, is_premium_reader, receives_newsletter
    } = req.body;

    let hashedPassword = pass_user;
    if (pass_user) {
        try {
            hashedPassword = await bcrypt.hash(pass_user, 5);
        } catch (err) {
            console.error('Error hashing password:', err);
            return res.status(500).json({ error: 'Error al procesar la contraseña' });
        }
    }

    const result = await userController.update(id_user, {
        name_user, email_user, pass_user: hashedPassword, location_user, image_user, age_user,
        email_verified, verification_token, verification_token_expires,
        is_editor, is_admin, is_super_admin, is_premium_reader, receives_newsletter
    });

    res.json(result);
}

async function removeById(req, res) {
    try {
        const id_user = req.params.id_user;
        if (!id_user) return res.status(400).json({ error: 'El ID del usuario es obligatorio' });
        const result = await userController.removeById(id_user);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar el usuario', details: err.message });
    }
}

// Used by ProfileUploadMiddleware after the file is on disk
async function updateProfileImage(userName) {
    try {
        const user = await user_model.findOne({ where: { name_user: userName } });
        if (!user) return { error: 'Usuario no encontrado' };

        // The convention: store the username in image_user; /user/image/:userName resolves the file on disk.
        await user.update({ image_user: userName });

        return { data: { image_user: userName }, message: 'Imagen de perfil actualizada.' };
    } catch (err) {
        console.error('Error updating profile image:', err);
        return { error: 'Error al actualizar la imagen de perfil', details: err.message };
    }
}

async function getUserImage(req, res) {
    try {
        const { userName } = req.params;
        if (!userName) return res.status(400).json({ error: 'Nombre de usuario requerido' });

        // Profile images live under back-end/uploads/user-profiles/{userName}/profile.{ext}
        const userImageDir = path.join(__dirname, '..', '..', 'uploads', 'user-profiles', userName);

        try {
            await fs.access(userImageDir);
        } catch {
            return res.status(404).json({ error: 'No se encontró imagen de perfil' });
        }

        const files = await fs.readdir(userImageDir);
        const profileImage = files.find(file => file.startsWith('profile.'));
        if (!profileImage) return res.status(404).json({ error: 'No se encontró imagen de perfil' });

        const imagePath = path.join(userImageDir, profileImage);
        const ext = path.extname(profileImage).toLowerCase();
        const contentTypeMap = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp'
        };

        res.setHeader('Content-Type', contentTypeMap[ext] || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.sendFile(imagePath);
    } catch (error) {
        console.error('Error serving user image:', error);
        res.status(500).json({ error: 'Error al servir la imagen', details: error.message });
    }
}

async function getByEmail(req, res) {
    try {
        const { email_user } = req.body;
        if (!email_user) return res.status(400).json({ error: 'El email es obligatorio' });
        const result = await userController.getByEmail(email_user);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Error al buscar usuario por email', details: err.message });
    }
}

async function searchByName(req, res) {
    try {
        const { name_user } = req.body;
        if (!name_user) return res.status(400).json({ error: 'El nombre es obligatorio para la búsqueda' });
        const result = await userController.searchByName(name_user);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Error al buscar usuarios por nombre', details: err.message });
    }
}

async function requestPasswordReset(req, res) {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'El email es obligatorio' });
        const result = await userController.requestPasswordReset(email);
        if (result.error) return res.status(400).json(result);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Error al solicitar el restablecimiento de contraseña', details: err.message });
    }
}

async function resetPasswordWithToken(req, res) {
    try {
        const { email, token, newPassword } = req.body;
        if (!email || !token || !newPassword) {
            return res.status(400).json({ error: 'Email, token y nueva contraseña son obligatorios' });
        }
        const result = await userController.resetPasswordWithToken(email, token, newPassword);
        if (result.error) return res.status(400).json(result);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Error al restablecer la contraseña', details: err.message });
    }
}

async function changePassword(req, res) {
    try {
        const { id_user, oldPassword, newPassword } = req.body;
        if (!id_user || !oldPassword || !newPassword) {
            return res.status(400).json({ error: 'ID de usuario, contraseña actual y nueva contraseña son obligatorios' });
        }
        const result = await userController.changePassword(id_user, oldPassword, newPassword);
        if (result.error) return res.status(400).json(result);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Error al cambiar la contraseña', details: err.message });
    }
}

// Google OAuth handlers
async function googleAuth(req, res) {
    try {
        const { idToken, isRegisterMode } = req.body;
        if (!idToken) return res.status(400).json({ error: 'Token de Google es requerido' });

        const result = await googleOAuthController.googleLogin(idToken, !!isRegisterMode);

        if (result.error) return res.status(400).json({ error: result.error });
        if (result.needsLinking) {
            return res.json({
                needsLinking: true,
                googleUser: result.googleUser,
                existingAccounts: result.existingAccounts
            });
        }
        res.json({ data: result.data, message: result.message });
    } catch (err) {
        console.error('Google OAuth error:', err);
        res.status(500).json({ error: 'Error al autenticar con Google', details: err.message });
    }
}

async function linkGoogleAccount(req, res) {
    try {
        const { userId, googleId, password } = req.body;
        if (!userId || !googleId || !password) {
            return res.status(400).json({ error: 'Faltan campos requeridos: userId, googleId y password' });
        }
        const result = await googleOAuthController.linkGoogleAccount(userId, googleId, password);
        if (result.error) return res.status(400).json({ error: result.error });
        res.json({ data: result.data, message: result.message });
    } catch (err) {
        res.status(500).json({ error: 'Error al vincular cuenta de Google', details: err.message });
    }
}

async function selectGoogleAccount(req, res) {
    try {
        const { userId, googleId } = req.body;
        if (!userId || !googleId) {
            return res.status(400).json({ error: 'Faltan campos requeridos: userId y googleId' });
        }
        const result = await googleOAuthController.selectGoogleAccount(userId, googleId);
        if (result.error) return res.status(400).json({ error: result.error });
        res.json({ data: result.data, message: result.message });
    } catch (err) {
        res.status(500).json({ error: 'Error al seleccionar cuenta', details: err.message });
    }
}

async function completeGoogleRegistration(req, res) {
    try {
        const { googleId, email, name, picture } = req.body;
        if (!googleId || !email) {
            return res.status(400).json({ error: 'Faltan campos requeridos: googleId y email' });
        }
        const result = await googleOAuthController.completeGoogleRegistration(googleId, email, name, picture);
        if (result.error) return res.status(400).json({ error: result.error });
        res.json({ data: result.data, message: result.message });
    } catch (err) {
        res.status(500).json({ error: 'Error al completar el registro con Google', details: err.message });
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
    getByEmail,
    searchByName,
    getUserImage,
    requestPasswordReset,
    resetPasswordWithToken,
    changePassword,
    googleAuth,
    linkGoogleAccount,
    selectGoogleAccount,
    completeGoogleRegistration
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
    getByEmail,
    searchByName,
    getUserImage,
    requestPasswordReset,
    resetPasswordWithToken,
    changePassword,
    googleAuth,
    linkGoogleAccount,
    selectGoogleAccount,
    completeGoogleRegistration
};
