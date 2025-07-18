"use strict";
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Project = require('./Project'); // Import Project model for association
const Scraper = sequelize.define('Scraper', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    project_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Project,
            key: 'id',
        },
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    url: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isUrl: true,
        },
    },
    selectors: {
        type: DataTypes.JSON, // Stores JSON object for CSS selectors
    },
    pagination_config: {
        type: DataTypes.JSON, // Stores JSON object for pagination settings
    },
    browser_config: {
        type: DataTypes.JSON, // Stores JSON object for Puppeteer browser settings
    },
    schedule_config: {
        type: DataTypes.JSON, // Stores JSON object for scheduling (e.g., cron)
    },
    rate_limit: {
        type: DataTypes.INTEGER, // Delay between requests in milliseconds
        defaultValue: 0,
    },
    enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
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
    tableName: 'scrapers',
    timestamps: false,
});
// Define association
Scraper.belongsTo(Project, { foreignKey: 'project_id' });
Project.hasMany(Scraper, { foreignKey: 'project_id' });
module.exports = Scraper;
