// back-end/models/author_profile_model.js
import { DataTypes } from 'sequelize';
import sequelize from "../config/sequelize.js";
import user_model from "./user_model.js";

const author_profile_model = sequelize.define('author_profile', {
    id_author_profile: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      unique: true,
      comment: 'FK to user table'
    },
    display_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Public display name'
    },
    bio_text: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Author bio/presentation'
    },
    specialty_tags: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of specialty/genre tags'
    },
    website_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    twitter_handle: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    instagram_handle: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    profile_image: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
      comment: 'Custom profile image filename (WebP). NULL = use Google account image.'
    },
    status_profile: {
      type: DataTypes.ENUM('draft', 'published'),
      defaultValue: 'draft'
    },
    featured_profile: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    view_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0
    }
  }, {
    tableName: 'author_profiles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

// Define associations
author_profile_model.belongsTo(user_model, {
  foreignKey: 'user_id',
  as: 'user'
});

user_model.hasOne(author_profile_model, {
  foreignKey: 'user_id',
  as: 'author_profile'
});

export default author_profile_model;
