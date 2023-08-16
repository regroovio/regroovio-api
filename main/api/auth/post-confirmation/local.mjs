import { handler } from './index.mjs'
const start = async () => {
    const response = await handler({
        version: '1',
        region: 'us-east-1',
        userPoolId: 'us-east-1_nO2tJbvvg',
        userName: 'nethanielmaoz@gmail.com',
        callerContext: {
            awsSdkVersion: 'aws-sdk-js-3.306.0',
            clientId: '3e1o5hkp3tlqdv2c8dmmula97c'
        },
        triggerSource: 'PostConfirmation_ConfirmSignUp',
        request: {
            userAttributes: {
                sub: 'e0e23e63-a5ac-454e-902c-17611fc2b16b',
                email_verified: 'true',
                'cognito:user_status': 'CONFIRMED',
                preferred_username: 'nethaniel',
                email: 'nethanielmaoz@gmail.com'
            }
        },
        response: {}
    })
    console.log(response)
}
start()