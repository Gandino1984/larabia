// back-end/models/article_author_invitation_model.js
import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";
import magazine_article_model from "./magazine_article_model.js";
import user_model from "./user_model.js";

const article_author_invitation_model = sequelize.define(
    "article_author_invitation",
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        article_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            comment: 'FK to magazine_articles'
        },
        inviter_user_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            comment: 'Editor who sent the invitation'
        },
        invitee_user_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            comment: 'Editor being invited as co-author'
        },
        status: {
            type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
            allowNull: false,
            defaultValue: 'pending'
        }
    },
    {
        tableName: "article_author_invitations",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
);

// Associations
article_author_invitation_model.belongsTo(magazine_article_model, {
    foreignKey: 'article_id',
    as: 'article'
});

article_author_invitation_model.belongsTo(user_model, {
    foreignKey: 'inviter_user_id',
    as: 'inviter'
});

article_author_invitation_model.belongsTo(user_model, {
    foreignKey: 'invitee_user_id',
    as: 'invitee'
});

export default article_author_invitation_model;
