// verify-auth-challenge/app.mjs

const app = async (event) => {
    try {
        if (event.request.privateChallengeParameters.secretLoginCode === event.request.challengeAnswer) {
            event.response.answerCorrect = true;
        } else {
            event.response.answerCorrect = false;
        }
        return event;  // Return the complete event source
    } catch (err) {
        console.log(err);
        throw err;  // Propagate the error
    }
};

export { app };
