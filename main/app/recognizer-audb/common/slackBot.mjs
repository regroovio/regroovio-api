// slackBot.mjs

import axios from 'axios';

const slackBot = async (alert) => {
    try {
        const { status, message, functionName } = alert;
        const blocks = [
            {
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
                    'text': `*Function:* \`${functionName}\`\n*Message:* \`${message}\`}`
                }
            }
        ];
        await axios.post(process.env.SLACK_ENDPOINT, { blocks });
    } catch (error) {
        console.log('Error sending notification to Slack:', error);
    }
};

export { slackBot };