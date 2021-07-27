import Mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();
export const connect = async () => {
    const dbHost = process.env.DB_HOST;
    const dbPort = process.env.DB_PORT;
    const dbName = process.env.DB_NAME;
    const user = process.env.DB_USER;
    const pass = process.env.DB_PASS;

    const uri = `mongodb://${dbHost}:${dbPort}/${dbName}?authSource=dbWithCredentials`;

    await Mongoose.connect(uri, {
        authSource: dbName,
        user,
        pass,
        useNewUrlParser: true,
        useFindAndModify: false,
        useUnifiedTopology: true,
        useCreateIndex: true
    });
};
