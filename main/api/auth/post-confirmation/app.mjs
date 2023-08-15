// post-confirmation/app.mjs

const app = async (event, context) => {
    console.log(event);
    context.succeed(event)
};

export { app };