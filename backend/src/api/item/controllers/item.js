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

        // For DigitalOcean Spaces, endpoint should be like "fra1.digitaloceanspaces.com"
        // not "bucketname.fra1.digitaloceanspaces.com"
        // Extract just the region endpoint if bucket name is included
        let regionEndpoint = baseUrl;
        if (baseUrl && typeof baseUrl === 'string' && baseUrl.includes('.digitaloceanspaces.com')) {
            // Remove protocol if present
            let endpoint = baseUrl.replace(/^https?:\/\//, '');
            // Pattern: bucketname.region.digitaloceanspaces.com -> region.digitaloceanspaces.com
            const parts = endpoint.split('.');
            if (parts.length > 2 && parts[parts.length - 2] === 'digitaloceanspaces') {
                // Extract region (e.g., "fra1") and domain
                const region = parts[parts.length - 3];
                regionEndpoint = `${region}.digitaloceanspaces.com`;
            }
        }

        const s3 = new AWS.S3({
            apiVersion: '2006-03-01',
            endpoint: new AWS.Endpoint(regionEndpoint),
            accessKeyId,
            secretAccessKey,
            s3ForcePathStyle: false // Use virtual-hosted-style for DigitalOcean Spaces
        });

        const url = s3.getSignedUrl('getObject', {
            Bucket: params.Bucket,
            Key: ctx.params.media, // e.g., /items/download/filename.jpg
            Expires: 60 * 5,
        });

        return ctx.send({ url });
    },
}));
