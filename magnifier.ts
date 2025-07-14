/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { locateStalls } from './official-data.ts';
import { allRowIds } from './navigation.ts';

/**
 * An interface for the controller object returned by createMagnifier.
 * This defines the public API for the main application to interact with the magnifier's state.
 */
export interface MagnifierController {
  /** Adds a stall element and its clone to the magnifier system. */
  addStall: (stallElement: HTMLElement) => void;
  /** Adds a group area element and its clone to the magnifier's stall layer. */
  addGroupArea: (groupElement: HTMLElement) => void;
  /** Updates a class on both the original stall and its clone using the stall's ID. */
  updateStallClass: (stallId: string, className: string, force: boolean) => void;
  /** Shows the magnifier. */
  show: () => void;
  /** Hides the magnifier. */
  hide: () => void;
  /** Toggles the visibility of the magnifier. */
  toggle: () => void;
  /** Returns true if the magnifier is currently visible. */
  isShown: () => boolean;
}

/**
 * Creates and manages a draggable magnifier for the map. This function encapsulates all
 * logic related to the magnifier, including its state, event handling, and synchronization
 * with the main map.
 *
 * @param mapContainer The main container for the map and stalls.
 * @param mapImage The image element of the map.
 * @param magnifierWrapper The wrapper element that is moved and positioned.
 * @param magnifier The magnifier lens element (for visuals).
 * @param magnifierStallLayer The layer inside the magnifier that holds cloned stalls.
 * @param indicators An object containing the three indicator elements.
 * @param toggleButton The button to show/hide the magnifier.
 * @param onAreaClick A callback function to execute when a stall or group area inside the magnifier is clicked.
 * @param isMobile A boolean indicating if the current device is mobile.
 * @returns A controller object to interact with the magnifier.
 */
