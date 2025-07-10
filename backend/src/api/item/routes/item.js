'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::item.item', {
    routes: [
        {
            method: 'GET',
            path: '/items/:documentId',
            handler: 'item.findOneByDocumentId',
            config: {
                auth: true, // or true, depending on your needs
            },
        },
    ],
});
