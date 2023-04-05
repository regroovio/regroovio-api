// slackBot.mjs

import axios from 'axios';
import dotenv from 'dotenv';
import { DAILY } from './config.mjs';

dotenv.config();

const slackBot = async (event) => {
    try {
        const { functionName, message } = event
        const blocks = [{
            'type': 'section',
            'text': {
                'type': 'mrkdwn',
                'text': `*Cron Message*`
            }
        },
        {
            'type': 'section',
            'text': {
                'type': 'mrkdwn',
                'text': `*${functionName}*: ${message}`
            }
        }]

        await axios.post(DAILY.SLACK_ENDPOINT, { blocks });
    } catch (error) {
        console.error('Error sending notification to Slack:', error);
    }
};

export { slackBot };