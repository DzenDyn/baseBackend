import { Strategy, ExtractJwt } from 'passport-jwt';
import fs from 'fs';
import path from 'path';

import { User } from '../db/models/User';

const pathToKey = path.join(__dirname, '../crypto/', 'jwtPublic.pem');
const PUB_KEY = fs.readFileSync(pathToKey, 'utf8');

const options = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: PUB_KEY,
    algorithms: ['RS256']
};

export const strategy = (pass) => {
    pass.use(
        new Strategy(options, (jwtPayload, done) => {
            User.findOne({ _id: jwtPayload.uid }, (err, user) => {
                if (err) {
                    return done(err, false);
                }
                if (user) {
                    return done(null, user);
                }
                return done(null, null);
            });
        })
    );
};
