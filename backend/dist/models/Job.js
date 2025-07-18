"use strict";
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Scraper = require('./Scraper'); // Import Scraper model for association
const Job = sequelize.define('Job', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    scraper_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Scraper,
            key: 'id',
        },
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending', // e.g., 'pending', 'in_progress', 'completed', 'failed'
    },
    started_at: {
        type: DataTypes.DATE,
    },
    completed_at: {
        type: DataTypes.DATE,
    },
    records_scraped: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    pages_processed: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    error_message: {
        type: DataTypes.TEXT,
    },
    execution_log: {
        type: DataTypes.TEXT, // Stores detailed log of the job execution
    },
    configuration_snapshot: {
        type: DataTypes.JSON, // Stores the scraper configuration at the time of job execution
    },
}, {
    tableName: 'jobs',
    timestamps: false,
});
// Define association
Job.belongsTo(Scraper, { foreignKey: 'scraper_id' });
Scraper.hasMany(Job, { foreignKey: 'scraper_id' });
module.exports = Job;
