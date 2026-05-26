import { sendContactToDevelopersEmail } from "../../services/emailService.js";

function validateContactData(contactData) {
    const errors = [];
    if (!contactData.name || contactData.name.trim() === '') {
        errors.push("El nombre es obligatorio");
    } else if (contactData.name.length > 100) {
        errors.push("El nombre no puede exceder 100 caracteres");
    }
    if (!contactData.email || contactData.email.trim() === '') {
        errors.push("El email es obligatorio");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactData.email)) {
        errors.push("El email no es válido");
    }
    if (!contactData.message || contactData.message.trim() === '') {
        errors.push("El mensaje es obligatorio");
    } else if (contactData.message.length > 5000) {
        errors.push("El mensaje no puede exceder 5000 caracteres");
    }
    return { isValid: errors.length === 0, errors };
}

async function sendContactMessage(contactData) {
    try {
        const validation = validateContactData(contactData);
        if (!validation.isValid) {
            return { error: "Datos inválidos", details: validation.errors.join(', ') };
        }

        const result = await sendContactToDevelopersEmail(
            contactData.name.trim(),
            contactData.email.trim(),
            contactData.message.trim(),
            `Contacto desde La Rabia: ${contactData.name}`
        );

        if (!result.success) {
            return { error: "Error al enviar el mensaje", details: result.error };
        }

        return {
            message: "Mensaje enviado exitosamente. Nos pondremos en contacto contigo pronto.",
            success: true
        };
    } catch (err) {
        console.error("-> contact_controller.js - sendContactMessage() - Error:", err);
        return { error: "Error al enviar el mensaje de contacto", details: err.message };
    }
}

export default { sendContactMessage };
