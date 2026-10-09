// back-end/models/reader_subscription_model.js
//
// A reader's paid subscription to the magazine (Stripe). One row per user,
// kept in sync by the Stripe webhook. It only supports the magazine and shows
// a "suscriptor/a" badge — it grants no extra permissions.
import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";

const reader_subscription_model = sequelize.define(
    "reader_subscription",
    {
        id_reader_subscription: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false
        },
        stripe_customer_id: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        stripe_subscription_id: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        // Stripe subscription status: active, trialing, past_due, canceled,
        // incomplete, incomplete_expired, unpaid, paused.
        status: {
            type: DataTypes.STRING(30),
            allowNull: true
        },
        // 'monthly' | 'yearly'
        plan: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        current_period_end: {
            type: DataTypes.DATE,
            allowNull: true
        },
        cancel_at_period_end: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    },
    {
        tableName: "reader_subscriptions",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['user_id'], name: 'unique_reader_subscription_user' },
            { fields: ['stripe_customer_id'], name: 'idx_reader_subscription_customer' }
        ]
    }
);

/** Statuses that count as "subscribed" (badge shown). */
export const ACTIVE_STATUSES = ['active', 'trialing', 'past_due'];

export default reader_subscription_model;
