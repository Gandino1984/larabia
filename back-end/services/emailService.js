import nodemailer from 'nodemailer';
import crypto from 'crypto';
import dotenv from 'dotenv';
import config from '../config/environment.js';
import magazine_metadata_model from '../models/magazine_metadata_model.js';

dotenv.config();

const BRAND_COLOR = '#111';
const ACCENT_COLOR = '#9747ff';

/**
 * Resolve the current magazine identity for email rendering.
 * Reads the singleton row each send; harmless cost given email volume.
 * Falls back to defaults if the row (or the whole table) isn't present —
 * lets the email subsystem keep working before migration 003 lands.
 */
async function getBrand() {
    try {
        const row = await magazine_metadata_model.findByPk(1);
        if (row) {
            return {
                name: row.name || 'La Rabia',
                slogan: row.slogan || '',
                description: row.description || '',
                logo_dark: row.logo_dark || '/logoLaRabiaBlack.png',
                logo_light: row.logo_light || '/LogoLaRabiaWhite.png'
            };
        }
    } catch (err) {
        console.warn('[emailService] magazine_metadata lookup failed; using defaults:', err.message);
    }
    return {
        name: 'La Rabia',
        slogan: '',
        description: '',
        logo_dark: '/logoLaRabiaBlack.png',
        logo_light: '/LogoLaRabiaWhite.png'
    };
}

/**
 * Email clients only honor absolute URLs. Stored paths can be either:
 *   - "/uploads/..." (back-end, served by express.static) → prefix with API URL
 *   - "/Foo.png"    (front-end public/ default seed)      → prefix with frontend URL
 *   - "http(s)://"  (external)                             → use as-is
 */
function absolutizeLogoUrl(value) {
    if (!value) return null;
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    if (value.startsWith('/uploads/')) return `${config.urls.api}${value}`;
    return `${config.urls.frontend}${value}`;
}

const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('ERROR: Email credentials are missing!');
  }
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: { rejectUnauthorized: false }
  });
};

export const generateVerificationToken = () => crypto.randomBytes(32).toString('hex');

const baseStyles = `
  body { font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
  .container { background-color: #f8f9fa; border-radius: 10px; padding: 30px; margin-top: 20px; }
  .header { text-align: center; color: ${ACCENT_COLOR}; font-size: 28px; font-weight: bold; margin-bottom: 20px; }
  .content { background-color: white; padding: 25px; border-radius: 8px; margin-top: 20px; }
  .button { display: inline-block; padding: 12px 30px; margin: 20px 0; background-color: ${ACCENT_COLOR}; color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600; text-transform: uppercase; }
  .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  .warning { background-color: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 10px; border-radius: 5px; margin-top: 20px; }
  .notice { background-color: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 10px; border-radius: 5px; margin-top: 20px; }
`;

export const sendVerificationEmail = async (userEmail, userName, verificationToken) => {
  try {
    const transporter = createTransporter();
    await transporter.verify();

    const { name: BRAND, slogan: BRAND_SLOGAN } = await getBrand();
    const frontendUrl = config.urls.frontend;
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(userEmail)}`;

    const htmlContent = `
      <!DOCTYPE html><html><head><style>${baseStyles}</style></head><body>
        <div class="container">
          <div class="header">${BRAND}</div>
          <div class="content">
            <h2>¡Hola ${userName}!</h2>
            <p>Gracias por registrarte en ${BRAND}. Para completar tu registro, verifica tu dirección de correo electrónico:</p>
            <div style="text-align: center;"><a href="${verificationUrl}" class="button">Verificar mi Email</a></div>
            <p>O copia este enlace en tu navegador:</p>
            <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 5px;">${verificationUrl}</p>
            <div class="warning"><strong>⚠️ Importante:</strong> Este enlace expirará en 24 horas. Si no solicitaste esta cuenta, puedes ignorar este correo.</div>
          </div>
          <div class="footer"><p>© ${new Date().getFullYear()} ${BRAND}${BRAND_SLOGAN ? ' — ' + BRAND_SLOGAN : ''}</p></div>
        </div>
      </body></html>
    `;

    const textContent = `Hola ${userName}!\n\nGracias por registrarte en ${BRAND}.\n\nPara verificar tu correo:\n${verificationUrl}\n\nEste enlace expirará en 24 horas.\n\nSaludos,\nEl equipo de ${BRAND}`;

    const info = await transporter.sendMail({
      from: `"${BRAND}" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `✅ Verifica tu correo electrónico — ${BRAND}`,
      text: textContent,
      html: htmlContent
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
};

