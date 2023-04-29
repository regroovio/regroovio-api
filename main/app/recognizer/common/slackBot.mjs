// slackBot.mjs

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const slackBot = async (event) => {
    try {
        const { message, status, functionName } = event;

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
                'text': `*Function:* \`${functionName}\`\n*Message:* \`${message}\``
            }
        }];

        if (status === "FAILURE") {
            return await axios.post(process.env.SLACK_ENDPOINT, { blocks: errorBlocks });
        }
    } catch (error) {
        console.error('Error sending notification to Slack:', error);
    }
};

export { slackBot };