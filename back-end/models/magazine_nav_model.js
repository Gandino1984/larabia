import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";

/**
 * Singleton table (id always 1 — see chk_magazine_nav_singleton in
 * 006_add_magazine_nav.sql). Holds the super-admin-configurable top-bar
 * navigation as a JSON array. NULL nav_config means "use the front-end's
 * built-in default nav", so the bar is unchanged until a super admin edits it.
 */
const magazine_nav_model = sequelize.define(
    "magazine_nav",
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            allowNull: false,
            defaultValue: 1
        },
        nav_config: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Ordered array of top-bar items; NULL = built-in default nav'
        },
        updated_by: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            comment: 'FK to user — last super admin to edit'
        }
    },
    {
        tableName: "magazine_nav",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
);

export default magazine_nav_model;
