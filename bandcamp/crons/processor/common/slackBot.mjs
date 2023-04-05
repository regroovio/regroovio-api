// slackBot.mjs

import axios from 'axios';
import dotenv from 'dotenv';
import { PROCESSOR } from './config.mjs';

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

        await axios.post(PROCESSOR.SLACK_ENDPOINT, { blocks });
    } catch (error) {
        console.error('Error sending notification to Slack:', error);
    }
};

export { slackBot };