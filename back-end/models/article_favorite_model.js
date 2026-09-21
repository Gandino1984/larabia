// back-end/models/article_favorite_model.js
import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";
import magazine_article_model from "./magazine_article_model.js";
import user_model from "./user_model.js";

const article_favorite_model = sequelize.define(
    "article_favorite",
    {
        id_favorite: {
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
        tableName: "article_favorites",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['article_id', 'user_id'], name: 'unique_article_favorite' }
        ]
    }
);

magazine_article_model.hasMany(article_favorite_model, {
    foreignKey: 'article_id',
    as: 'favorites',
    onDelete: 'CASCADE'
});
article_favorite_model.belongsTo(magazine_article_model, { foreignKey: 'article_id', as: 'article' });
article_favorite_model.belongsTo(user_model, { foreignKey: 'user_id', as: 'user' });

export default article_favorite_model;
