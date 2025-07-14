/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { fetchStallData } from './data-loader.ts';
import { processStalls } from './stall-processor.ts';
import { createMagnifier } from './magnifier.ts';
import { getDOMElements } from './dom-elements.ts';
import { initializeModalEventListeners, openModal } from './modal-manager.ts';
import { renderStalls, uiState, updateStallClass } from './ui-manager.ts';
import { initializeApp } from './app-loader.ts';
import { locateStalls } from './official-data.ts';

/**
 * Renders visual borders on the map for each stall row for debugging purposes.
 * These are hidden by default and shown only when the map container has the 'debug-mode' class.
 * @param mapContainer The HTML element that contains the map.
 */
function renderDebugBorders(mapContainer: HTMLElement) {
  locateStalls.forEach(row => {
    const borderEl = document.createElement('div');
    borderEl.className = 'debug-border';
    borderEl.style.top = `${row.border.top}%`;
    borderEl.style.left = `${row.border.left}%`;
    borderEl.style.width = `${row.border.right - row.border.left}%`;
    borderEl.style.height = `${row.border.bottom - row.border.top}%`;

    const label = document.createElement('span');
    label.textContent = row.id;
    borderEl.appendChild(label);

    mapContainer.appendChild(borderEl);
  });
}

/**
 * Initializes and runs the entire application.
 * This function orchestrates the fetching of data, processing it, setting up the UI,
 * and binding all the necessary event listeners for user interaction by delegating
 * to specialized modules.
 */
