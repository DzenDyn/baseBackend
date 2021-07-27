import crypto from 'crypto';

/**
 *This function uses the crypto library to decrypt the hash using the salt and then compares
 * the decrypted hash/salt with the password that the user provided at login
 *
 * @param password - The plain text password
 * @param hash - The hash stored in database
 * @param salt - The salt stored in database
 * @returns {boolean}
 */
export function validatePassword(password, hash, salt) {
    const hashCandidate = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === hashCandidate;
}

/**
 * Takes plain text and create salt and hash out of it.
 * @param password - plain text password
 * @returns {{salt: string, hash: string}}
 */
export function genHashWithSalt(password) {
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');

    return {
        salt,
        hash
    };
}