export const sendWelcomeEmail = async (userEmail, userName) => {
  try {
    const transporter = createTransporter();
    const magazineUrl = config.urls.frontend;
    const { name: BRAND } = await getBrand();

    const htmlContent = `
      <!DOCTYPE html><html><head><style>${baseStyles}</style></head><body>
        <div class="container">
          <div class="header">${BRAND}</div>
          <div class="content">
            <div style="text-align: center; font-size: 48px; margin: 20px 0;">🎉</div>
            <h2>¡Bienvenid@ ${userName}!</h2>
            <p>Tu cuenta ha sido verificada. Ya formas parte de la comunidad de ${BRAND}.</p>
            <p>Puedes leer artículos, seguir a autoras y autores, y suscribirte para recibir recomendaciones.</p>
            <div style="text-align: center;"><a href="${magazineUrl}" class="button">Visitar ${BRAND}</a></div>
          </div>
        </div>
      </body></html>
    `;

    await transporter.sendMail({
      from: `"${BRAND}" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `🎉 Bienvenid@ a ${BRAND}`,
      html: htmlContent
    });
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
};

export const sendPasswordResetEmail = async (userEmail, userName, resetToken) => {
  try {
    const transporter = createTransporter();
    await transporter.verify();

    const { name: BRAND } = await getBrand();
    const frontendUrl = config.urls.frontend;
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(userEmail)}`;

    const htmlContent = `
      <!DOCTYPE html><html><head><style>${baseStyles}</style></head><body>
        <div class="container">
          <div class="header">${BRAND}</div>
          <div class="content">
            <h2>¡Hola ${userName}!</h2>
            <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en ${BRAND}.</p>
            <div style="text-align: center;"><a href="${resetUrl}" class="button">Restablecer Contraseña</a></div>
            <p>O copia este enlace en tu navegador:</p>
            <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 5px;">${resetUrl}</p>
            <div class="warning"><strong>⚠️ Importante:</strong> Este enlace expirará en 1 hora por motivos de seguridad.</div>
            <div class="notice"><strong>🔒 Nota:</strong> Si no solicitaste restablecer tu contraseña, puedes ignorar este correo. Tu contraseña actual no se verá afectada.</div>
          </div>
        </div>
      </body></html>
    `;

    const textContent = `Hola ${userName}!\n\nPara restablecer tu contraseña en ${BRAND}:\n${resetUrl}\n\nEste enlace expirará en 1 hora.\n\nSi no solicitaste esto, ignora este correo.\n\nSaludos,\nEl equipo de ${BRAND}`;

    const info = await transporter.sendMail({
      from: `"${BRAND}" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `🔑 Restablece tu contraseña — ${BRAND}`,
      text: textContent,
      html: htmlContent
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

export const sendContactToDevelopersEmail = async (senderName, senderEmail, message, subject = 'Nuevo mensaje de contacto') => {
  try {
    const transporter = createTransporter();
    await transporter.verify();

    const { name: BRAND } = await getBrand();

    const htmlContent = `
      <!DOCTYPE html><html><head><style>${baseStyles}</style></head><body>
        <div class="container">
          <div class="header">📧 Nuevo Mensaje de Contacto</div>
          <div class="content">
            <p>Has recibido un nuevo mensaje a través de ${BRAND}:</p>
            <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>👤 De:</strong> ${senderName}<br>
              <strong>📧 Email:</strong> ${senderEmail}
            </div>
            <div style="background-color: #f8f9fa; padding: 20px; border-left: 4px solid ${ACCENT_COLOR}; border-radius: 5px; margin: 20px 0;">
              <strong>Mensaje:</strong><br><br>${message.replace(/\n/g, '<br>')}
            </div>
          </div>
        </div>
      </body></html>
    `;

    const info = await transporter.sendMail({
      from: `"${BRAND}" <${process.env.EMAIL_USER}>`,
      to: process.env.CONTACT_EMAIL || process.env.EMAIL_USER,
      replyTo: senderEmail,
      subject: subject,
      text: `De: ${senderName}\nEmail: ${senderEmail}\n\n${message}`,
      html: htmlContent
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending contact email:', error);
    return { success: false, error: error.message };
  }
};

export const sendNewsletterEmail = async (subscriberEmail, subscriberName, articles, introText) => {
  try {
    const transporter = createTransporter();
    const magazineUrl = config.urls.frontend;
    const brand = await getBrand();
    const BRAND = brand.name;
    const logoUrl = absolutizeLogoUrl(brand.logo_dark);

    const articleCards = articles.map(article => {
      const authors = article.authors?.map(a => a.name_user).join(', ') || article.author_name || '';
      const excerpt = article.excerpt_article
        ? article.excerpt_article.substring(0, 200) + (article.excerpt_article.length > 200 ? '...' : '')
        : '';
      return `
        <div style="border:1px solid #e8e8e8; border-radius:10px; padding:24px; margin-bottom:20px; background:#fff;">
          <p style="margin:0 0 6px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#888;">${article.category_article || BRAND}</p>
          <h2 style="margin:0 0 10px; font-size:20px; color:#111; font-family:Georgia,serif; line-height:1.3;">${article.title_article}</h2>
          ${authors ? `<p style="margin:0 0 12px; font-size:13px; color:#666;">Por ${authors}</p>` : ''}
          ${excerpt ? `<p style="margin:0 0 16px; font-size:15px; color:#444; line-height:1.6;">${excerpt}</p>` : ''}
          <a href="${magazineUrl}?article=${article.id_article}" style="display:inline-block; padding:10px 22px; background:${BRAND_COLOR}; color:#fff; text-decoration:none; border-radius:6px; font-size:13px; font-weight:600;">Leer artículo</a>
        </div>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
      <body style="font-family:Arial,sans-serif; background:#f5f5f5; margin:0; padding:0;">
        <div style="max-width:620px; margin:0 auto; padding:32px 16px;">
          <div style="text-align:center; margin-bottom:32px;">
            <img src="${logoUrl}" alt="${BRAND}" style="height:60px; width:auto; display:inline-block; margin-bottom:8px;" />
            <p style="margin:0; font-size:13px; color:#888; letter-spacing:2px; text-transform:uppercase;">Recomendaciones</p>
          </div>
          ${introText ? `<div style="background:#fff; border-left:4px solid #111; padding:18px 24px; margin-bottom:28px; border-radius:0 8px 8px 0;"><p style="margin:0; font-size:15px; color:#333; line-height:1.7;">${introText.replace(/\n/g, '<br>')}</p></div>` : ''}
          ${articleCards}
          <div style="text-align:center; margin-top:40px; padding-top:24px; border-top:1px solid #e0e0e0;">
            <a href="${magazineUrl}" style="color:#111; font-size:13px;">Visitar ${BRAND}</a>
          </div>
          <p style="text-align:center; margin-top:16px; font-size:11px; color:#aaa;">Recibiste este correo porque te suscribiste a las recomendaciones de ${BRAND}.<br>Para darte de baja, entra a tu perfil en la plataforma.</p>
        </div>
      </body></html>
    `;

    const articleTitles = articles.map(a => a.title_article).join(', ');
    await transporter.sendMail({
      from: `"${BRAND}" <${process.env.EMAIL_USER}>`,
      to: subscriberEmail,
      subject: `Recomendaciones de ${BRAND}: ${articleTitles.substring(0, 60)}${articleTitles.length > 60 ? '...' : ''}`,
      html: htmlContent
    });

    return { success: true };
  } catch (error) {
    console.error(`Error sending newsletter to ${subscriberEmail}:`, error.message);
    return { success: false, error: error.message };
  }
};

export default {
  generateVerificationToken,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendContactToDevelopersEmail,
  sendNewsletterEmail
};