async function runApp() {
  const elements = getDOMElements();
  
  // To enable debug borders, add `?debug=true` to the URL.
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('debug') === 'true') {
    elements.mapContainer.classList.add('debug-mode');
  }

  elements.instructionsEl.textContent = '正在載入地圖與攤位資料';
  elements.instructionsEl.classList.add('loading-text');

  // --- Asynchronous Resource Loading ---
  const loadImage = new Promise<void>((resolve, reject) => {
    if (elements.mapImage.complete) {
      resolve();
    } else {
      elements.mapImage.onload = () => resolve();
      elements.mapImage.onerror = () => reject(new Error('Map image failed to load.'));
    }
  });

  try {
    const [rawData] = await Promise.all([fetchStallData(), loadImage]);
    elements.instructionsEl.classList.remove('loading-text');

    if (rawData.length === 0) {
      elements.mapContainer.innerHTML = `<p style="color: red; padding: 20px;"><b>無法載入攤位資料：</b><br>請檢查您的 Google Sheet 是否已「發佈至網路」、網址是否正確，或檢查您的網路連線。</p>`;
      elements.instructionsEl.textContent = '載入失敗';
      return;
    }

    const allStalls = processStalls(rawData);

    // --- Initialization & Setup ---
    // Use a media query for a more robust responsive check based on viewport width.
    const isMobile = () => window.matchMedia("(max-width: 768px)").matches;
    const mobileCheck = isMobile(); // Check once and store the result.
    
    const context = { allStalls, elements, magnifierController: null as any, uiState, isMobile: mobileCheck };

    /** Handles opening the modal for a clicked stall or group area from any context (map or magnifier). */
    const handleAreaClick = (target: HTMLElement) => {
      const clickedGroupArea = target.closest('.stall-group-area') as HTMLElement | null;
      const clickedStallArea = target.closest('.stall-area:not(.stall-group-area)') as HTMLElement | null;

      if (clickedGroupArea?.dataset.rowId) {
        const rowId = clickedGroupArea.dataset.rowId;
        // Find the first stall in the row (top-most for vertical rows) and open its modal directly.
        const stallsInRow = allStalls
          .filter(s => s.id.startsWith(rowId))
          .sort((a, b) => b.num - a.num); // Sort by number descending.

        if (stallsInRow.length > 0) {
          openModal(stallsInRow[0].id, context);
        }
      } else if (clickedStallArea?.dataset.stallId) {
        openModal(clickedStallArea.dataset.stallId, context);
      }
    };

    const magnifierController = createMagnifier(
      elements.mapContainer,
      elements.mapImage,
      elements.magnifierWrapper,
      elements.magnifier,
      elements.magnifierStallLayer,
      { 
        prev: elements.magnifierRowIndicatorPrev,
        current: elements.magnifierRowIndicatorCurrent,
        next: elements.magnifierRowIndicatorNext,
      },
      elements.toggleMagnifierBtn,
      handleAreaClick, // Pass the centralized click handler
      mobileCheck
    );
    context.magnifierController = magnifierController;


    // --- UI Rendering ---
    renderStalls(allStalls, elements, magnifierController, uiState);
    renderDebugBorders(elements.mapContainer);
    
    // --- Event Listener Binding ---
    initializeModalEventListeners(context);


    elements.searchInput.addEventListener('input', () => {
      const searchTerm = elements.searchInput.value.toLowerCase().trim();
      
      // A set to track which rows (by ID) have at least one matching stall.
      const matchingRowIds = new Set<string>();

      allStalls.forEach(stall => {
        const mainElement = document.querySelector(`.stall-area[data-stall-id="${stall.id}"]`) as HTMLElement;
        if (!mainElement) return;

        let isMatch = false;
        if (searchTerm !== '') {
          const hasPromoUserMatch = stall.promoData.some(promo =>
            promo.promoUser.toLowerCase().includes(searchTerm)
          );
          isMatch =
            stall.id.toLowerCase().includes(searchTerm) ||
            stall.stallTitle.toLowerCase().includes(searchTerm) ||
            hasPromoUserMatch;
        }
        
        // 1. Update the class on the individual stall element.
        // This is crucial for the magnifier and the modal views to reflect the search result,
        // even if the element is hidden on the main map (e.g., for grouped rows).
        updateStallClass(mainElement, 'is-search-match', isMatch, magnifierController, uiState);

        // 2. If a match is found, record its row ID.
        if (isMatch) {
          matchingRowIds.add(stall.id.substring(0, 1));
        }
      });

      // 3. Update the visible group area elements based on whether any stall in that row matched.
      locateStalls.forEach(row => {
          const groupAreaElements = document.querySelectorAll(`.stall-group-area[data-row-id="${row.id}"]`) as NodeList;
          groupAreaElements.forEach((groupAreaElement: Node) => {
              const hasMatch = matchingRowIds.has(row.id);
              (groupAreaElement as HTMLElement).classList.toggle('is-search-match', hasMatch);  
          })
      });
    });

    /** Handles interactions on the main map, ignoring those on the magnifier. */
    const handleMainMapInteraction = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;

      // If the interaction started inside the magnifier, do nothing here.
      // The magnifier's own event listeners in magnifier.ts will handle it.
      if (target.closest('#magnifier-wrapper')) {
        return;
      }
      
      // For touch events on the map, prevent default to avoid scrolling/zooming
      // when the user intended to tap a stall.
      if (e.type === 'touchstart') {
          e.preventDefault();
      }

      handleAreaClick(target);
    };

    // --- Set Instructions and Device-Specific Listeners ---
    if (mobileCheck) {
      elements.instructionsEl.textContent = '點擊按鈕可用放大鏡，或直接點擊攤位查看宣傳。';
      // Use touchstart for a responsive feel and to prevent default page actions.
      elements.mapContainer.addEventListener('mousedown', handleMainMapInteraction, { passive: false });
      elements.mapContainer.addEventListener('touchstart', handleMainMapInteraction, { passive: false });
    } else {
      elements.instructionsEl.textContent = '點擊按鈕顯示/隱藏放大鏡並拖曳。點擊攤位(含放大鏡內)可看宣傳。';

      // Desktop-only hover tooltips
      document.addEventListener('mousemove', (e: MouseEvent) => {
        if (uiState.selectedStallElement) return;
        elements.tooltip.style.left = `${e.clientX + 15}px`;
        elements.tooltip.style.top = `${e.clientY + 15}px`;
      });

      elements.mapContainer.addEventListener('mouseover', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const stallArea = target.closest('.stall-area:not(.stall-group-area)');
        if (stallArea && !uiState.selectedStallElement) {
          const stallId = (stallArea as HTMLElement).dataset.stallId;
          const stall = allStalls.find(s => s.id === stallId);
          if (stall) {
            const firstPromo = stall.promoData?.[0];
            elements.tooltip.innerHTML = `<strong>${stall.stallTitle}</strong><br><small>${stall.id}${firstPromo?.promoUser ? ` / ${firstPromo.promoUser}` : ''}</small>`;
            elements.tooltip.classList.remove('hidden');
          }
        }
      });

      elements.mapContainer.addEventListener('mouseout', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('stall-area')) {
          elements.tooltip.classList.add('hidden');
        }
      });
      
      // Use mousedown for a responsive click feel on desktop.
      elements.mapContainer.addEventListener('mousedown', handleMainMapInteraction);
    }

  } catch (error) {
    console.error("Failed to initialize app:", error);
    elements.instructionsEl.classList.remove('loading-text');
    elements.instructionsEl.textContent = '地圖或資料載入失敗，請重新整理頁面。';
  }
}

initializeApp(runApp);