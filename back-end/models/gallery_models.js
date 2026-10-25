// back-end/models/gallery_models.js
//
// The Galería (migrations 027, 028, 030): one exhibition per visual artist
// (user.is_artist), organised in obras — `gallery_pieces`, up to PIECES_MAX —
// each with up to PIECE_WORKS_MAX illustrations. An illustration is a row of
// `gallery_works` (a "work" in the code and the API: one image, its title and
// description), reviewed by a super admin before it's shown. Super admins
// have no limits. Synced at boot in this order (each references the one before).
// Talking to an artist is the magazine's chat now (models/chat_models.js); the
// old gallery_conversations / gallery_messages tables are no longer used.
import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";
import user_model from "./user_model.js";

// Obras per exhibition, and illustrations per obra (super admins: no limit).
export const PIECES_MAX = 5;
export const PIECE_WORKS_MAX = 10;
export const WORK_DESCRIPTION_MAX = 300;
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

// An obra: a title and its illustrations, in order.
export const gallery_piece_model = sequelize.define("gallery_piece", {
    id_piece: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    exhibition_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    // NULL: «Sin título».
    title_piece: { type: DataTypes.STRING(150), allowNull: true },
    position_piece: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }
}, {
    tableName: "gallery_pieces", ...timestamps,
    indexes: [{ fields: ['exhibition_id'], name: 'idx_piece_exhibition' }]
});

// An illustration (one image) of an obra.
export const gallery_work_model = sequelize.define("gallery_work", {
    id_work: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    exhibition_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    // Its obra (NULL only before the boot step that groups older ones).
    piece_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    // The file in uploads/gallery.
    image_work: { type: DataTypes.STRING(255), allowNull: false },
    // NULL: «Sin título».
    title_work: { type: DataTypes.STRING(150), allowNull: true },
    description_work: { type: DataTypes.STRING(WORK_DESCRIPTION_MAX), allowNull: true },
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
        { fields: ['piece_id'], name: 'idx_work_piece' },
        { fields: ['status_work'], name: 'idx_work_status' }
    ]
});

user_model.hasOne(gallery_exhibition_model, { foreignKey: 'user_id', as: 'exhibition', onDelete: 'CASCADE' });
gallery_exhibition_model.belongsTo(user_model, { foreignKey: 'user_id', as: 'artist', onDelete: 'CASCADE' });
gallery_exhibition_model.hasMany(gallery_piece_model, { foreignKey: 'exhibition_id', as: 'pieces', onDelete: 'CASCADE' });
gallery_piece_model.belongsTo(gallery_exhibition_model, { foreignKey: 'exhibition_id', as: 'exhibition', onDelete: 'CASCADE' });
gallery_exhibition_model.hasMany(gallery_work_model, { foreignKey: 'exhibition_id', as: 'works', onDelete: 'CASCADE' });
gallery_work_model.belongsTo(gallery_exhibition_model, { foreignKey: 'exhibition_id', as: 'exhibition', onDelete: 'CASCADE' });
gallery_piece_model.hasMany(gallery_work_model, { foreignKey: 'piece_id', as: 'works', onDelete: 'CASCADE' });
gallery_work_model.belongsTo(gallery_piece_model, { foreignKey: 'piece_id', as: 'piece', onDelete: 'CASCADE' });

/** Creates the tables that don't exist yet, in dependency order. */
export async function syncGalleryTables() {
    await gallery_exhibition_model.sync();
    // Added after the table existed in production (migration 028).
    const qi = sequelize.getQueryInterface();
    if (!(await qi.describeTable('gallery_exhibitions')).prepared_by) {
        await qi.addColumn('gallery_exhibitions', 'prepared_by', { type: DataTypes.INTEGER.UNSIGNED, allowNull: true });
        console.log('>>> Added gallery_exhibitions.prepared_by');
    }
    await gallery_piece_model.sync();
    // Obras (migration 030): on a table from before, the illustration's obra
    // and description — added before syncing it (its indexes need them).
    const tables = (await qi.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName));
    if (tables.includes('gallery_works')) {
        const works = await qi.describeTable('gallery_works');
        if (!works.piece_id) {
            await qi.addColumn('gallery_works', 'piece_id', {
                type: DataTypes.INTEGER.UNSIGNED, allowNull: true,
                references: { model: 'gallery_pieces', key: 'id_piece' }, onDelete: 'CASCADE'
            });
            console.log('>>> Added gallery_works.piece_id');
        }
        if (!works.description_work) {
            await qi.addColumn('gallery_works', 'description_work', { type: DataTypes.STRING(WORK_DESCRIPTION_MAX), allowNull: true });
            console.log('>>> Added gallery_works.description_work');
        }
    }
    await gallery_work_model.sync();
    // Works from before the obras: each becomes an obra of its own (with its
    // title and place), so nothing is merged; artists can regroup them.
    const loose = await gallery_work_model.findAll({ where: { piece_id: null }, order: [['exhibition_id', 'ASC'], ['position_work', 'ASC'], ['id_work', 'ASC']] });
    for (const w of loose) {
        const piece = await gallery_piece_model.create({ exhibition_id: w.exhibition_id, title_piece: w.title_work, position_piece: w.position_work });
        await w.update({ piece_id: piece.id_piece, position_work: 0 }, { silent: true });
    }
    if (loose.length) console.log(`>>> Gallery: ${loose.length} work(s) became obras`);
}
