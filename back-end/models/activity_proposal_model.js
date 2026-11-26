// back-end/models/activity_proposal_model.js
//
// «Propón una actividad» (Barrio): anyone — with an account already or making
// one by signing in with Google — proposes a workshop or an open call /
// contest. Two in progress at most per person. Admins and super admins read
// them and decide: 'considering' (approved: the person gets an email saying
// we've received it and are considering it) or 'declined'. Migration 041;
// created at boot (index.js).
import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";
import user_model from "./user_model.js";

export const ACTIVITY_KINDS = ['workshop', 'call'];
export const ACTIVITY_STATUSES = ['new', 'considering', 'declined'];

const activity_proposal_model = sequelize.define(
    "activity_proposal",
    {
        id_activity_proposal: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false
        },
        // 'workshop' | 'call' (an open call or a contest).
        kind_proposal: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        title_proposal: {
            type: DataTypes.STRING(150),
            allowNull: false
        },
        // What it is, who it's for, how it would work.
        description_proposal: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        // Dates, place, duration, materials, who would lead it… (optional).
        details_proposal: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        // The language they wrote from: the email goes in it (es | en | eu).
        lang_proposal: {
            type: DataTypes.STRING(5),
            allowNull: false,
            defaultValue: 'es'
        },
        status_proposal: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'new'
        },
        reviewed_by: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true
        },
        reviewed_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        // When the «we're considering it» email went out (sent once).
        email_sent_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    },
    {
        tableName: "activity_proposals",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['user_id', 'status_proposal'], name: 'idx_activity_proposal_user' },
            { fields: ['status_proposal', 'created_at'], name: 'idx_activity_proposal_status' }
        ]
    }
);

user_model.hasMany(activity_proposal_model, { foreignKey: 'user_id', as: 'activityProposals', onDelete: 'CASCADE' });
activity_proposal_model.belongsTo(user_model, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

export default activity_proposal_model;
