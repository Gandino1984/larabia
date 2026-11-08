// back-end/models/contest_entry_model.js
//
// A contest's entries (magazine_workshops rows with kind_workshop =
// 'contest'): what each contestant sends — the title of their work, a short
// note and the work itself, pasted and/or as a file (kept private in
// uploads/contest-entries: only its author and the contest's managers
// download it). One per person and contest; sending it is signing up
// (workshop_reservations). Replaceable or withdrawable while sign-ups are
// open. Migration 036; synced at boot (index.js).
import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";
import user_model from "./user_model.js";
import magazine_workshop_model from "./magazine_workshop_model.js";

const contest_entry_model = sequelize.define(
    "contest_entry",
    {
        id_entry: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        workshop_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false
        },
        user_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false
        },
        title_entry: {
            type: DataTypes.STRING(150),
            allowNull: false
        },
        // A few lines about it (≤ 600 characters).
        note_entry: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        // The work pasted in the form.
        text_entry: {
            type: DataTypes.TEXT('medium'),
            allowNull: true
        },
        // The attached file: its name on disk and the name it was sent with.
        file_entry: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        file_name_entry: {
            type: DataTypes.STRING(255),
            allowNull: true
        }
    },
    {
        tableName: "contest_entries",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['workshop_id', 'user_id'], name: 'uq_contest_entry' },
            { fields: ['user_id'], name: 'idx_contest_entry_user' }
        ]
    }
);

magazine_workshop_model.hasMany(contest_entry_model, { foreignKey: 'workshop_id', as: 'entries', onDelete: 'CASCADE' });
contest_entry_model.belongsTo(magazine_workshop_model, { foreignKey: 'workshop_id', as: 'contest', onDelete: 'CASCADE' });
user_model.hasMany(contest_entry_model, { foreignKey: 'user_id', as: 'contestEntries', onDelete: 'CASCADE' });
contest_entry_model.belongsTo(user_model, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

export default contest_entry_model;
