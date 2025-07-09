import type { Schema, Struct } from '@strapi/strapi';

export interface ItemLinksLink extends Struct.ComponentSchema {
  collectionName: 'components_item_links_links';
  info: {
    description: '';
    displayName: 'link';
    icon: 'cubes';
  };
  attributes: {
    title: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'item-links.link': ItemLinksLink;
    }
  }
}
