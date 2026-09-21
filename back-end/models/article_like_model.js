// back-end/models/article_like_model.js
import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";
import magazine_article_model from "./magazine_article_model.js";
import user_model from "./user_model.js";

const article_like_model = sequelize.define(
    "article_like",
    {
        id_like: {
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
        }
    },
    {
        tableName: "article_likes",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['article_id', 'user_id'], name: 'unique_article_like' }
        ]
    }
);

magazine_article_model.hasMany(article_like_model, {
    foreignKey: 'article_id',
    as: 'likes',
    onDelete: 'CASCADE'
});
article_like_model.belongsTo(magazine_article_model, { foreignKey: 'article_id', as: 'article' });
article_like_model.belongsTo(user_model, { foreignKey: 'user_id', as: 'user' });

export default article_like_model;
