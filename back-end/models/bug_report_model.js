// back-end/models/bug_report_model.js
//
// «Reportar un error»: anyone with an account tells the team something on the
// web doesn't work — what happened, plus where they were (the page, the view,
// what was open) and their browser, language and screen, sent by the web. The
// super admins hear of it (Admin badge and bell) and mark it seen or fixed in
// Admin › Errores. Migration 035; synced at boot (index.js).
import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";
import user_model from "./user_model.js";

export const BUG_REPORT_STATUSES = ['new', 'seen', 'fixed'];

const bug_report_model = sequelize.define(
    "bug_report",
    {
        id_report: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false
        },
        // What happened, in their words (≤ 2000 characters).
        description_report: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        // The address they were on and the magazine's view (home, article…).
        page_report: {
            type: DataTypes.STRING(500),
            allowNull: true
        },
        view_report: {
            type: DataTypes.STRING(60),
            allowNull: true
        },
        // { open, language, screen, browser }: what was open (an article…)
        // and their device, to find the error.
        context_report: {
            type: DataTypes.JSON,
            allowNull: true
        },
        status_report: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'new'
        }
    },
    {
        tableName: "bug_reports",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['user_id'], name: 'idx_bug_report_user' },
            { fields: ['status_report'], name: 'idx_bug_report_status' }
        ]
    }
);

user_model.hasMany(bug_report_model, { foreignKey: 'user_id', as: 'bugReports', onDelete: 'CASCADE' });
bug_report_model.belongsTo(user_model, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

export default bug_report_model;
