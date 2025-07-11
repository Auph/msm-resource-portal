'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::collection.collection', ({ strapi }) => ({
    // GET /collections
    async find(ctx) {
        const user = ctx.state.user;
        const userId = user?.id;

        const filters = {
            user: userId,
        };

        const query = {
            populate: ['items', 'featured_image', 'collection_categories'],
            status: 'published',
            filters,
        };

        const entries = await strapi.documents('api::collection.collection').findMany(query);

        // Manually clean nested collections inside items
        for (const entry of entries) {
            entry.items = entry.items?.map(item => {
                const { collections, ...rest } = item;
                return rest;
            }) || [];
        }

        return ctx.send({ data: entries });
    },

    // GET /collections/:id
    async findOne(ctx) {
        const { id } = ctx.params;
        const userId = ctx.state.user?.id;

        const entry = await strapi
            .documents('api::collection.collection')
            .findOne({
                documentId: id,
                populate: {
                    items: {
                        populate: ['link', 'media', 'featured_image', 'categories', 'tags', 'series_items'],
                    },
                    featured_image: true,
                    user: true
                },
                status: 'published'
            });

        const canAccess = entry?.is_public || (entry?.user?.id === userId);

        if (!canAccess) {
            return ctx.unauthorized('You are not allowed to view this collection');
        }

        // Remove nested collections inside items
        entry.items = entry.items?.map(item => {
            const { collections, ...rest } = item;
            return rest;
        }) || [];


        return ctx.send({ data: entry });
    },

    // POST /collections
    async create(ctx) {
        const user = ctx.state.user;
        const data = ctx.request.body;

        data.user = user.id;

        const created = await strapi
            .documents('api::collection.collection')
            .create({
                data,
                status: 'published'
            });

        return ctx.send(created);
    },

    // PUT /collections/:id
    async update(ctx) {
        const { id } = ctx.params;
        const userId = ctx.state.user?.id;

        const existing = await strapi
            .documents('api::collection.collection')
            .findOne({
                documentId: id,
                populate: ['user'],
            });

        if (!existing || existing.user?.id !== userId) {
            return ctx.unauthorized('You are not allowed to edit this collection');
        }

        const updated = await strapi
            .documents('api::collection.collection')
            .update({
                documentId: id,
                data: ctx.request.body,
                populate: {
                    items: {
                        populate: ['link', 'media', 'featured_image', 'categories', 'tags', 'series_items'],
                    },
                    featured_image: true,
                    user: true
                },
                status: 'published'
            });

        return ctx.send(updated);
    },

    // DELETE /collections/:id
    async delete(ctx) {
        const { id } = ctx.params;
        const userId = ctx.state.user?.id;

        const existing = await strapi
            .documents('api::collection.collection')
            .findOne({
                documentId: id,
                populate: ['user'],
            });

        if (!existing || existing.user?.id !== userId) {
            return ctx.unauthorized('You are not allowed to delete this collection');
        }

        const deleted = await strapi
            .documents('api::collection.collection')
            .delete({ documentId: id });


        return ctx.send(deleted);
    },

    // Optional: GET /collections/count
    async count(ctx) {
        const userId = ctx.state.user?.id;

        const count = await strapi
            .documents('api::collection.collection')
            .count({
                filters: {
                    user: userId,
                },
            });

        return ctx.send({ count });
    },
}));
