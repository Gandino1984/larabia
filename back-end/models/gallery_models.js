// back-end/models/gallery_models.js
//
// The Galería (migration 027): one exhibition per visual artist (user.is_artist)
// with up to WORKS_MAX works, each reviewed by a super admin before it's
// shown. Synced at boot in this order (the works reference the exhibition).
// Talking to an artist is the magazine's chat now (models/chat_models.js); the
// old gallery_conversations / gallery_messages tables are no longer used.
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
    statement: { type: DataTypes.TEXT, allowNull: true },
    // The super admin who prepared it on the artist's behalf, until they
    // accept it (then NULL: it's theirs). Declining deletes a prepared one.
    prepared_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true }
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

user_model.hasOne(gallery_exhibition_model, { foreignKey: 'user_id', as: 'exhibition', onDelete: 'CASCADE' });
gallery_exhibition_model.belongsTo(user_model, { foreignKey: 'user_id', as: 'artist', onDelete: 'CASCADE' });
gallery_exhibition_model.hasMany(gallery_work_model, { foreignKey: 'exhibition_id', as: 'works', onDelete: 'CASCADE' });
gallery_work_model.belongsTo(gallery_exhibition_model, { foreignKey: 'exhibition_id', as: 'exhibition', onDelete: 'CASCADE' });

/** Creates the tables that don't exist yet, in dependency order. */
export async function syncGalleryTables() {
    await gallery_exhibition_model.sync();
    // Added after the table existed in production (migration 028).
    const qi = sequelize.getQueryInterface();
    if (!(await qi.describeTable('gallery_exhibitions')).prepared_by) {
        await qi.addColumn('gallery_exhibitions', 'prepared_by', { type: DataTypes.INTEGER.UNSIGNED, allowNull: true });
        console.log('>>> Added gallery_exhibitions.prepared_by');
    }
    await gallery_work_model.sync();
}
