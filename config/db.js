const mongoose = require('mongoose');

let connectionPromise;

function connectDatabase() {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose.connection);
  if (!connectionPromise) {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/drivemart';
    connectionPromise = mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 }).then(() => mongoose.connection).catch((error) => {
      connectionPromise = undefined;
      throw error;
    });
  }
  return connectionPromise;
}

module.exports = { connectDatabase };
