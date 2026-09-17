// back-end/models/magazine_workshop_model.js
import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";

const magazine_workshop_model = sequelize.define(
    "magazine_workshop",
    {
        id_workshop: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        title_workshop: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        description_workshop: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        location_workshop: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        date_workshop: {
            type: DataTypes.DATE,
            allowNull: true
        },
        cover_image_workshop: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        capacity_workshop: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            comment: 'Max participants (aforo); NULL = unlimited'
        },
        author_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            comment: 'Legacy/primary creator'
        },
        author_name: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        active_workshop: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    },
    {
        tableName: "magazine_workshops",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
);

export default magazine_workshop_model;
