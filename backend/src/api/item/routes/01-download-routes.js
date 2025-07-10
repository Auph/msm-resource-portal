'use strict';

module.exports = {
    routes: [
        {
            method: 'GET',
            path: '/items/download/:media',
            handler: 'item.downloadMedia',
            config: {
                auth: false, // or true if needed
            },
        },
    ],
};
