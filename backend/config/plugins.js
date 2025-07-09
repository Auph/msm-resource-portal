module.exports = ({ env }) => ({
    email: {
        config: {
            provider: 'sendgrid', // For community providers pass the full package name (e.g. provider: 'strapi-provider-email-mandrill')
            providerOptions: {
                apiKey: env('SENDGRID_API_KEY'),
            },
            settings: {
                defaultFrom: env('MAIL_FROM'),
                defaultReplyTo: env('MAIL_REPLY_TO') || env('MAIL_FROM'),
                testAddress: 'juliasedefdjian@strapi.io',
            },
        },
    },
    upload: {
        config: {
            provider: "aws-s3", // or "@strapi/provider-upload-aws-s3"
            providerOptions: {
                s3Options: {
                    credentials: {
                        accessKeyId: env("AWS_ACCESS_KEY_ID"),
                        secretAccessKey: env("AWS_ACCESS_SECRET"),
                    },
                    params: {
                        Bucket: env("AWS_BUCKET"),
                    },
                },
                // Optionally include baseUrl if using custom URL/CDN
                baseUrl: env("AWS_ENDPOINT", undefined),
            },
            actionOptions: {
                upload: {},
                uploadStream: {},
                delete: {},
            },
        },
    },
})