/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { locateStalls } from './official-data.ts';
import type { StallData, PromoLink, PromoStall } from './types.ts';

// Convert the locateStalls array into a Map for efficient O(1) lookups by stall letter.
const locateStallMap = new Map(locateStalls.map(s => [s.id, s]));

/**
 * Parses a string of semi-colon delimited links into an array of PromoLink objects.
 * Expected format: "Link Text 1|http://...;Link Text 2|http://..."
 * @param linksStr The string to parse.
 * @returns An array of PromoLink objects.
 */
function parsePromoLinks(promoUser: string, linksStr: string | undefined): PromoLink[] {
    if (!linksStr) return [];
    return linksStr.split(';')
        .map((part, index) => {
            const text = `${promoUser}-宣傳車${index+1}`;
            const href = part.trim();
            return { text, href };
        })
        .filter((link): link is PromoLink => link !== null && !!link.text && !!link.href); // Filter out invalid entries.
}

/**
 * Parses a string of semi-colon delimited tags into an array of string[].
 * Expected format: "tag Text 1;Link Text 2"
 * @param tagsStr The string to parse.
 * @returns An array of string[].
 */
function parsePromoTags(tagsStr: string | undefined): string[] {
    if (!tagsStr) return [];
    return tagsStr.split(';').map(t => t.trim()).filter(t => t);
}


/**
 * Processes raw data from the sheet into the application's StallData format.
 * This function groups multiple promotion rows (with the same ID) into one stall object
 * and calculates the coordinates for each stall's interactive area on the map.
 * @param rawData Array of objects parsed from CSV.
 * @returns An array of fully processed StallData objects.
 */
export function processStalls(rawData: Record<string, string>[]): StallData[] {
    // Use a Map to group all data by stall ID. This allows us to merge multiple rows
    // (e.g., one for official data, multiple for promo data) into a single object.
    const stallsMap = new Map<string, StallData>();

    rawData.forEach(rawStall => {
        const id = rawStall.id || rawStall.stallId;
        if (!id) return; // Skip rows without an ID, as they can't be processed.

        let stallEntry = stallsMap.get(id);

        // If this is the first time we see this stall ID, create the base StallData object.
        if (!stallEntry) {
            const line = id.substring(0, 1); // e.g., 'A' from 'A01'
            const num = parseInt(rawStall.num, 10);
            const stallCnt = parseInt(rawStall.stallCnt, 10) || 1; // How many table spaces the stall occupies.
            const locateStall = locateStallMap.get(line); // Get the template coordinates for this row/column.

            // If we can't find a template or the number is invalid, we can't calculate a position.
            if (!locateStall || isNaN(num)) {
                console.warn(`Could not calculate position for stall ID: ${id}. Skipping base creation.`);
                return;
            }

            // --- Coordinate Calculation ---
            const coordsTemplate = locateStall.coords;
            let myCoords: NonNullable<StallData['coords']>;
            let myNumericCoords: NonNullable<StallData['numericCoords']>;

            // Most stalls are in horizontal rows, calculate position from right to left.
            if (line !== '狗' && line !== '雞' && line !== '猴' && line !== '特' && line !== '商'  ) {
                const numInBlock = num > 36 ? 72 - num: num;
                // There are visual gaps in the numbering on the map, account for them.
                let gapSize = 0;
                let top = coordsTemplate.top;
                let left = coordsTemplate.left;

                if (num > 24 && num <= 48 ) {
                    gapSize = 1.75;
                } else if (num <= 12 || num >= 61) {
                    gapSize = 0;
                } else {
                    gapSize = 0.9;
                }
                if (num > 36) {
                    top = top - coordsTemplate.height - 0.25;
                    left = coordsTemplate.left - ((numInBlock) % 72 * coordsTemplate.width) - gapSize;
                } else {
                    left = coordsTemplate.left - ((numInBlock - 1) * coordsTemplate.width) - gapSize;
                    if (stallCnt > 1) {
                        left -= (stallCnt - 1) * coordsTemplate.width;
                    }
                }
                
                const finalLeft = parseFloat(left.toFixed(2));
                const finalWidth = coordsTemplate.width * stallCnt;

                myCoords = {
                    top: `${top}%`,
                    left: `${finalLeft}%`,
                    width: `${finalWidth}%`,
                    height: `${coordsTemplate.height}%`
                };

                myNumericCoords = {
                    top: top,
                    left: finalLeft,
                    width: finalWidth,
                    height: coordsTemplate.height
                };

            } else { // Handle the few vertical columns.
                let tempNum = num;
                let gapSize = 0;
                if (line === '狗') {
                    if(num >= 4 && num < 16) {
                        tempNum = 3;
                        gapSize = 0.8;
                    } else if (num >= 16) {
                        tempNum = num - 12;
                        gapSize = 0.4;
                    }
                } else if (line === '雞') {
                    if(num >= 4 && num < 21) {
                        tempNum = 3;
                        gapSize = 0.8;
                    } else if (num >= 21) {
                        tempNum = num - 17;
                        gapSize = 0.4;
                    }
                } else if (line === '猴'){
                    if(num >= 4 && num < 23) {
                        tempNum = 3;
                        gapSize = 0.8;
                    } else if (num >= 23) {
                        tempNum = num - 19;
                        gapSize = 0.5;
                    }
                } else {}
                let top = coordsTemplate.top - coordsTemplate.height * (tempNum - 1) - gapSize;
                if (stallCnt > 1) {
                    top -= (stallCnt - 1) * coordsTemplate.height;
                }

                const finalTop = parseFloat(top.toFixed(2));
                const finalHeight = coordsTemplate.height * stallCnt;

                myCoords = {
                    top: `${finalTop}%`,
                    left: `${coordsTemplate.left}%`,
                    width: `${coordsTemplate.width}%`,
                    height: `${finalHeight}%`
                };

                myNumericCoords = {
                    top: finalTop,
                    left: coordsTemplate.left,
                    width: coordsTemplate.width,
                    height: finalHeight,
                };
            }

            // Create the new entry in the map.
            stallEntry = {
                id: id,
                num: num,
                stallCnt: stallCnt,
                coords: myCoords,
                numericCoords: myNumericCoords,
                stallTitle: rawStall.stallTitle || 'N/A',
                stallImg: rawStall.stallImg || undefined,
                stallLink: rawStall.stallLink || undefined,
                promoData: [], // Initialize with an empty array for promotions.
                promoTags: [],
            };
            stallsMap.set(id, stallEntry);
        }

        // --- Promotion Data Aggregation ---
        // If the current row contains promotion data, create a PromoStall object
        // and add it to the stall's promoData array.
        const promoUser = rawStall.promoUser || '';
        if (promoUser) {
            const promo: PromoStall = {
                stallId: id,
                promoUser: promoUser,
                promoAvatar: rawStall.promoAvatar || '',
                promoHTML: rawStall.promoHTML || '',
                promoLinks: parsePromoLinks(promoUser, rawStall.promoLinks),
                promoTags: parsePromoTags(rawStall.promoTags),
            };
            stallEntry.promoData.push(promo);
        }
    });

    // Post-process to collect all unique tags for each stall.
    stallsMap.forEach(stall => {
        const uniqueTags = new Set<string>();
        stall.promoData.forEach(promo => {
            promo.promoTags.forEach(tag => uniqueTags.add(tag));
        });
        stall.promoTags = Array.from(uniqueTags);
    });

    // Convert the Map values back to an array to be used by the application.
    return Array.from(stallsMap.values());
}