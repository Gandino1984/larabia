// back-end/models/article_block_model.js
import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";
import magazine_article_model from "./magazine_article_model.js";

const article_block_model = sequelize.define(
    "article_block",
    {
        id_block: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        article_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            comment: 'Foreign key to magazine_articles'
        },
        block_type: {
            type: DataTypes.ENUM('text', 'image', 'iframe', 'comic_panel'),
            allowNull: false,
            comment: 'Type of content block'
        },
        block_order: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            defaultValue: 0,
            comment: 'Order position in the article'
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Text content for text blocks'
        },
        // Image block metadata
        image_url: {
            type: DataTypes.STRING(500),
            allowNull: true,
            comment: 'URL or path to image file'
        },
        image_alt: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Alt text for accessibility'
        },
        image_caption: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Caption displayed below image'
        },
        // Iframe block metadata
        iframe_url: {
            type: DataTypes.STRING(500),
            allowNull: true,
            comment: 'URL for iframe embed'
        },
        iframe_width: {
            type: DataTypes.STRING(50),
            allowNull: true,
            defaultValue: '100%',
            comment: 'Width of iframe'
        },
        iframe_height: {
            type: DataTypes.STRING(50),
            allowNull: true,
            defaultValue: '400px',
            comment: 'Height of iframe'
        },
        // Interactive panel metadata
        is_interactive: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
            comment: 'Whether the panel is interactive (clickable)'
        },
        interaction_type: {
            type: DataTypes.ENUM('link', 'audio', 'iframe'),
            allowNull: true,
            comment: 'Type of interaction: link, audio, or iframe'
        },
        interaction_data: {
            type: DataTypes.STRING(500),
            allowNull: true,
            comment: 'Data for interaction: URL for link, audio file path for audio, iframe src URL for iframe'
        },
        // Audio playback settings
        audio_stop_panel: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Panel number where audio should stop playing (null = no auto-stop)'
        },
        audio_mode: {
            type: DataTypes.ENUM('loop', 'once'),
            allowNull: true,
            defaultValue: 'once',
            comment: 'Audio playback mode: loop (infinite) or once (play once and close)'
        }
    },
    {
        tableName: "article_blocks",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                name: 'idx_article_blocks_article_id',
                fields: ['article_id']
            },
            {
                name: 'idx_article_blocks_order',
                fields: ['article_id', 'block_order']
            }
        ]
    }
);

// Define relationship: Article has many blocks
magazine_article_model.hasMany(article_block_model, {
    foreignKey: 'article_id',
    as: 'blocks',
    onDelete: 'CASCADE'
});

article_block_model.belongsTo(magazine_article_model, {
    foreignKey: 'article_id',
    as: 'article'
});

export default article_block_model;
