import fs from 'fs';
import path from 'path';
import jsonwebtoken from 'jsonwebtoken';

export const REFRESH_EXPIRES_IN = 7;

const jwtPrivate = path.join(__dirname, '../crypto/', 'jwtPrivate.pem');
const refreshPrivate = path.join(__dirname, '../crypto/', 'refreshPrivate.pem');
const refreshPublic = path.join(__dirname, '../crypto/', 'refreshPublic.pem');
const JWT_PRIV_KEY = fs.readFileSync(jwtPrivate, 'utf8');
const REFRESH_PRIV_KEY = fs.readFileSync(refreshPrivate, 'utf8');
const REFRESH_PUBLIC_KEY = fs.readFileSync(refreshPublic, 'utf8');

export function issueJWT(user) {
    const { _id } = user;
    const expiresIn = '10m';

    const payload = {
        uid: _id,
        iat: Math.floor(Date.now() / 1000)
    };

    const signedToken = jsonwebtoken.sign(payload, JWT_PRIV_KEY, { expiresIn, algorithm: 'RS256' });

    return {
        token: `Bearer ${signedToken}`,
        expires: expiresIn
    };
}

export function issueRefresh(user) {
    const { _id } = user;
    const expiresIn = `${REFRESH_EXPIRES_IN}d`;
    const iat = Math.floor(Date.now() / 1000);

    const payload = {
        uid: _id,
        iat
    };

    const signedToken = jsonwebtoken.sign(payload, REFRESH_PRIV_KEY, {
        expiresIn,
        algorithm: 'RS256'
    });

    return {
        token: signedToken,
        iat,
        expiresIn
    };
}

export function isValidRefresh(token) {
    try {
        jsonwebtoken.verify(token, REFRESH_PUBLIC_KEY, { algorithm: 'RS256' });
    } catch (error) {
        return false;
    }
    return true;
}
