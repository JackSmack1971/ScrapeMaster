const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/scrapemaster', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            // useCreateIndex: true, // Deprecated in Mongoose 6.0
            // useFindAndModify: false, // Deprecated in Mongoose 6.0
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1); // Exit process with failure
    }
};

module.exports = connectDB;