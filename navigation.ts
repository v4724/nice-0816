/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { StallData } from './types.ts';

/** The definitive order of all rows on the map. */
export const allRowIds = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '商', '特', '猴', '雞', '狗'];

/**
 * Gets the list of stalls that can be navigated through, based on the current search filter.
 * @param allStalls The complete list of all stalls.
 * @param searchTerm The current value from the search input.
 * @returns An array of StallData objects that match the search.
 */
export const getNavigableStalls = (allStalls: StallData[], searchTerm: string): StallData[] => {
  const normalizedSearch = searchTerm.toLowerCase().trim();
  if (normalizedSearch === '') {
    return allStalls;
  }
  return allStalls.filter(stall => {
    const hasPromoUserMatch = stall.promoData.some(promo =>
      promo.promoUser.toLowerCase().includes(normalizedSearch)
    );
    return stall.id.toLowerCase().includes(normalizedSearch) ||
           stall.stallTitle.toLowerCase().includes(normalizedSearch) ||
           hasPromoUserMatch;
  });
};

/**
 * Finds the ID of an adjacent stall based on the map's layout.
 * @param currentStall The stall to navigate from.
 * @param navigableStalls The list of currently visible/search-matched stalls.
 * @param direction 'up', 'down', 'left', or 'right'.
 * @returns The ID of the adjacent stall, or null if none exists.
 */
export const getAdjacentStallId = (
    currentStall: StallData,
    navigableStalls: StallData[],
    direction: 'up' | 'down' | 'left' | 'right'
): string | null => {
    const currentLine = currentStall.id.substring(0, 1);
    const currentNum = currentStall.num;
    const isCurrentVertical = ['狗', '雞', '猴', '特', '商'].includes(currentLine);
    const currentRowIndex = allRowIds.indexOf(currentLine);

    if (direction === 'right' && currentLine >= 'A' && currentLine <= 'Q' && (currentNum === 1 || currentNum === 72)) {
        return null;
    }

    if (direction === 'left' || direction === 'right') {
        const horizDirection = direction === 'right' ? 'prev' : 'next';
        const isReversed = !isCurrentVertical && !(currentNum >= 1 && currentNum <= 36);
        const step = horizDirection === 'next' ? 1 : -1;
        const directionStep = isReversed ? -step : step

        let targetNum = currentNum + directionStep;
        while(targetNum >=1 && targetNum <= 72) {
            const foundStallInRow = navigableStalls.find(s => s.id.startsWith(currentLine) && s.num === targetNum);
            if (foundStallInRow) return foundStallInRow.id;

            targetNum += directionStep;
        }


        // Wrap to adjacent row (logic only for up/down visual movement)
        return null; 
    }

    if (direction === 'up' || direction === 'down') {
        if (currentRowIndex === -1) return null;
        // Moving 'up' on the map means going from row A -> B, or 猴 -> 雞, which is an increase in the allRowIds index.
        const step = direction === 'up' ? 1 : -1;
        
        let targetRowIndex = currentRowIndex + step;
        while(targetRowIndex >= 0 && targetRowIndex < allRowIds.length) {
            const targetRowId = allRowIds[targetRowIndex];
            const stallsInTargetRow = navigableStalls.filter(s => s.id.startsWith(targetRowId));
            if (stallsInTargetRow.length > 0) {
                let targetStall: StallData | undefined;

                // If navigating from a vertical row, connect to the top/bottom of the next row.
                if (isCurrentVertical) {
                    if (direction === 'down') {
                        // Moving DOWN from a vertical row (e.g., 狗 -> 雞).
                        // Land on the stall with the HIGHEST number in the target row (the top-most stall).
                        targetStall = stallsInTargetRow.sort((a, b) => b.num - a.num)[0];
                    } else { // direction === 'up'
                        // Moving UP from a vertical row (e.g., 雞 -> 狗).
                        // Land on the stall with the LOWEST number in the target row (the bottom-most stall).
                        targetStall = stallsInTargetRow.sort((a, b) => a.num - b.num)[0];
                    }
                } else {
                    // Default behavior: find the stall with the closest number.
                    targetStall = stallsInTargetRow.find(s => s.num === currentNum);
                    if (!targetStall) {
                        targetStall = stallsInTargetRow.sort((a, b) => Math.abs(a.num - currentNum) - Math.abs(b.num - currentNum))[0];
                    }
                }
                return targetStall?.id || null;
            }
            targetRowIndex += step; // continue searching in the same direction
        }
    }

    return null;
};