import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";

/**
 * Singleton table. The single row's id is always 1 — see the
 * chk_magazine_theme_singleton check constraint in 005_add_magazine_theme.sql.
 * Always read/write via id=1; never paginate or list.
 *
 * Holds the super-admin-configurable appearance: a color-token override map,
 * the landing-page background, and global animation behavior. All defaults
 * reproduce the original hardcoded design.
 */
const magazine_theme_model = sequelize.define(
    "magazine_theme",
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            allowNull: false,
            defaultValue: 1
        },
        preset: {
            type: DataTypes.STRING(40),
            allowNull: false,
            defaultValue: 'default',
            comment: 'Active preset key; "default" reproduces the original design'
        },
        tokens: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'CSS custom-property overrides as { "--color-bg": "#252525", ... }'
        },
        landing_bg_type: {
            type: DataTypes.ENUM('color', 'image'),
            allowNull: false,
            defaultValue: 'color'
        },
        landing_bg_value: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'Hex color or /uploads/theme/... path'
        },
        animations_enabled: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        animation_speed: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: 'normal',
            comment: 'slow | normal | fast'
        },
        respect_reduced_motion: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        updated_by: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            comment: 'FK to user — last super admin to edit'
        }
    },
    {
        tableName: "magazine_theme",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
);

export default magazine_theme_model;
