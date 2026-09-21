// back-end/models/article_comment_model.js
import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";
import magazine_article_model from "./magazine_article_model.js";
import user_model from "./user_model.js";

const article_comment_model = sequelize.define(
    "article_comment",
    {
        id_comment: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        article_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false
        },
        user_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false
        },
        content_comment: {
            type: DataTypes.TEXT,
            allowNull: false
        }
    },
    {
        tableName: "article_comments",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['article_id'], name: 'idx_article_comments_article_id' }
        ]
    }
);

magazine_article_model.hasMany(article_comment_model, {
    foreignKey: 'article_id',
    as: 'comments',
    onDelete: 'CASCADE'
});
article_comment_model.belongsTo(magazine_article_model, { foreignKey: 'article_id', as: 'article' });
article_comment_model.belongsTo(user_model, { foreignKey: 'user_id', as: 'user' });

export default article_comment_model;
