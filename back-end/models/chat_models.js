// back-end/models/chat_models.js — the magazine's chat (migration 029).
//
// A socio/a (paying member) asks an author or a visual artist to chat (from
// Autoras/es or the Galería): one conversation per pair, which goes
// requested → active (the author accepts) or declined, and active → ended
// (the author ends it). Asking again re-opens the same conversation, with
// its history. Messages are written only while it's active.
import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";
import user_model from "./user_model.js";

export const CHAT_STATUSES = ['requested', 'active', 'declined', 'ended'];
// Where it was (last) asked from.
export const CHAT_ORIGINS = ['authors', 'gallery'];

const timestamps = { timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' };
// To the millisecond: what the bell compares (a change vs. when it was seen, a
// message vs. when it was read) often happens within the same second.
// (A function: Sequelize writes into each attribute's definition, so they can't share one.)
const moment = () => ({ type: DataTypes.DATE(3), allowNull: true });

export const chat_conversation_model = sequelize.define("chat_conversation", {
    id_conversation: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    // The member who asks, and the author / artist asked.
    requester_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    host_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    origin: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'authors' },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'requested' },
    requested_at: moment(),
    // When the status last changed (asked, accepted, declined, ended).
    changed_at: moment(),
    // When the requester last saw a change the host made (their bell).
    requester_seen_at: moment(),
    last_message_at: moment(),
    // When each side last read it (their unread = messages from the other after it).
    requester_read_at: moment(),
    host_read_at: moment()
}, {
    tableName: "chat_conversations", ...timestamps,
    indexes: [
        { unique: true, fields: ['requester_id', 'host_id'], name: 'uq_chat_pair' },
        { fields: ['host_id'], name: 'idx_chat_host' }
    ]
});

export const chat_message_model = sequelize.define("chat_message", {
    id_message: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    conversation_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    sender_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    created_at: { type: DataTypes.DATE(3), allowNull: false },
    updated_at: { type: DataTypes.DATE(3), allowNull: false }
}, {
    tableName: "chat_messages", ...timestamps,
    indexes: [{ fields: ['conversation_id'], name: 'idx_chat_message_conversation' }]
});

chat_conversation_model.belongsTo(user_model, { foreignKey: 'requester_id', as: 'requester', onDelete: 'CASCADE' });
chat_conversation_model.belongsTo(user_model, { foreignKey: 'host_id', as: 'host', onDelete: 'CASCADE' });
chat_conversation_model.hasMany(chat_message_model, { foreignKey: 'conversation_id', as: 'messages', onDelete: 'CASCADE' });
chat_message_model.belongsTo(chat_conversation_model, { foreignKey: 'conversation_id', as: 'conversation', onDelete: 'CASCADE' });

/**
 * Creates the tables that don't exist yet; the first time, it brings over the
 * Galería's conversations (artist ↔ visitor, migration 027), as active ones.
 */
export async function syncChatTables() {
    await chat_conversation_model.sync();
    await chat_message_model.sync();
    const qi = sequelize.getQueryInterface();
    const tables = (await qi.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName));
    if (!tables.includes('gallery_conversations') || !tables.includes('gallery_messages')) return;
    if (await chat_conversation_model.count() > 0) return;
    const [[{ n }]] = await sequelize.query('SELECT COUNT(*) AS n FROM gallery_conversations');
    if (!n) return;
    await sequelize.transaction(async (transaction) => {
        await sequelize.query(`
            INSERT INTO chat_conversations
              (requester_id, host_id, origin, status, requested_at, changed_at, requester_seen_at,
               last_message_at, requester_read_at, host_read_at, created_at, updated_at)
            SELECT visitor_id, artist_id, 'gallery', 'active', created_at, created_at, created_at,
                   last_message_at, visitor_read_at, artist_read_at, created_at, updated_at
            FROM gallery_conversations`, { transaction });
        await sequelize.query(`
            INSERT INTO chat_messages (conversation_id, sender_id, body, created_at, updated_at)
            SELECT c.id_conversation, m.sender_id, m.body, m.created_at, m.updated_at
            FROM gallery_messages m
            JOIN gallery_conversations g ON g.id_conversation = m.conversation_id
            JOIN chat_conversations c ON c.requester_id = g.visitor_id AND c.host_id = g.artist_id
            ORDER BY m.id_message`, { transaction });
    });
    console.log(`>>> Chat: ${n} conversation(s) brought over from the Galería`);
}
