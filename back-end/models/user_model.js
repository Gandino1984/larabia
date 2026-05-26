import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";

const user_model = sequelize.define("user", {
    id_user: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    name_user: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    email_user: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    pass_user: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    google_id: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    auth_provider: {
        type: DataTypes.ENUM('local', 'google'),
        allowNull: false,
        defaultValue: 'local'
    },
    image_user: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    location_user: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: ''
    },
    age_user: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 18
    },
    email_verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    verification_token: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    verification_token_expires: {
        type: DataTypes.DATE,
        allowNull: true
    },
    password_reset_token: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    password_reset_token_expires: {
        type: DataTypes.DATE,
        allowNull: true
    },
    is_editor: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    is_super_admin: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Magazine super-admin: can edit/delete any article'
    },
    is_premium_reader: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Subscriber-tier reader: can access articles with is_premium=1'
    },
    receives_newsletter: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    timestamps: false,
    freezeTableName: true,
    indexes: [
        { unique: true, fields: ['email_user'], name: 'unique_email_user' },
        { fields: ['is_editor'], name: 'idx_is_editor' },
        { fields: ['is_super_admin'], name: 'idx_is_super_admin' },
        { fields: ['is_premium_reader'], name: 'idx_is_premium_reader' },
        { fields: ['password_reset_token'], name: 'idx_password_reset_token' }
    ]
});

export default user_model;
