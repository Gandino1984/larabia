// back-end/models/open_space_proposal_model.js
//
// «Espacio abierto»: anyone with an account (no subscription needed) sends the
// magazine a literary proposal — a title, its kind, a short explanation and
// the text, pasted and/or as a file. The team reads it and marks it read,
// accepted or declined; the sender sees that status in the section.
import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";
import user_model from "./user_model.js";

export const PROPOSAL_KINDS = ['poesia', 'relato', 'microrrelato', 'cronica', 'ensayo', 'otro'];
export const PROPOSAL_STATUSES = ['new', 'read', 'accepted', 'declined'];

const open_space_proposal_model = sequelize.define(
    "open_space_proposal",
    {
        id_proposal: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false
        },
        title_proposal: {
            type: DataTypes.STRING(150),
            allowNull: false
        },
        kind_proposal: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'otro'
        },
        // The short explanation of the proposal (≤ 600 characters).
        summary_proposal: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        // The text itself when it's pasted in the form.
        text_proposal: {
            type: DataTypes.TEXT('medium'),
            allowNull: true
        },
        // The attached file: its name on disk (uploads/proposals, never served
        // publicly) and the name it was sent with.
        file_proposal: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        file_name_proposal: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        status_proposal: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'new'
        }
    },
    {
        tableName: "open_space_proposals",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['user_id'], name: 'idx_proposal_user' },
            { fields: ['status_proposal'], name: 'idx_proposal_status' }
        ]
    }
);

user_model.hasMany(open_space_proposal_model, { foreignKey: 'user_id', as: 'openSpaceProposals', onDelete: 'CASCADE' });
open_space_proposal_model.belongsTo(user_model, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

export default open_space_proposal_model;
