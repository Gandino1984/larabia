import contactController from "./contact_controller.js";

async function sendContactMessage(req, res) {
    try {
        const { name, email, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ error: "Campos requeridos: name, email, message" });
        }
        const result = await contactController.sendContactMessage({ name, email, message });
        if (result.error) return res.status(400).json(result);
        res.status(200).json(result);
    } catch (err) {
        console.error("Error in contact sendContactMessage API:", err);
        res.status(500).json({ error: "Error al enviar el mensaje de contacto", details: err.message });
    }
}

export default { sendContactMessage };
