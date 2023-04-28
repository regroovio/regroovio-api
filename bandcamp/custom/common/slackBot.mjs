// slackBot.mjs

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const slackBot = async (event) => {
    try {
        const { functionName, message, status, timeMessage = '' } = event
        const blocks = [{
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
                'text': `*Function:* \`${functionName}\`\n*Message:* \`${message}\n${timeMessage}\``
            }
        }]

        await axios.post(process.env.SLACK_ENDPOINT, { blocks });
    } catch (error) {
        console.error('Error sending notification to Slack:', error);
    }
};

export { slackBot };