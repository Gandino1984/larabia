// back-end/models/workshop_block_model.js
//
// A user blocked from one workshop by its managers (super admins, or an admin
// who created or teaches it): they can't book a place in it. Blocking also
// removes their reservation, if they had one.
import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";
import magazine_workshop_model from "./magazine_workshop_model.js";
import user_model from "./user_model.js";

const workshop_block_model = sequelize.define(
    "workshop_block",
    {
        id_block: {
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
        blocked_by: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true
        }
    },
    {
        tableName: "workshop_blocks",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['workshop_id', 'user_id'], name: 'unique_workshop_block' }
        ]
    }
);

magazine_workshop_model.hasMany(workshop_block_model, {
    foreignKey: 'workshop_id',
    as: 'blocks',
    onDelete: 'CASCADE'
});
workshop_block_model.belongsTo(magazine_workshop_model, { foreignKey: 'workshop_id', as: 'workshop' });
workshop_block_model.belongsTo(user_model, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

export default workshop_block_model;
