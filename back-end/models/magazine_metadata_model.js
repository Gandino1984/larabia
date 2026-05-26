import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";

/**
 * Singleton table. The single row's id is always 1 — see the
 * chk_magazine_metadata_singleton check constraint in 003_add_magazine_metadata.sql.
 * Always read/write via id=1; never paginate or list.
 */
const magazine_metadata_model = sequelize.define(
    "magazine_metadata",
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            allowNull: false,
            defaultValue: 1
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            defaultValue: 'La Rabia'
        },
        slogan: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        logo_light: {
            type: DataTypes.STRING(255),
            allowNull: true,
            defaultValue: '/LogoLaRabiaWhite.png',
            comment: 'Logo shown on dark backgrounds'
        },
        logo_dark: {
            type: DataTypes.STRING(255),
            allowNull: true,
            defaultValue: '/logoLaRabiaBlack.png',
            comment: 'Logo shown on light backgrounds'
        },
        updated_by: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            comment: 'FK to user — last super admin to edit'
        }
    },
    {
        tableName: "magazine_metadata",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
);

export default magazine_metadata_model;
