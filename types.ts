/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Data type for a promotional link. */
export interface PromoLink {
  /** The destination URL of the link. */
  href: string;
  /** The visible text for the link. */
  text: string;
}

/** Data from user-submitted promotions, representing a single promotion entry. */
export interface PromoStall {
  /** The ID of the stall this promotion belongs to. */
  stallId: string;
  /** The name of the user who submitted the promotion. */
  promoUser: string;
  /** The URL of the user's avatar image. */
  promoAvatar: string;
  /** The main content of the promotion, can contain HTML. */
  promoHTML: string;
  /** An array of links associated with this specific promotion. */
  promoLinks: PromoLink[];
}

/** 
 * Unified data structure for a single stall, combining all sources of info.
 * This is the final object used by the application logic for rendering and interaction.
 */
export interface StallData {
  /** The unique identifier for the stall (e.g., "A01"). */
  id: string;
  /** The stall number (e.g., 1 for "A01"). */
  num: number;

  stallCnt: number;
  /** The calculated string-based coordinates and dimensions for the stall's interactive area on the map. */
  coords: {
    top: string;
    left: string;
    width: string;
    height: string;
  };
  /** Pre-calculated numeric coordinates for performant calculations in JS. */
  numericCoords: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  // Official data from event site
  /** The official title or name of the stall. */
  stallTitle: string;
  /** The optional URL for the stall's official promotional image. */
  stallImg?: string;
  /** The optional URL for the stall's main website or social media. */
  stallLink?: string;
  /** An array of all user-submitted promotions associated with this stall. */
  promoData: PromoStall[];
}

/** 
 * Data for locating the start of a stall column on the map.
 * This is used as a template to calculate the exact position of each stall in that column.
 */
export interface LocateStall {
  /** The identifier for the column (e.g., "A", "B"). */
  id: string;
  /** The starting number for this column, usually 1. */
  num: number;
  /** The coordinates of the first stall in the column, used as a reference point. */
  coords: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  /** The bounding box for the entire row of stalls, used for accurate detection. */
  border: {
    top: number;
    left: number;
    bottom: number;
    right: number;
  };
  /** If true, this row is treated as a single clickable area. */
  isGrouped?: boolean;
}