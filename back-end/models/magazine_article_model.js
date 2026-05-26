// back-end/models/magazine_article_model.js
import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";

const magazine_article_model = sequelize.define(
    "magazine_article",
    {
        id_article: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        title_article: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        content_article: {
            type: DataTypes.TEXT('long'),
            allowNull: false
        },
        excerpt_article: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Short summary/preview of the article'
        },
        author_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            comment: 'Foreign key to users table'
        },
        author_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Author display name'
        },
        project_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            comment: 'Foreign key to magazine_projects table - optional'
        },
        cover_image_article: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        category_article: {
            type: DataTypes.STRING(100),
            allowNull: true,
            defaultValue: 'general'
        },
        tags_article: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Array of tags for the article'
        },
        date_published: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Publication date - null for drafts'
        },
        status_article: {
            type: DataTypes.ENUM('draft', 'pending_approval', 'published'),
            allowNull: false,
            defaultValue: 'draft'
        },
        featured_article: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Featured articles appear prominently on homepage'
        },
        is_premium: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'When true, only premium_reader / editor / super_admin can read'
        },
        view_count_article: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            defaultValue: 0
        },
        active_article: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: 'Soft delete - inactive articles are hidden'
        }
    },
    {
        tableName: "magazine_articles",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
);

export default magazine_article_model;
