export function ping(req, res) {
    res.json({
        success: true,
        message: 'Pong'
    });
}

export function testSubscription(req, res) {
    res.status(200).json({
        success: true,
        message: 'You are subscriber!'
    });
}

export function testPrivate(req, res) {
    res.status(200).json({
        success: true,
        message: 'You are in Private!'
    });
}
