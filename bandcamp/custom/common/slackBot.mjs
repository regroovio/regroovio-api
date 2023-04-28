// slackBot.mjs

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const slackBot = async (event) => {
    try {
        const { message, status, scanned, added, functionName, runtime } = event

        const successBlocks = [{
            'type': 'section',
            'text': {
                'type': 'mrkdwn',
                'text': `*${status}*`
            }
        },
        {
            'type': 'section',
            'text': {
                'type': 'mrkdwn',
                'text': `*Function:* \`${functionName}\`\n\*Scanned:* \`${scanned}\`\n*Added:* \`${added}\`\n*Runtime:* \`${runtime}\``
            }
        }]
        const errorBlocks = [{
            'type': 'section',
            'text': {
                'type': 'mrkdwn',
                'text': `*${status}*`
            }
        },
        {
            'type': 'section',
            'text': {
                'type': 'mrkdwn',
                'text': `*Message:* \`${message}\``
            }
        }]
        if (status === "FAILURE") {
            return await axios.post(process.env.SLACK_ENDPOINT, { blocks: errorBlocks });
        }
        return await axios.post(process.env.SLACK_ENDPOINT, { blocks: successBlocks });
    } catch (error) {
        console.error('Error sending notification to Slack:', error);
    }
};

export { slackBot };