/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * A list of all DOM element IDs that are critical for the application's functionality.
 * This is used by the app loader to ensure the DOM is ready before running the main script.
 */
export const criticalElementIds = [
  'map-container', 'map-image', 'magnifier-wrapper', 'magnifier', 'magnifier-stall-layer',
  'tooltip', 'modal', 'modal-close', 'modal-overlay',
  'modal-title', 'modal-body', 'modal-footer', 'instructions-text',
  'search-input', 'toggle-magnifier-btn',
  'modal-magnifier-wrapper', 'modal-magnifier', 'modal-magnifier-stall-layer', 'modal-nav-controls', 'modal-nav-up',
  'modal-nav-down', 'modal-nav-left', 'modal-nav-right',
  'magnifier-row-indicator-container', 'magnifier-row-indicator-prev', 'magnifier-row-indicator-current', 'magnifier-row-indicator-next',
  'modal-magnifier-row-indicator-container', 'modal-magnifier-row-indicator-prev', 'modal-magnifier-row-indicator-current', 'modal-magnifier-row-indicator-next',
  'modal-vertical-stall-list',
];

/**
 * Selects all necessary DOM elements for the application.
 * Throws an error if any critical element is not found, ensuring a fail-fast approach.
 * @returns An object containing all the required DOM elements, strongly typed.
 */
export function getDOMElements() {
  const elements = {
    mapContainer: document.getElementById('map-container') as HTMLElement,
    mapImage: document.getElementById('map-image') as HTMLImageElement,
    magnifierWrapper: document.getElementById('magnifier-wrapper') as HTMLElement,
    magnifier: document.getElementById('magnifier') as HTMLElement,
    magnifierStallLayer: document.getElementById('magnifier-stall-layer') as HTMLElement,
    magnifierRowIndicatorContainer: document.getElementById('magnifier-row-indicator-container') as HTMLElement,
    magnifierRowIndicatorPrev: document.getElementById('magnifier-row-indicator-prev') as HTMLElement,
    magnifierRowIndicatorCurrent: document.getElementById('magnifier-row-indicator-current') as HTMLElement,
    magnifierRowIndicatorNext: document.getElementById('magnifier-row-indicator-next') as HTMLElement,
    tooltip: document.getElementById('tooltip') as HTMLElement,
    modal: document.getElementById('modal') as HTMLElement,
    modalClose: document.getElementById('modal-close') as HTMLElement,
    modalOverlay: document.getElementById('modal-overlay') as HTMLElement,
    modalHeader: document.querySelector('.modal-header') as HTMLElement,
    modalTitle: document.getElementById('modal-title') as HTMLElement,
    modalBody: document.getElementById('modal-body') as HTMLElement,
    modalFooter: document.getElementById('modal-footer') as HTMLElement,
    instructionsEl: document.getElementById('instructions-text') as HTMLElement,
    searchInput: document.getElementById('search-input') as HTMLInputElement,
    toggleMagnifierBtn: document.getElementById('toggle-magnifier-btn') as HTMLElement,
    modalMagnifierWrapper: document.getElementById('modal-magnifier-wrapper') as HTMLElement,
    modalMagnifier: document.getElementById('modal-magnifier') as HTMLElement,
    modalMagnifierStallLayer: document.getElementById('modal-magnifier-stall-layer') as HTMLElement,
    modalMagnifierRowIndicatorContainer: document.getElementById('modal-magnifier-row-indicator-container') as HTMLElement,
    modalMagnifierRowIndicatorPrev: document.getElementById('modal-magnifier-row-indicator-prev') as HTMLElement,
    modalMagnifierRowIndicatorCurrent: document.getElementById('modal-magnifier-row-indicator-current') as HTMLElement,
    modalMagnifierRowIndicatorNext: document.getElementById('modal-magnifier-row-indicator-next') as HTMLElement,
    modalNavControls: document.getElementById('modal-nav-controls') as HTMLElement,
    modalNavUp: document.getElementById('modal-nav-up') as HTMLButtonElement,
    modalNavDown: document.getElementById('modal-nav-down') as HTMLButtonElement,
    modalNavLeft: document.getElementById('modal-nav-left') as HTMLButtonElement,
    modalNavRight: document.getElementById('modal-nav-right') as HTMLButtonElement,
    modalVerticalStallList: document.getElementById('modal-vertical-stall-list') as HTMLElement,
  };

  // Validate that all elements were found
  for (const key in elements) {
    if (!elements[key as keyof typeof elements]) {
      throw new Error(`Essential DOM element not found: #${key}. The application cannot start.`);
    }
  }

  return elements;
}

export type DOMElements = ReturnType<typeof getDOMElements>;