// setEnvironmentVariables.mjs

import dotenv from "dotenv";
dotenv.config();

import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const client = new SSMClient({ region: process.env.REGION });

const setEnvironmentVariables = async () => {
    const params =
    {
        Name: `/${process.env.STAGE}/env`,
        WithDecryption: true
    };
    const command = new GetParameterCommand(params);
    try {
        const data = await client.send(command);
        const parsedData = JSON.parse(data.Parameter.Value);
        process.env = { ...process.env, ...parsedData };
    } catch (error) {
        console.log(error);
    }
}

export { setEnvironmentVariables };