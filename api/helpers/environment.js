import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const loadEnvironmentVariables = async () => {
    const client = new SSMClient({ region: process.env.REGION });
    const params = {
        Name: `/${process.env.STAGE}/env`,
        WithDecryption: true
    };
    const command = new GetParameterCommand(params);
    try {
        const data = await client.send(command);
        const parsedData = JSON.parse(data.Parameter.Value);
        process.env = { ...process.env, ...parsedData };
    } catch (error) {
        console.error('Failed to load environment variables:', error);
        process.exit(1);
    }
};

export default loadEnvironmentVariables;
