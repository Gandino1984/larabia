// back-end/models/gallery_models.js
//
// The Galería (migration 027): one exhibition per visual artist (user.is_artist)
// with up to 7 works, each reviewed by a super admin before it's shown; and
// the conversations visitors with an account open with an artist, with their
// messages. Synced at boot in this order (each references the one before).
import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";
import user_model from "./user_model.js";

export const WORKS_MAX = 15;
export const WORK_STATUSES = ['pending', 'approved', 'rejected'];

const timestamps = { timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' };

export const gallery_exhibition_model = sequelize.define("gallery_exhibition", {
    id_exhibition: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: 'uq_exhibition_user' },
    // NULL: the artist's name.
    title: { type: DataTypes.STRING(120), allowNull: true },
    statement: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: "gallery_exhibitions", ...timestamps });

export const gallery_work_model = sequelize.define("gallery_work", {
    id_work: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    exhibition_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    // The file in uploads/gallery.
    image_work: { type: DataTypes.STRING(255), allowNull: false },
    // NULL: «Sin título».
    title_work: { type: DataTypes.STRING(150), allowNull: true },
    // The image's size in pixels, read from the uploaded file.
    width_px: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    height_px: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    position_work: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    status_work: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
    rejection_reason: { type: DataTypes.STRING(500), allowNull: true },
    reviewed_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    reviewed_at: { type: DataTypes.DATE, allowNull: true },
    // false: the artist hasn't seen the review yet (their bell).
    review_seen: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
    tableName: "gallery_works", ...timestamps,
    indexes: [
        { fields: ['exhibition_id'], name: 'idx_work_exhibition' },
        { fields: ['status_work'], name: 'idx_work_status' }
    ]
});

export const gallery_conversation_model = sequelize.define("gallery_conversation", {
    id_conversation: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    artist_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    visitor_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    last_message_at: { type: DataTypes.DATE, allowNull: true },
    // When each side last read it (their unread = messages from the other after it).
    artist_read_at: { type: DataTypes.DATE, allowNull: true },
    visitor_read_at: { type: DataTypes.DATE, allowNull: true }
}, {
    tableName: "gallery_conversations", ...timestamps,
    indexes: [
        { unique: true, fields: ['artist_id', 'visitor_id'], name: 'uq_conversation' },
        { fields: ['visitor_id'], name: 'idx_conversation_visitor' }
    ]
});

export const gallery_message_model = sequelize.define("gallery_message", {
    id_message: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    conversation_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    sender_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false }
}, {
    tableName: "gallery_messages", ...timestamps,
    indexes: [{ fields: ['conversation_id'], name: 'idx_message_conversation' }]
});

user_model.hasOne(gallery_exhibition_model, { foreignKey: 'user_id', as: 'exhibition', onDelete: 'CASCADE' });
gallery_exhibition_model.belongsTo(user_model, { foreignKey: 'user_id', as: 'artist', onDelete: 'CASCADE' });
gallery_exhibition_model.hasMany(gallery_work_model, { foreignKey: 'exhibition_id', as: 'works', onDelete: 'CASCADE' });
gallery_work_model.belongsTo(gallery_exhibition_model, { foreignKey: 'exhibition_id', as: 'exhibition', onDelete: 'CASCADE' });
gallery_conversation_model.belongsTo(user_model, { foreignKey: 'artist_id', as: 'artist', onDelete: 'CASCADE' });
gallery_conversation_model.belongsTo(user_model, { foreignKey: 'visitor_id', as: 'visitor', onDelete: 'CASCADE' });
gallery_conversation_model.hasMany(gallery_message_model, { foreignKey: 'conversation_id', as: 'messages', onDelete: 'CASCADE' });
gallery_message_model.belongsTo(gallery_conversation_model, { foreignKey: 'conversation_id', as: 'conversation', onDelete: 'CASCADE' });

/** Creates the tables that don't exist yet, in dependency order. */
export async function syncGalleryTables() {
    await gallery_exhibition_model.sync();
    await gallery_work_model.sync();
    await gallery_conversation_model.sync();
    await gallery_message_model.sync();
}
