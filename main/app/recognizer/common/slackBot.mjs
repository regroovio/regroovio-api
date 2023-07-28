// slackBot.mjs

import axios from 'axios';

const slackBot = async (error) => {
    try {
        const { message, functionName, additionalInfo } = error;
        const parsedAdditionalInfo = JSON.stringify(additionalInfo);
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
                    'text': `*Function:* \`${functionName}\`\n*Message:* \`${message}\`${additionalInfo ? `\n*Additional Info:* \`${parsedAdditionalInfo}\`` : ''}`
                }
            }
        ];

        await axios.post(process.env.SLACK_ENDPOINT, { blocks: errorBlocks });
    } catch (error) {
        console.log('Error sending notification to Slack:', error);
    }
};

export { slackBot };