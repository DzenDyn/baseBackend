export const securityMiddleware = (req, res, next, passport, groups) => {
    passport.authenticate('jwt', { session: false }, (err, user) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(401).send('Unauthorized');
        }

        // добавляем в req поле user с определенным набором полей, отдавать здесь хэш, соль не надо.
        const { _id, email, nickname, group } = user;
        req.user = {
            _id,
            email,
            nickname,
            group
        };
        if (groups.includes(user.group)) {
            return next();
        }
        return res.status(403).send('Insufficient access rights');
    })(req, res, next);
};
