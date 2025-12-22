'use strict';

const { sanitizeEntity } = require('strapi-utils');

const AWS = require('aws-sdk')

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async downloadMedia(ctx) {
    const {
      endpoint,
      accessKeyId,
      secretAccessKey,
      params
    } = strapi.plugins.upload.config.providerOptions
    
    // For DigitalOcean Spaces, endpoint should be like "fra1.digitaloceanspaces.com"
    // not "bucketname.fra1.digitaloceanspaces.com"
    // Extract just the region endpoint if bucket name is included
    let regionEndpoint = endpoint;
    if (endpoint && endpoint.includes('.digitaloceanspaces.com')) {
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
    })
    
    //  Get the item
    const url = s3.getSignedUrl('getObject', {
      Bucket: params.Bucket,
      Key: ctx.params.media,
      Expires: 60 * 5
    });

    return {
      url,
    }
  },
};
