import mongoose from 'mongoose';
import {logger} from '../middleware/logger.mjs';

const uri = process.env.MONGO_URI;
// const uri = 'mongodb+srv://jgrasty:VMvxuL0GU8f5rcmX@cluster0.g8ogg.mongodb.net/matchmaker?retryWrites=true&w=majority&appName=Cluster0';

const conn = async () => {
  try {
    const {connection} = await mongoose.connect(uri);
    logger.info(`MongoDb Connection ${connection.host} Successful.`);
  }
  catch (e) {
    logger.error(`MongoDb Connection Error: ${e.message}`);
    process.exit(1);
  }
};

export default conn;