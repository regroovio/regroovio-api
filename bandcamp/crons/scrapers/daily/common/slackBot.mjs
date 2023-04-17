// slackBot.mjs

import axios from 'axios';
import dotenv from 'dotenv';
import { DAILY } from './config.mjs';

dotenv.config();

const slackBot = async (event) => {
    try {
        const { functionName, message, status } = event
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
                'text': `*\`${functionName}\`*\n*Message:* \`${message}\``
            }
        }]

        await axios.post(DAILY.SLACK_ENDPOINT, { blocks });
    } catch (error) {
        console.error('Error sending notification to Slack:', error);
    }
};

export { slackBot };