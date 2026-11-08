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
        // Where it takes place on the map (set by its creator with a Leaflet
        // picker); location_workshop stays as the place's visible name.
        lat_workshop: {
            type: DataTypes.DECIMAL(9, 6),
            allowNull: true
        },
        lng_workshop: {
            type: DataTypes.DECIMAL(9, 6),
            allowNull: true
        },
        // Who it's for: 'general' (adults) | 'infantil' (children).
        audience_workshop: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'general'
        },
        // Free: anyone signed in books a place. Otherwise (default) booking is
        // for socios/as and the magazine team. Migration 022.
        free_workshop: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        active_workshop: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        // 'workshop' | 'contest' (migration 034), chosen when it's created.
        // A contest has no date, place or capacity: sign-ups open and close
        // on two days, the jury decides on a third, and it can award a 1st,
        // 2nd and 3rd place and an honorable mention. Anyone signed in signs
        // up (no membership).
        kind_workshop: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'workshop'
        },
        registration_start_workshop: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        registration_end_workshop: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        resolution_date_workshop: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        // { first, second, third, mention }: each { prize, winner } — what the
        // place awards (shown from the start) and who won it (shown from the
        // jury's day on).
        awards_workshop: {
            type: DataTypes.JSON,
            allowNull: true
        },
        // Contests by anyone but a super admin wait for one: 'approved' |
        // 'pending' | 'rejected' (with a reason). Workshops are 'approved'.
        // review_seen_workshop: its creator has seen the latest decision (bell).
        review_status_workshop: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'approved'
        },
        rejection_reason_workshop: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        review_seen_workshop: {
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
