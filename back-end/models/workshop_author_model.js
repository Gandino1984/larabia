// back-end/models/workshop_author_model.js
import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";
import magazine_workshop_model from "./magazine_workshop_model.js";
import user_model from "./user_model.js";

const workshop_author_model = sequelize.define(
    "workshop_author",
    {
        id_workshop_author: {
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
        author_order: {
            type: DataTypes.TINYINT.UNSIGNED,
            allowNull: false,
            defaultValue: 0
        }
    },
    {
        tableName: "workshop_authors",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['workshop_id', 'user_id'], name: 'unique_workshop_author' }
        ]
    }
);

magazine_workshop_model.hasMany(workshop_author_model, {
    foreignKey: 'workshop_id',
    as: 'workshop_authors',
    onDelete: 'CASCADE'
});
workshop_author_model.belongsTo(magazine_workshop_model, { foreignKey: 'workshop_id', as: 'workshop' });
workshop_author_model.belongsTo(user_model, { foreignKey: 'user_id', as: 'user' });

export default workshop_author_model;
