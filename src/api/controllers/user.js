import { v4 } from 'uuid';
import { User, Session } from '../../db/models/User';
import * as cryptoHelper from '../../utils/cryptoHelper';
import * as jwtHelper from '../../utils/jwtHelper';

import { sendRegisterEmail, sendPasswordResetEmail } from '../../utils/emails/mail';

// удаление refresh токена из базы
async function clearUserSessions(user) {
    await Session.deleteMany({ user });
}

async function sendRegisterConfirmation(user) {
    const siteName = 'СуперкрутойСайт.рф';
    const options = {
        email: user.email,
        subject: `Email verification from ${siteName}`,
        locals: {
            siteName,
            url: `https://localhost:3007/user/emailVerification/${user.verifyCode}`,
            username: user.nickname
        }
    };
    await sendRegisterEmail(options);
}

async function sendPasswordResetConfirmation(user) {
    const siteName = 'СуперкрутойСайт.рф';
    const options = {
        email: user.email,
        subject: `Password reset confirmation from ${siteName}`,
        locals: {
            siteName,
            url: `https://localhost:3007/user/passwordResetConfirmation/${user.verifyCode}`,
            username: user.nickname
        }
    };
    await sendPasswordResetEmail(options);
}

async function isSessionsCountLess5(user) {
    const sessions = await Session.find({ user });
    return sessions.length < 5;
}

// TODO: refactor this
async function sendAndSetTokens(req, res, user) {
    const jwt = jwtHelper.issueJWT(user);
    const refresh = jwtHelper.issueRefresh(user);

    const newSession = new Session({
        user,
        refreshToken: refresh
    });

    if (!(await isSessionsCountLess5(user))) {
        console.log('More than 5 sessions!');
        await clearUserSessions(user);
    }

    await newSession.save();

    res.cookie('refreshToken', refresh, {
        secure: true,
        httpOnly: true
    });
    res.status(200).json({
        success: true,
        jwt: {
            token: jwt.token,
            expiresIn: jwt.expires
        }
    });
}

function resetCookie(req, res) {
    res.cookie('refreshToken', '', {
        maxAge: 1000,
        secure: true,
        httpOnly: true
    });
    res.status(200).json({
        success: true,
        message: 'Successfully logged out'
    });
}

async function userAuthorize(req, res, next) {
    const user = await User.findOne({ email: req.body.email });
    try {
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Wrong login or password'
            });
            return;
        }
        if (!user.active) {
            res.status(401).json({
                success: false,
                message: 'Account disabled until email confirmation'
            });
            return;
        }
        const isValid = cryptoHelper.validatePassword(req.body.password, user.hash, user.salt);
        if (isValid) {
            await sendAndSetTokens(req, res, user);
        } else {
            res.status(401).json({
                success: false,
                message: 'Wrong login or password'
            });
        }
    } catch (err) {
        next(err);
    }
}

export async function userRegister(req, res) {
    const { email, nickname, password } = req.body;
    const saltHash = cryptoHelper.genHashWithSalt(password);
    const { salt, hash } = saltHash;
    const verifyCode = v4();

    const newUser = new User({
        email,
        nickname,
        hash,
        salt,
        group: 'free',
        verifyCode
    });

    try {
        await newUser.save();
        res.status(200).json({ success: true, message: 'User registered' });
        await sendRegisterConfirmation(newUser);
    } catch (err) {
        if (err.code === 11000 || err.code === 11001) {
            res.status(409).json({
                success: false,
                message: `E-mail ${email} already registered, try another or log in.`
            });
        } else {
            res.status(400).json({
                success: false,
                message: err.message
            });
        }
    }
}

export async function userLogin(req, res, next) {
    const refreshCandidate = req.cookies.refreshToken;
    if (refreshCandidate && jwtHelper.isValidRefresh(refreshCandidate.token)) {
        const session = await Session.findOne({ refreshToken: refreshCandidate });
        try {
            if (session) {
                res.status(403).json({
                    success: false,
                    message: 'You are already logged in'
                });
            } else {
                await userAuthorize(req, res, next);
            }
        } catch (err) {
            next(err);
        }
    } else {
        await userAuthorize(req, res, next);
    }
}

export async function userRefreshToken(req, res) {
    const refreshCandidate = req.cookies.refreshToken;
    if (refreshCandidate && jwtHelper.isValidRefresh(refreshCandidate.token)) {
        const refresh = await Session.findOneAndDelete({ refreshToken: refreshCandidate });
        try {
            await sendAndSetTokens(req, res, refresh.user);
        } catch (err) {
            res.status(403).json({
                success: false,
                message: `Invalid Refresh Token!`
            });
        }
    } else {
        res.status(401).json({
            success: false,
            message: 'Invalid Refresh Token'
        });
    }
}

export async function userLogout(req, res) {
    const refreshCandidate = await req.cookies.refreshToken;
    if (refreshCandidate && jwtHelper.isValidRefresh(refreshCandidate.token)) {
        const refresh = await Session.findOne({ refreshToken: refreshCandidate });
        try {
            await clearUserSessions(refresh.user);
            resetCookie(req, res);
        } catch (err) {
            res.status(403).json({
                success: false,
                message: 'Invalid Refresh Token'
            });
        }
    } else {
        res.status(401).json({
            success: false,
            message: 'Invalid Refresh Token'
        });
    }
}

export async function userProfile(req, res) {
    if (req.user) {
        res.status(200).json(req.user);
    }
}

export async function resetOldSessions(req, res, next) {
    const today = new Date();
    const expired = Math.floor(
        today.setDate(today.getDate() - jwtHelper.REFRESH_EXPIRES_IN) / 1000
    );
    try {
        await Session.deleteMany({ 'refreshToken.iat': { $lte: expired } });
        res.status(200).json({
            success: true,
            message: 'Old sessions deleted'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
        next(err);
    }
}

export async function emailVerification(req, res, next) {
    const user = await User.findOneAndUpdate(
        { verifyCode: req.params.verifyCode },
        { active: true, verifyCode: '' },
        { new: true }
    );
    if (user.active) {
        res.status(200).json({
            success: true,
            message: 'Email verified, user activated'
        });
    } else {
        res.status(500).json({
            success: false,
            message: 'User with verification code provided not found'
        });
    }
}

export async function requestPasswordReset(req, res, next) {
    const { email } = req.params;
    const verifyCode = v4();
    const user = await User.findOneAndUpdate({ email }, { verifyCode }, { new: true });
    if (user) {
        await sendPasswordResetConfirmation(user);
        res.status(200).json({
            success: true,
            message: 'Password reset confirmation sent!'
        });
    } else {
        res.status(404).json({
            success: false,
            message: 'User not found'
        });
        next();
    }
}

export async function passwordResetConfirmation(req, res, next) {
    const saltHash = cryptoHelper.genHashWithSalt(req.body.password);
    const { salt, hash } = saltHash;

    const user = await User.findOneAndUpdate(
        { verifyCode: req.params.verifyCode },
        { verifyCode: '', hash, salt },
        { new: true }
    );

    if (user) {
        res.status(200).json({
            success: true,
            message: 'Password changed'
        });
    } else {
        res.status(403).json({
            success: false,
            message: 'Invalid verify code'
        });
        next();
    }
}
