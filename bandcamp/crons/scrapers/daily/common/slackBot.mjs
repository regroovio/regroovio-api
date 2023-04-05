import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const MENTIONS = [' <@U0526P5FERF>'];
const SLACK_ENDPOINT = `${SLACK_ENDPOINT}`;

const slackBot = async (event) => {
    try {
        const { status, message } = event
        const blocks = [{
            'type': 'section',
            'text': {
                'type': 'mrkdwn',
                'text': `*Lambda Message*`
            }
        },
        {
            'type': 'section',
            'text': {
                'type': 'mrkdwn',
                'text': `*${status}*: ${message}\n\n${MENTIONS}`
            }
        }]

        await axios.post(SLACK_ENDPOINT, { blocks });
    } catch (error) {
        console.error('Error sending notification to Slack:', error);
    }
};

export { slackBot };