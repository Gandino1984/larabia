// back-end/models/call_vote_model.js
//
// Votes on the works of a convocatoria (magazine_workshops, kind 'contest';
// the works are articles with call_id_article). Two tallies, kept apart:
//   - public (jury_vote false): anyone with an account, ONE vote per call;
//   - super admins (jury_vote true): up to THREE different works per call.
// A vote can be withdrawn or moved while voting is open (until the
// resolution day). Nobody votes for their own work. The limits are checked
// in controllers/magazine_workshop/call_vote_api_controller.js; the unique
// key stops the same person voting twice for the same work. Migration 038;
// created at boot (index.js).
import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";
import user_model from "./user_model.js";
import magazine_workshop_model from "./magazine_workshop_model.js";
import magazine_article_model from "./magazine_article_model.js";

const call_vote_model = sequelize.define(
    "call_vote",
    {
        id_vote: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        workshop_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false
        },
        article_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false
        },
        user_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false
        },
        jury_vote: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    },
    {
        tableName: "call_votes",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['workshop_id', 'user_id', 'article_id'], name: 'uq_call_vote' },
            { fields: ['article_id'], name: 'idx_call_vote_article' },
            { fields: ['user_id'], name: 'idx_call_vote_user' }
        ]
    }
);

magazine_workshop_model.hasMany(call_vote_model, { foreignKey: 'workshop_id', as: 'votes', onDelete: 'CASCADE' });
call_vote_model.belongsTo(magazine_workshop_model, { foreignKey: 'workshop_id', as: 'call', onDelete: 'CASCADE' });
magazine_article_model.hasMany(call_vote_model, { foreignKey: 'article_id', as: 'callVotes', onDelete: 'CASCADE' });
call_vote_model.belongsTo(magazine_article_model, { foreignKey: 'article_id', as: 'article', onDelete: 'CASCADE' });
user_model.hasMany(call_vote_model, { foreignKey: 'user_id', as: 'callVotes', onDelete: 'CASCADE' });
call_vote_model.belongsTo(user_model, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

export default call_vote_model;
