// define-auth-challenge/app.mjs

const app = async (event) => {
    console.log(event);
    try {
        if (event.request.session &&
            event.request.session.find(attempt => attempt.challengeName === 'CUSTOM_CHALLENGE' && attempt.challengeResult === true)) {
            event.response.issueTokens = true;
            event.response.failAuthentication = false;
        } else if (event.request.session.length >= 3 &&
            event.request.session.slice(-1)[0].challengeResult === false) {
            event.response.issueTokens = false;
            event.response.failAuthentication = true;
        } else {
            event.response.issueTokens = false;
            event.response.failAuthentication = false;
            event.response.challengeName = 'CUSTOM_CHALLENGE';
        }
        return event;
    } catch (err) {
        console.log(err);
        throw err;
    }
};

export { app };
