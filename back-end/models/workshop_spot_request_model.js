// back-end/models/workshop_spot_request_model.js
//
// A socio/a asks for an extra place in a FULL workshop (a members' perk).
// Its managers answer: accepting opens one more place (capacity + 1) and
// books it for them; declining doesn't. One request per person and workshop;
// the requester is told the answer until they've seen it (`requester_seen`).
import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";
import magazine_workshop_model from "./magazine_workshop_model.js";
import user_model from "./user_model.js";

export const SPOT_REQUEST_STATUSES = ['pending', 'accepted', 'declined'];

const workshop_spot_request_model = sequelize.define(
    "workshop_spot_request",
    {
        id_spot_request: {
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
        // A few words for the managers (optional, ≤ 300 characters).
        message: {
            type: DataTypes.STRING(300),
            allowNull: true
        },
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'pending'
        },
        responded_by: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true
        },
        responded_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        requester_seen: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    },
    {
        tableName: "workshop_spot_requests",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['workshop_id', 'user_id'], name: 'unique_workshop_spot_request' }
        ]
    }
);

magazine_workshop_model.hasMany(workshop_spot_request_model, { foreignKey: 'workshop_id', as: 'spotRequests', onDelete: 'CASCADE' });
workshop_spot_request_model.belongsTo(magazine_workshop_model, { foreignKey: 'workshop_id', as: 'workshop' });
workshop_spot_request_model.belongsTo(user_model, { foreignKey: 'user_id', as: 'requester', onDelete: 'CASCADE' });

export default workshop_spot_request_model;
