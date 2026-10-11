// back-end/models/workshop_invitation_model.js
//
// A workshop manager invites a reader (subscriber or magazine team) to a
// workshop. While `pending` the invitation holds a place; the reader accepts
// (→ a reservation) or declines (→ the place is free again). The inviter is
// notified of the answer until they've seen it (`inviter_seen`).
import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";
import magazine_workshop_model from "./magazine_workshop_model.js";
import user_model from "./user_model.js";

export const INVITATION_STATUSES = ['pending', 'accepted', 'declined'];

const workshop_invitation_model = sequelize.define(
    "workshop_invitation",
    {
        id_invitation: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        workshop_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false
        },
        inviter_user_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false
        },
        invitee_user_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false
        },
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'pending'
        },
        responded_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        inviter_seen: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    },
    {
        tableName: "workshop_invitations",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['workshop_id', 'invitee_user_id'], name: 'unique_workshop_invitation' }
        ]
    }
);

magazine_workshop_model.hasMany(workshop_invitation_model, {
    foreignKey: 'workshop_id',
    as: 'invitations',
    onDelete: 'CASCADE'
});
workshop_invitation_model.belongsTo(magazine_workshop_model, { foreignKey: 'workshop_id', as: 'workshop' });
workshop_invitation_model.belongsTo(user_model, { foreignKey: 'inviter_user_id', as: 'inviter', onDelete: 'CASCADE' });
workshop_invitation_model.belongsTo(user_model, { foreignKey: 'invitee_user_id', as: 'invitee', onDelete: 'CASCADE' });

export default workshop_invitation_model;
