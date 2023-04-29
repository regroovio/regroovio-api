// slackBot.mjs

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const slackBot = async (error) => {
    try {
        const { message, functionName, additionalInfo } = error;

        const errorBlocks = [
            {
                'type': 'section',
                'text': {
                    'type': 'mrkdwn',
                    'text': `*FAILURE*`
                }
            },
            {
                'type': 'section',
                'text': {
                    'type': 'mrkdwn',
                    'text': `*Function:* \`${functionName}\`\n*Message:* \`${message}\`${additionalInfo ? `\n*Additional Info:* \`${additionalInfo}\`` : ''}`
                }
            }
        ];

        await axios.post(process.env.SLACK_ENDPOINT, { blocks: errorBlocks });
    } catch (error) {
        console.error('Error sending notification to Slack:', error);
    }
};

export { slackBot };