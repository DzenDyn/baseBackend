import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true
        },
        nickname: {
            type: String,
            required: true,
            unique: true
        },
        hash: {
            type: String,
            required: true
        },
        salt: {
            type: String,
            required: false
        },
        group: {
            type: String
        },
        active: {
            type: Boolean,
            default: false
        },
        verifyCode: {
            type: String
        }
    },
    { versionKey: false }
);

export const User = mongoose.model('User', userSchema);

const sessionsSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    refreshToken: {
        token: { type: String },
        iat: { type: Number },
        expiresIn: { type: String }
    }
});

export const Session = mongoose.model('Session', sessionsSchema);
