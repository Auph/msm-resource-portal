'use strict';

const AWS = require('aws-sdk');
const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::item.item', ({ strapi }) => ({
    async findOneByDocumentId(ctx) {
        const { documentId } = ctx.params;

        const entry = await strapi
            .documentService('api::item.item')
            .findOne({ documentId, status: 'published' });

        if (!entry) {
            return ctx.notFound('Item not found');
        }

        return ctx.send(entry);
    },

    async downloadMedia(ctx) {
        const {
            baseUrl,
            s3Options: { credentials: { accessKeyId, secretAccessKey }, params },
        } = strapi.plugin('upload').config('providerOptions');

        const s3 = new AWS.S3({
            apiVersion: '2006-03-01',
            endpoint: new AWS.Endpoint(baseUrl),
            accessKeyId,
            secretAccessKey,
        });

        const url = s3.getSignedUrl('getObject', {
            Bucket: params.Bucket,
            Key: ctx.params.media, // e.g., /items/download/filename.jpg
            Expires: 60 * 5,
        });

        return ctx.send({ url });
    },
}));
