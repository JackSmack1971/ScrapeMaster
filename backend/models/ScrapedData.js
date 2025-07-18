const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Job = require('./Job'); // Import Job model for association
const Scraper = require('./Scraper'); // Import Scraper model for association

const ScrapedData = sequelize.define('ScrapedData', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  job_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Job,
      key: 'id',
    },
  },
  scraper_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Scraper,
      key: 'id',
    },
  },
  source_url: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isUrl: true,
    },
  },
  data: {
    type: DataTypes.JSON, // Stores the scraped data as a JSON object
    allowNull: false,
  },
  page_number: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  extraction_timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  data_hash: {
    type: DataTypes.STRING, // Hash of the data_fields to detect duplicates
    unique: true,
  },
  validation_score: {
    type: DataTypes.FLOAT, // Quality score based on completeness and accuracy
    defaultValue: 100,
  },
  is_duplicate: {
    type: DataTypes.BOOLEAN, // Flag to indicate if the data is a duplicate
    defaultValue: false,
  },
  metadata: {
    type: DataTypes.JSON, // Stores additional metadata about the scraped data
  },
}, {
  tableName: 'scraped_data',
  timestamps: true, // Enable timestamps
  createdAt: 'created_at', // Map createdAt to created_at column
  updatedAt: 'updated_at', // Map updatedAt to updated_at column
});

// Define associations
ScrapedData.belongsTo(Job, { foreignKey: 'job_id' });
Job.hasMany(ScrapedData, { foreignKey: 'job_id' });

ScrapedData.belongsTo(Scraper, { foreignKey: 'scraper_id' });
Scraper.hasMany(ScrapedData, { foreignKey: 'scraper_id' });

module.exports = ScrapedData;