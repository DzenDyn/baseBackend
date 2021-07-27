import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import ejs from 'ejs';

const templates = {
    register: fs.readFileSync(path.join(__dirname, 'register/html.ejs'), 'utf-8'),
    registerPlain: fs.readFileSync(path.join(__dirname, 'register/text.ejs'), 'utf-8'),
    passwordReset: fs.readFileSync(path.join(__dirname, 'passwordReset/html.ejs'), 'utf-8'),
    passwordResetPlain: fs.readFileSync(path.join(__dirname, 'passwordReset/text.ejs'), 'utf-8')
};

const smtp = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'sheridan.wuckert87@ethereal.email',
        pass: 'V9fet7AF8eVaPdHZc8'
    }
});

const sendmail = async (options, htmlTemplate, textTemplate) => {
    const html = ejs.render(htmlTemplate, options.locals);
    const text = ejs.render(textTemplate, options.locals);

    const mailOptions = {
        subject: options.subject,
        to: options.email,
        html,
        text
    };

    try {
        await smtp.sendMail(mailOptions);
    } catch (err) {
        console.log(err);
    }
};

export const sendRegisterEmail = async (options) =>
    sendmail(options, templates.register, templates.registerPlain);

export const sendPasswordResetEmail = async (options) =>
    sendmail(options, templates.passwordReset, templates.passwordResetPlain);
