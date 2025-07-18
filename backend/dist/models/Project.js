"use strict";
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User'); // Import User model for association
const Project = sequelize.define('Project', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id',
        },
    },
    settings: {
        type: DataTypes.JSON, // Stores JSON object for project-specific settings
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'active', // e.g., 'active', 'archived', 'paused'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'projects',
    timestamps: false,
});
// Define association
Project.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Project, { foreignKey: 'user_id' });
module.exports = Project;
