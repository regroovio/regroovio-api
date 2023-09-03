// app.mjs

import { exec } from 'child_process';

const app = async (event) => {
    const { action } = event
    return new Promise((resolve, reject) => {
        delete process.env.GH_TOKEN;
        exec(`echo "${process.env.GH_TOKEN}" | ./gh auth login --with-token`, (authError) => {
            if (authError) {
                console.error(`Authentication Error: ${authError}`);
                return reject(authError);
            }
            exec(`./gh workflow run start-stop.yml --ref main -f stage=${process.env.STAGE} -f action=${action}`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error executing gh CLI: ${error}`);
                    return reject(error);
                }
                if (stderr) {
                    console.error(`Error in gh CLI: ${stderr}`);
                    return reject(new Error(stderr));
                }
                console.log(`gh CLI output: ${stdout}`);
                resolve({
                    statusCode: 200,
                    body: stdout,
                });
            });
        });
    });
};

export { app };
