'use strict';

/**
 * collection controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::collection.collection', ({ strapi }) => ({
    async findOneByDocumentId(ctx) {
        const { documentId } = ctx.params;

        const entry = await strapi
            .documentService('api::collection.collection')
            .findOne({ documentId, status: 'published' });

        if (!entry) {
            return ctx.notFound('Collection not found');
        }

        return ctx.send(entry);
    },
}));
