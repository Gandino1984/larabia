// back-end/models/project_subscription_model.js
import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";
import magazine_project_model from "./magazine_project_model.js";
import user_model from "./user_model.js";

const project_subscription_model = sequelize.define(
    "project_subscription",
    {
        id_subscription: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        project_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false
        },
        user_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false
        }
    },
    {
        tableName: "project_subscriptions",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['project_id', 'user_id'], name: 'unique_project_subscription' }
        ]
    }
);

magazine_project_model.hasMany(project_subscription_model, {
    foreignKey: 'project_id',
    as: 'subscriptions',
    onDelete: 'CASCADE'
});
project_subscription_model.belongsTo(magazine_project_model, { foreignKey: 'project_id', as: 'project' });
project_subscription_model.belongsTo(user_model, { foreignKey: 'user_id', as: 'user' });

export default project_subscription_model;
