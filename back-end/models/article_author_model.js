// back-end/models/article_author_model.js
import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";
import magazine_article_model from "./magazine_article_model.js";
import user_model from "./user_model.js";

const article_author_model = sequelize.define(
    "article_author",
    {
        id_article_author: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        article_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            comment: 'Foreign key to magazine_articles table'
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
            comment: '0=first author, 1=second, etc.'
        }
    },
    {
        tableName: "article_authors",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                unique: true,
                fields: ['article_id', 'user_id'],
                name: 'unique_article_user'
            },
            {
                fields: ['article_id'],
                name: 'idx_article_id'
            },
            {
                fields: ['user_id'],
                name: 'idx_user_id'
            },
            {
                fields: ['article_id', 'author_order'],
                name: 'idx_article_order'
            }
        ]
    }
);

// Define relationships
magazine_article_model.hasMany(article_author_model, {
    foreignKey: 'article_id',
    as: 'article_authors',
    onDelete: 'CASCADE'
});

article_author_model.belongsTo(magazine_article_model, {
    foreignKey: 'article_id',
    as: 'article'
});

article_author_model.belongsTo(user_model, {
    foreignKey: 'user_id',
    as: 'user'
});

export default article_author_model;
