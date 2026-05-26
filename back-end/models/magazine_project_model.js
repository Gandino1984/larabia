// back-end/models/magazine_project_model.js
import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";

const magazine_project_model = sequelize.define(
    "magazine_project",
    {
        id_project: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        title_project: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        description_project: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Project description/summary'
        },
        author_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            comment: 'Foreign key to users table - project creator'
        },
        author_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Author display name'
        },
        cover_image_project: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        type_project: {
            type: DataTypes.ENUM(
                'ficción',
                'no-ficción',
                'ensayo',
                'académico',
                'científico',
                'periodístico',
                'poético',
                'narrativo',
                'experimental',
                'documental',
                'autobiográfico'
            ),
            allowNull: true,
            comment: 'Project type/genre'
        },
        format_project: {
            type: DataTypes.ENUM(
                'cómic',
                'crónica',
                'ensayo',
                'cuento',
                'multimedia',
                'podcast',
                'video',
                'fotografía',
                'ilustración',
                'performance',
                'instalación',
                'novela',
                'artículo',
                'reportaje',
                'entrevista',
                'poesía'
            ),
            allowNull: true,
            comment: 'Project format/medium'
        },
        date_published: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Publication date - null for drafts'
        },
        status_project: {
            type: DataTypes.ENUM('draft', 'published'),
            allowNull: false,
            defaultValue: 'draft'
        },
        featured_project: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Featured projects appear prominently'
        },
        view_count_project: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            defaultValue: 0
        },
        active_project: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: 'Soft delete - inactive projects are hidden'
        }
    },
    {
        tableName: "magazine_projects",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
);

export default magazine_project_model;
