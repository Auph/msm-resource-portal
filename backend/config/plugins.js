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
    "users-permissions": {
        config: {
            register: {
                allowedFields: ["firstName", "lastName", "interests"], // Add your custom fields here
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
                    region: env('AWS_REGION'), // e.g "fr-par"
                    endpoint: "https://fra1.digitaloceanspaces.com",
                    params: {
                        Bucket: env("AWS_BUCKET"),
                    },
                }
            },
            actionOptions: {
                upload: {},
                uploadStream: {},
                delete: {},
            },
        },
    },
})