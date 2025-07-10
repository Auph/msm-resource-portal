'use strict';

/**
 * collection router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::collection.collection', {
    config: {
        'findOneByDocumentId': {
            auth: false, // Set to true if you want to protect it
        },
    },
    routes: [
        {
            method: 'GET',
            path: '/collections/:documentId',
            handler: 'collection.findOneByDocumentId',
            config: {
                policies: [],
                middlewares: [],
            },
        },
    ],
});
