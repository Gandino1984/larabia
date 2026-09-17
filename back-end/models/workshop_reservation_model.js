// back-end/models/workshop_reservation_model.js
import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";
import magazine_workshop_model from "./magazine_workshop_model.js";
import user_model from "./user_model.js";

const workshop_reservation_model = sequelize.define(
    "workshop_reservation",
    {
        id_reservation: {
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
        }
    },
    {
        tableName: "workshop_reservations",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['workshop_id', 'user_id'], name: 'unique_workshop_reservation' }
        ]
    }
);

magazine_workshop_model.hasMany(workshop_reservation_model, {
    foreignKey: 'workshop_id',
    as: 'reservations',
    onDelete: 'CASCADE'
});
workshop_reservation_model.belongsTo(magazine_workshop_model, { foreignKey: 'workshop_id', as: 'workshop' });
workshop_reservation_model.belongsTo(user_model, { foreignKey: 'user_id', as: 'user' });

export default workshop_reservation_model;
