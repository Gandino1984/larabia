// back-end/models/project_author_model.js
import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";
import magazine_project_model from "./magazine_project_model.js";
import user_model from "./user_model.js";

const project_author_model = sequelize.define(
    "project_author",
    {
        id_project_author: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        project_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            comment: 'Foreign key to magazine_projects table'
        },
        user_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            comment: 'Foreign key to users table'
        },
        author_order: {
            type: DataTypes.TINYINT.UNSIGNED,
            allowNull: false,
            defaultValue: 0,
            comment: '0=primary creator, 1=second, etc.'
        }
    },
    {
        tableName: "project_authors",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                unique: true,
                fields: ['project_id', 'user_id'],
                name: 'unique_project_user'
            },
            {
                fields: ['project_id'],
                name: 'idx_project_id'
            },
            {
                fields: ['user_id'],
                name: 'idx_user_id_project'
            }
        ]
    }
);

// Define relationships
magazine_project_model.hasMany(project_author_model, {
    foreignKey: 'project_id',
    as: 'project_authors',
    onDelete: 'CASCADE'
});

project_author_model.belongsTo(magazine_project_model, {
    foreignKey: 'project_id',
    as: 'project'
});

project_author_model.belongsTo(user_model, {
    foreignKey: 'user_id',
    as: 'user'
});

export default project_author_model;