export function createMagnifier(
    mapContainer: HTMLElement,
    mapImage: HTMLImageElement,
    magnifierWrapper: HTMLElement,
    magnifier: HTMLElement,
    magnifierStallLayer: HTMLElement,
    indicators: { prev: HTMLElement; current: HTMLElement; next: HTMLElement },
    toggleButton: HTMLElement,
    onAreaClick: (target: HTMLElement) => void,
    isMobile: boolean
): MagnifierController {
    // --- State and Configuration ---
    const zoomFactor = isMobile ? 3.5 : 2.5; // Use a higher zoom for mobile.
    const stallIdToOriginalMap = new Map<string, HTMLElement>();
    const stallIdToCloneMap = new Map<string, HTMLElement>();

    let isDragging = false;
    let isShownState = false;
    let hasBeenPositioned = false; // Flag to center the magnifier only once.
    // Variables to track drag state.
    let dragStartX = 0;
    let dragStartY = 0;
    let initialLensX = 0;
    let initialLensY = 0;
    let dragHappened = false; // Differentiates a click from a drag.
    let clickTarget: HTMLElement | null = null; // The element that was initially clicked.
    
    /**
     * Finds the closest row to the magnifier's center and updates the indicator elements.
     * It hides the indicator if the magnifier is outside the vertical bounds of all stall rows.
     */
    const updateRowIndicator = () => {
        const mapWidth = mapContainer.offsetWidth;
        const mapHeight = mapContainer.offsetHeight;
        if (mapWidth === 0 || mapHeight === 0) return;

        const lensCenterX_pct = ((magnifierWrapper.offsetLeft + magnifierWrapper.offsetWidth / 2) / mapWidth) * 100;
        const lensCenterY_pct = ((magnifierWrapper.offsetTop + magnifierWrapper.offsetHeight / 2) / mapHeight) * 100;
        
        // Boundaries for showing the indicator based on the top-most and bottom-most stall rows.
        const TOP_VISIBLE_BOUNDARY_Y = 9.15;
        const BOTTOM_VISIBLE_BOUNDARY_Y = 89.2;

        // Hide indicator if magnifier is above the top row or below the bottom row.
        if (lensCenterY_pct < TOP_VISIBLE_BOUNDARY_Y || lensCenterY_pct > BOTTOM_VISIBLE_BOUNDARY_Y) {
            indicators.current.textContent = '';
            indicators.prev.textContent = '';
            indicators.next.textContent = '';
            return;
        }

        let closestRowData: (typeof locateStalls[0]) | null = null;
        let minDistanceSq = Infinity;

        // Find the row that is geometrically closest to the magnifier's center. This prevents flickering in aisles.
        for (const row of locateStalls) {
            const dx = Math.max(row.border.left - lensCenterX_pct, 0, lensCenterX_pct - row.border.right);
            const dy = Math.max(row.border.top - lensCenterY_pct, 0, lensCenterY_pct - row.border.bottom);
            const distanceSq = dx * dx + dy * dy;

            if (distanceSq < minDistanceSq) {
                minDistanceSq = distanceSq;
                closestRowData = row;
            }
        }

        if (closestRowData) {
            const currentIndex = allRowIds.indexOf(closestRowData.id);
            indicators.current.textContent = closestRowData.id;
            indicators.prev.textContent = currentIndex > 0 ? allRowIds[currentIndex - 1] : '';
            indicators.next.textContent = currentIndex < allRowIds.length - 1 ? allRowIds[currentIndex + 1] : '';
        } else {
            // This case is a fallback, but should not be reached with the current logic.
            indicators.current.textContent = '';
            indicators.prev.textContent = '';
            indicators.next.textContent = '';
        }
    };


    /**
     * Calculates and applies the zoom effect by updating the background position
     * of the magnifier lens and the position of the cloned stall layer.
     */
    const updateZoom = () => {
        const lensWidth = magnifierWrapper.offsetWidth;
        const lensHeight = magnifierWrapper.offsetHeight;

        // The center point of the lens relative to the map container.
        const lensCenterX = magnifierWrapper.offsetLeft + lensWidth / 2;
        const lensCenterY = magnifierWrapper.offsetTop + lensHeight / 2;
        
        // Calculate the position of the background image inside the lens.
        // This is the core of the zoom effect.
        const bgX = -(lensCenterX * zoomFactor - lensWidth / 2);
        const bgY = -(lensCenterY * zoomFactor - lensHeight / 2);
        
        // Move both the background image and the cloned stall layer to keep them in sync.
        magnifier.style.backgroundPosition = `${bgX}px ${bgY}px`;
        magnifierStallLayer.style.left = `${bgX}px`;
        magnifierStallLayer.style.top = `${bgY}px`;
        updateRowIndicator();
    }

    /**
     * Sets the magnifier's position, clamps it within bounds, and updates the zoom.
     * It also ensures the row indicator remains visible without being clipped by the map edges.
     * @param newLeft The target left position.
     * @param newTop The target top position.
     */
    const setPosition = (newLeft: number, newTop: number) => {
        const lensWidth = magnifierWrapper.offsetWidth;
        const lensHeight = magnifierWrapper.offsetHeight;
        const mapWidth = mapContainer.offsetWidth;
        const mapHeight = mapContainer.offsetHeight;

        // Clamp the magnifier's position so it's always at least partially on the map.
        const minLeft = -lensWidth / 2;
        const minTop = -lensHeight / 2;
        const maxLeft = mapWidth - lensWidth / 2;
        const maxTop = mapHeight - lensHeight / 2;
        
        const clampedLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
        const clampedTop = Math.max(minTop, Math.min(newTop, maxTop));
        
        magnifierWrapper.style.left = `${clampedLeft}px`;
        magnifierWrapper.style.top = `${clampedTop}px`;

        // Keep the row indicator container pinned within the visible map area.
        const indicatorContainer = indicators.current.parentElement;
        if (indicatorContainer) {
            const indicatorWidth = indicatorContainer.offsetWidth;
            let shiftX = 0;
            
            // If magnifier is off the left edge, shift indicator to the right to stay visible.
            if (clampedLeft < 0) {
                shiftX = -clampedLeft; // `clampedLeft` is negative, so this is a positive shift.
            } 
            // If magnifier indicator is off the right edge, shift it to the left.
            else if (clampedLeft + indicatorWidth > mapWidth) {
                shiftX = mapWidth - (clampedLeft + indicatorWidth); // This will be a negative shift.
            }
            
            indicatorContainer.style.transform = `translateX(${shiftX}px) translateY(-50%)`;
        }
        
        updateZoom();
    };

    // --- Unified Drag and Interaction Handlers for Mouse and Touch ---
    const onDragStart = (e: MouseEvent | TouchEvent) => {
      // Prevent default browser actions like text selection or page scrolling on touch.
      e.preventDefault();

      isDragging = true;
      dragHappened = false; // Reset for the new interaction.
      clickTarget = e.target as HTMLElement; // Store the initial target.
      
      const touch = (e as TouchEvent).touches?.[0];
      const clientX = touch ? touch.clientX : (e as MouseEvent).clientX;
      const clientY = touch ? touch.clientY : (e as MouseEvent).clientY;

      // Record the starting position of the mouse/touch and the lens.
      dragStartX = clientX;
      dragStartY = clientY;
      initialLensX = magnifierWrapper.offsetLeft;
      initialLensY = magnifierWrapper.offsetTop;

      // Add listeners to the document to track movement anywhere on the page.
      document.addEventListener('mousemove', onDragMove);
      document.addEventListener('touchmove', onDragMove, { passive: false });
      document.addEventListener('mouseup', onDragEnd);
      document.addEventListener('touchend', onDragEnd);
    };

    const onDragMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging) return;
        
        const touch = (e as TouchEvent).touches?.[0];
        const clientX = touch ? touch.clientX : (e as MouseEvent).clientX;
        const clientY = touch ? touch.clientY : (e as MouseEvent).clientY;
        
        const dx = clientX - dragStartX; // Change in mouse/touch X.
        const dy = clientY - dragStartY; // Change in mouse/touch Y.

        // Check if movement exceeds a threshold to be considered a drag.
        if (!dragHappened && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
            dragHappened = true;
        }

        setPosition(initialLensX + dx, initialLensY + dy);
    };

    const onDragEnd = () => {
        if (!isDragging) return;
        isDragging = false;

        // Clean up all event listeners.
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('touchmove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);
        document.removeEventListener('touchend', onDragEnd);

        // If no significant movement happened, it's a click.
        if (!dragHappened && clickTarget) {
            const clickedArea = clickTarget.closest('.stall-area');
            if (clickedArea) {
                // Delegate to the main click handler.
                onAreaClick(clickTarget);
            }
        }
        clickTarget = null; // Clear the stored target.
    };
    
    const show = () => {
        isShownState = true;
        
        // Configure magnifier properties right before showing it to ensure
        // the map image's dimensions are loaded and correct.
        magnifier.style.backgroundSize = `${mapImage.offsetWidth * zoomFactor}px ${mapImage.offsetHeight * zoomFactor}px`;
        magnifier.style.backgroundImage = `url('${mapImage.src}')`;

        // Configure the cloned stall layer to match the map and apply scaling.
        magnifierStallLayer.style.width = `${mapImage.offsetWidth}px`;
        magnifierStallLayer.style.height = `${mapImage.offsetHeight}px`;
        magnifierStallLayer.style.transform = `scale(${zoomFactor})`;
        
        magnifierWrapper.style.display = 'block';

        // --- Center magnifier on first show ---
        // If it's the first time, position it in the middle of the map.
        if (!hasBeenPositioned) {
            const mapWidth = mapContainer.offsetWidth;
            const mapHeight = mapContainer.offsetHeight;
            const lensWidth = magnifierWrapper.offsetWidth;
            const lensHeight = magnifierWrapper.offsetHeight;

            setPosition((mapWidth - lensWidth) / 2, (mapHeight - lensHeight) / 2);
            hasBeenPositioned = true; // Set flag so it doesn't re-center again.
        }

        toggleButton.setAttribute('aria-pressed', 'true'); // For accessibility
        toggleButton.textContent = '隱藏放大鏡';
        updateZoom(); // Perform initial zoom update.
    };
    
    const hide = () => {
        isShownState = false;
        magnifierWrapper.style.display = 'none';
        toggleButton.setAttribute('aria-pressed', 'false');
        toggleButton.textContent = '顯示放大鏡';
    };
    
    const toggle = () => {
        if (isShownState) {
            hide();
        } else {
            show();
        }
    };

    // --- Event Listeners ---
    toggleButton.addEventListener('click', toggle);
    // Listen for both mouse and touch start events on the magnifier.
    magnifierWrapper.addEventListener('mousedown', onDragStart);
    magnifierWrapper.addEventListener('touchstart', onDragStart, { passive: false });

    // --- Controller Methods (Public API) ---
    const controller: MagnifierController = {
        addStall: (stallElement) => {
            const stallId = stallElement.dataset.stallId;
            if (!stallId) return;
            const clone = stallElement.cloneNode(true) as HTMLElement;
            magnifierStallLayer.appendChild(clone);
            // Store references to both the original and the clone for synchronization.
            stallIdToOriginalMap.set(stallId, stallElement);
            stallIdToCloneMap.set(stallId, clone);
        },
        addGroupArea: (groupElement: HTMLElement) => {
            const clone = groupElement.cloneNode(true) as HTMLElement;
            magnifierStallLayer.appendChild(clone);
        },
        updateStallClass: (stallId: string, className: string, force: boolean) => {
            // Find the original stall on the main map.
            const original = stallIdToOriginalMap.get(stallId);
            if (original) {
                original.classList.toggle(className, force);
            }
            
            // Find the cloned stall in the magnifier.
            const clone = stallIdToCloneMap.get(stallId);
            if (clone) {
                clone.classList.toggle(className, force);
            }
        },
        show,
        hide,
        toggle,
        isShown: () => isShownState,
    };

    return controller;
}