/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import axios, { AxiosResponse } from 'axios';
import { reactive } from '@vue/composition-api';
import qs from 'qs';

import config from '../config/config';

//  Dummy data
// import itemsData from '../data/items.data'
import {
  InterfaceItem,
  InterfaceItemMediaObject,
  InterfaceStateItems
} from 'src/interfaces';
import { getAuthenticationToken } from './authentication';

const packageItem = (item: InterfaceItem) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const packagedItem: InterfaceItem = JSON.parse(JSON.stringify(item));

  return packagedItem;
};

/**
 * Fetches data. Should ideally be abstracted
 */
const fetchItems = async (
  categories = ['all'],
  tags: number[] = [],
  seriesItems = ['all'],
  search = ''
): Promise<InterfaceItem[] | undefined> => {
  try {
    if ('apiUrl' in config) {
      const queryOptions: Record<string, any> = {
        filters: {}
      };

      if (!categories.includes('all')) {
        queryOptions.filters.categories = {
          id: { $in: categories }
        };
      }

      if (tags.length > 0) {
        queryOptions.filters.tags = {
          id: { $in: tags }
        };
      }

      if (!seriesItems.includes('all')) {
        queryOptions.filters.series_items = {
          id: { $in: seriesItems }
        };
      }

      if (search.length > 0) {
        queryOptions.filters.$or = [
          { title: { $containsi: search } },
          { description_short: { $containsi: search } },
          { description_long: { $containsi: search } }
        ];
      }

      const response: AxiosResponse<{
        data: InterfaceItem[];
      }> = await axios.get(
        `${
          config.apiUrl
        }/items?populate[link]=true&populate[media]=true&populate[featured_image]=true&populate[categories][populate][0]=featured_image&populate[tags]=true&populate[collections][populate][0]=featured_image&populate[series_items]=true&${qs.stringify(
          queryOptions
        )}`
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const items: InterfaceItem[] = response.data.data;
      const packagedItems: InterfaceItem[] = items.map(
        (item: InterfaceItem) => {
          return packageItem(item);
        }
      );

      return packagedItems;
    }
  } catch (error) {
    console.error(error);
  }
};

const fetchItem = async (
  id: string,
  preview = false
): Promise<InterfaceItem | undefined> => {
  try {
    if ('apiUrl' in config) {
      const token: string | null = await getAuthenticationToken();
      const endpoint = preview
        ? `${config.apiUrl}/previewer/item/${id}`
        : `${config.apiUrl}/items/${id}?populate=*`;
      const response: AxiosResponse<{
        data: InterfaceItem;
      }> = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const item: InterfaceItem = response.data.data;
      return packageItem(item);
    }
  } catch (error) {
    console.error(error);
  }
};

const generatePresignedItemUrl = async (
  hash: string
): Promise<InterfaceItemMediaObject | undefined> => {
  try {
    if ('apiUrl' in config) {
      const token: string | null = await getAuthenticationToken();
      const response: AxiosResponse = await axios.get(
        `${config.apiUrl}/items/download/${hash}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return response.data;
    }
  } catch (error) {
    console.error(error);
  }
};

const defaultState: InterfaceStateItems = {
  items: []
};

const state = reactive({
  ...defaultState
});

const useItems = () => {
  const getItems = async (
    categories: string[] = [],
    tags: number[] = [],
    seriesItems: string[] = [],
    search: string
  ) => {
    const items: InterfaceItem[] | undefined = await fetchItems(
      categories,
      tags,
      seriesItems,
      search
    );

    if (items === undefined) {
      console.error('Items is undefined');
    } else {
      state.items = [...items];
      console.log(state);
    }

    return items;
  };

  const getItem = async (id: string, preview = false) => {
    const item: InterfaceItem | undefined = await fetchItem(id, preview);

    if (item === undefined) {
      console.error(`Item ${id} is undefined`);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const items: InterfaceItem[] = JSON.parse(JSON.stringify(state.items));
      const itemIndex: number = items.findIndex(
        currentItem => String(currentItem.id) === id
      );
      if (itemIndex === -1) {
        items.push(item);
      } else {
        items[itemIndex] = item;
      }
      state.items = items;
    }

    return {
      ...state.items
    };
  };

  return {
    getItems,
    getItem,
    generatePresignedItemUrl,
    state
  };
};

export { useItems };
