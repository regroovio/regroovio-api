// setEnvironmentVariables.mjs

import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const client = new SSMClient({ region: "us-east-1" });
const setEnvironmentVariables = async () => {
    const params =
    {
        Name: `parameters-${process.env.STAGE}`,
        WithDecryption: true
    };
    const command = new GetParameterCommand(params);
    try {
        const data = await client.send(command);
        console.log(data.Parameter.Value);
        const parsedData = JSON.parse(data.Parameter.Value);
        process.env = { ...process.env, ...parsedData };
    } catch (error) {
        console.log(error);
    }
}
export { setEnvironmentVariables };