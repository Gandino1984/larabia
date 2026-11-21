// back-end/models/user_notification_model.js
//
// The bell's notifications that stay until their person deletes them. The
// front-end works out the notifications from what's going on (new articles,
// answers, reviews, comments…: app_context/NotificationContext.jsx) and keeps
// a copy of each informational one here, the first time it sees it:
//   notif_key   its stable id (e.g. «article-12», «contest-review-9-approved»)
//   payload     how to show it again: { title, message } (each a text or a
//               translation key + values) and `target` (what it opens)
//   read_at     the person opened the bell after it came (not bold any more)
//   dismissed_at the person deleted it: hidden for good (the row stays a while
//               so the same notification isn't saved again; cleaned up later)
// Notifications that need an answer (invitations, requests) aren't kept: they
// go when answered. Migration 040; created at boot (index.js).
import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";
import user_model from "./user_model.js";

const user_notification_model = sequelize.define(
    "user_notification",
    {
        id_notification: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false
        },
        notif_key: {
            type: DataTypes.STRING(191),
            allowNull: false
        },
        type_notification: {
            type: DataTypes.STRING(40),
            allowNull: false
        },
        payload_notification: {
            type: DataTypes.JSON,
            allowNull: true
        },
        event_at: {
            type: DataTypes.DATE,
            allowNull: false
        },
        read_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        dismissed_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    },
    {
        tableName: "user_notifications",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['user_id', 'notif_key'], name: 'uq_user_notification' },
            { fields: ['user_id', 'dismissed_at', 'event_at'], name: 'idx_user_notification_list' }
        ]
    }
);

user_model.hasMany(user_notification_model, { foreignKey: 'user_id', as: 'notifications', onDelete: 'CASCADE' });
user_notification_model.belongsTo(user_model, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

export default user_notification_model;
