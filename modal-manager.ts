/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { StallData } from './types.ts';
import type { DOMElements } from './dom-elements.ts';
import type { MagnifierController } from './magnifier.ts';
import { allRowIds, getAdjacentStallId, getNavigableStalls } from './navigation.ts';
import { clearSelection, updateStallClass, UIState } from './ui-manager.ts';

/** A context object to pass dependencies into modal functions. */
interface ModalContext {
  allStalls: StallData[];
  elements: DOMElements;
  magnifierController: MagnifierController | null;
  uiState: UIState;
  isMobile: boolean;
}

// Module-level state for the modal
const modalState = {
  wasMagnifierVisible: false,
};

/**
 * Updates the integrated mini-map view inside the modal.
 * @param stall The stall to display and highlight.
 * @param elements A reference to all DOM elements.
 * @param isMobile Whether the app is running on a mobile device.
 */
function updateModalMagnifierView(stall: StallData, elements: DOMElements, isMobile: boolean) {
  const { modalMagnifierWrapper, modalMagnifier, modalMagnifierStallLayer, mapImage, modalMagnifierRowIndicatorContainer } = elements;
  const { modalMagnifierRowIndicatorPrev, modalMagnifierRowIndicatorCurrent, modalMagnifierRowIndicatorNext } = elements;
  
  if (!stall || !stall.coords) {
    modalMagnifierWrapper.style.display = 'none';
    return;
  }

  modalMagnifierWrapper.style.display = 'block';
  
  // Update the row indicators based on the stall's row ID.
  const rowId = stall.id.substring(0, 1);
  if (rowId === '範') {
    // Hide the row indicator for special, non-grid stalls like '範'.
    modalMagnifierRowIndicatorContainer.style.display = 'none';
  } else {
    // Show and update the indicator for all other stalls.
    modalMagnifierRowIndicatorContainer.style.display = 'flex';
    const currentIndex = allRowIds.indexOf(rowId);
    modalMagnifierRowIndicatorCurrent.textContent = rowId;
    modalMagnifierRowIndicatorPrev.textContent = currentIndex > 0 ? allRowIds[currentIndex - 1] : '';
    modalMagnifierRowIndicatorNext.textContent = currentIndex < allRowIds.length - 1 ? allRowIds[currentIndex + 1] : '';
  }

  const zoomFactor = isMobile ? 4.5 : 1.8;
  const viewW = modalMagnifierWrapper.offsetWidth;
  const viewH = modalMagnifierWrapper.offsetHeight;

  if (viewW === 0 || viewH === 0) {
    modalMagnifierWrapper.style.display = 'none';
    return;
  }

  const mapW = mapImage.offsetWidth;
  const mapH = mapImage.offsetHeight;
  const scaledMapW = mapW * zoomFactor;
  const scaledMapH = mapH * zoomFactor;

  modalMagnifierStallLayer.style.width = `${mapW}px`;
  modalMagnifierStallLayer.style.height = `${mapH}px`;
  modalMagnifierStallLayer.style.transform = `scale(${zoomFactor})`;

  const { left, top, width, height } = stall.coords;
  const [stallLeftPercent, stallTopPercent, stallWidthPercent, stallHeightPercent] = 
    [left, top, width, height].map(parseFloat);

  if ([stallLeftPercent, stallTopPercent, stallWidthPercent, stallHeightPercent].some(isNaN)) {
    console.error("Could not parse stall coordinates for modal magnifier:", stall.coords);
    modalMagnifierWrapper.style.display = 'none';
    return;
  }

  const stallCenterX_px = (stallLeftPercent + stallWidthPercent / 2) / 100 * mapW;
  const stallCenterY_px = (stallTopPercent + stallHeightPercent / 2) / 100 * mapH;

  const bgX = (viewW / 2) - (stallCenterX_px * zoomFactor);
  const bgY = (viewH / 2) - (stallCenterY_px * zoomFactor);

  modalMagnifier.style.backgroundSize = `${scaledMapW}px ${scaledMapH}px`;
  modalMagnifier.style.backgroundImage = `url('${mapImage.src}')`;
  modalMagnifier.style.backgroundPosition = `${bgX}px ${bgY}px`;
  modalMagnifierStallLayer.style.left = `${bgX}px`;
  modalMagnifierStallLayer.style.top = `${bgY}px`;
  
  // Ensure all stalls are visible on desktop/mobile.
  modalMagnifierStallLayer.querySelectorAll('.modal-map-hidden').forEach(el => {
    el.classList.remove('modal-map-hidden');
  });

  const oldHighlight = modalMagnifierWrapper.querySelector('.modal-stall-highlight');
  if (oldHighlight) oldHighlight.remove();

  const highlightEl = document.createElement('div');
  highlightEl.className = 'modal-stall-highlight';
  highlightEl.style.width = `${(stallWidthPercent / 100) * mapW * zoomFactor}px`;
  highlightEl.style.height = `${(stallHeightPercent / 100) * mapH * zoomFactor}px`;
  // Append to wrapper to avoid being clipped by lens's overflow:hidden
  modalMagnifierWrapper.appendChild(highlightEl);
}

/**
 * Populates and opens the modal for a specific stall.
 * @param stallId The ID of the stall to display.
 * @param context An object containing all necessary dependencies.
 */
export function openModal(stallId: string, context: ModalContext) {
  const { allStalls, elements, magnifierController, uiState, isMobile } = context;
  const stall = allStalls.find(s => s.id === stallId);
  if (!stall) return;

  if (magnifierController && elements.modal.classList.contains('hidden')) {
    modalState.wasMagnifierVisible = magnifierController.isShown();
    if (modalState.wasMagnifierVisible) {
      magnifierController.hide();
    }
  }
  
  // Get the previous row ID before clearing the selection
  const previousStallElement = uiState.selectedStallElement;
  const previousRowId = previousStallElement?.dataset.stallId?.substring(0, 1) ?? null;

  clearSelection(elements, magnifierController, uiState);

  const stallElement = document.querySelector(`.stall-area[data-stall-id="${stallId}"]`) as HTMLElement;
  if (stallElement) {
    uiState.selectedStallElement = stallElement;
    updateStallClass(stallElement, 'is-selected', true, magnifierController, uiState);
  }

  elements.modalTitle.textContent = `${stall.id}: ${stall.stallTitle}`;

  // Populate Body
  let bodyHTML = stall.stallImg ? `<img src="${stall.stallImg}" alt="Official Promo Image: ${stall.stallTitle}" class="official-stall-image" />` : '';
  if (stall.stallImg && stall.promoData.length > 0) bodyHTML += `<hr class="promo-section-separator">`;
  
  stall.promoData.forEach((promo, index) => {
    if (index > 0) bodyHTML += `<div class="promo-entry-separator"></div>`;
    const avatar = promo.promoAvatar ? promo.promoAvatar : 'https://images.plurk.com/3rbw6tg1lA5dEGpdKTL8j1.png';
    bodyHTML += `
      <div class="promo-entry">
          <div class="modal-user-info">
              <img src="${avatar}" alt="${promo.promoUser}" class="modal-avatar">
              <span class="modal-username">${promo.promoUser}</span>
          </div>
          <div class="promo-html-content">${promo.promoHTML}</div>
      </div>`;
  });
  elements.modalBody.innerHTML = bodyHTML || '暫無宣傳資訊。';

  // Populate Footer Links
  elements.modalFooter.innerHTML = '';
  const addUniqueLink = (link: { href: string; text: string }) => {
    if (link && link.href) {
      const linkEl = document.createElement('a');
      linkEl.href = link.href;
      linkEl.textContent = link.text;
      linkEl.className = 'footer-link';
      linkEl.target = '_blank';
      linkEl.rel = 'noopener noreferrer';
      elements.modalFooter.appendChild(linkEl);
    }
  };
  stall.promoData.forEach(promo => promo.promoLinks.forEach(addUniqueLink));
  if (stall.stallLink) addUniqueLink({ href: stall.stallLink, text: '社團網站' });
  
  // --- Update Nav Controls ---
  const navigableStalls = getNavigableStalls(allStalls, elements.searchInput.value);
  const rowId = stall.id.substring(0, 1);
  const verticalRowIds = ['猴', '雞', '狗', '特', '商'];
  const isVertical = verticalRowIds.includes(rowId);

  if (isVertical) {
    // Special navigation for vertical rows: up/down moves within the row.
    elements.modalNavLeft.style.display = 'none';
    elements.modalNavRight.style.display = 'none';
    elements.modalNavUp.style.display = 'block';
    elements.modalNavDown.style.display = 'block';
    elements.modalNavUp.ariaLabel = '往上一個攤位';
    elements.modalNavDown.ariaLabel = '往下一個攤位';

    // Try to find adjacent stall within the same vertical column first.
	  // Up (▲) action is num + 1, Down (▼) action is num - 1.
	  let upStallId = undefined;
	  let upStep = 1;
	  while (stall.num + upStep <= 34) {
		  const findId = navigableStalls.find(s => s.id.startsWith(rowId) && s.num === stall.num + upStep)?.id
		  if (findId) {
			  upStallId = findId;
			  break;
		  }
		  upStep += 1;
	  }
	  let downStallId = undefined;
	  let downStep = -1;
	  while (stall.num + downStep > 0) {
		  const findId = navigableStalls.find(s => s.id.startsWith(rowId) && s.num === stall.num + downStep)?.id
		  if (findId) {
			  downStallId = findId;
			  break;
		  }
		  downStep -= 1;
	  }

    // If at the top of the vertical column, find the row "above" (visually).
    if (!upStallId) {
      upStallId = getAdjacentStallId(stall, navigableStalls, 'up');
    }

    // If at the bottom of the vertical column, find the row "below" (visually).
    if (!downStallId) {
      downStallId = getAdjacentStallId(stall, navigableStalls, 'down');
    }

    elements.modalNavUp.disabled = !upStallId;
    elements.modalNavUp.dataset.targetId = upStallId ?? '';
    elements.modalNavDown.disabled = !downStallId;
    elements.modalNavDown.dataset.targetId = downStallId ?? '';

    // Left and Right are never used for vertical rows.
    elements.modalNavLeft.disabled = true;
    elements.modalNavRight.disabled = true;

  } else {
    // Standard navigation for horizontal rows
    elements.modalNavLeft.style.display = 'block';
    elements.modalNavRight.style.display = 'block';
    elements.modalNavUp.style.display = 'block';
    elements.modalNavDown.style.display = 'block';
    elements.modalNavUp.ariaLabel = '往上一排';
    elements.modalNavDown.ariaLabel = '往下一排';

    const navIds = {
      up: getAdjacentStallId(stall, navigableStalls, 'up'),
      down: getAdjacentStallId(stall, navigableStalls, 'down'),
      left: getAdjacentStallId(stall, navigableStalls, 'left'),
      right: getAdjacentStallId(stall, navigableStalls, 'right'),
    };
    
    elements.modalNavUp.disabled = !navIds.up;
    elements.modalNavUp.dataset.targetId = navIds.up ?? '';
    elements.modalNavDown.disabled = !navIds.down;
    elements.modalNavDown.dataset.targetId = navIds.down ?? '';
    elements.modalNavLeft.disabled = !navIds.left;
    elements.modalNavLeft.dataset.targetId = navIds.left ?? '';
    elements.modalNavRight.disabled = !navIds.right;
    elements.modalNavRight.dataset.targetId = navIds.right ?? '';
  }
  
  // --- Update Vertical Stall List (for vertical rows) ---
  const { modalVerticalStallList } = elements;
  const testContainer = modalVerticalStallList.parentElement as HTMLElement | null;

  if (isVertical) {
    // Only reset scroll if we are opening a *different* vertical row.
    if (rowId !== previousRowId) {
      modalVerticalStallList.scrollTop = 0;
    }
    
    modalVerticalStallList.innerHTML = '';
    modalVerticalStallList.style.display = 'flex';
    if (testContainer) testContainer.style.paddingLeft = '';
  
    const stallsInRow = allStalls
      .filter(s => s.id.startsWith(rowId))
      .sort((a, b) => b.num - a.num); // Sort numerically descending
  
    const searchTerm = elements.searchInput.value.toLowerCase().trim();

    stallsInRow.forEach(s => {
      const itemEl = document.createElement('div');
      itemEl.className = 'modal-vertical-stall-item';
      itemEl.dataset.stallId = s.id;
      itemEl.textContent = s.num.toString().padStart(2,'0');
      
      if (s.promoData.length > 0) {
        itemEl.classList.add('has-promo');
      }

      let isMatch = false;
      if (searchTerm !== '') {
        const hasPromoUserMatch = s.promoData.some(promo =>
          promo.promoUser.toLowerCase().includes(searchTerm)
        );
        isMatch =
          s.id.toLowerCase().includes(searchTerm) ||
          s.stallTitle.toLowerCase().includes(searchTerm) ||
          hasPromoUserMatch;
      }
      if (isMatch) {
        itemEl.classList.add('is-search-match');
      }

      if (s.id === stallId) {
        itemEl.classList.add('is-selected');
      }
  
      modalVerticalStallList.appendChild(itemEl);
    });
    
    const selectedEl = modalVerticalStallList.querySelector('.is-selected') as HTMLElement;
    if (selectedEl) {
      // Defer scrollIntoView to the next animation frame. This ensures the browser
      // has rendered the modal and its contents, allowing the scroll to work correctly,
      // especially when the modal is first opened.
      requestAnimationFrame(() => {
        selectedEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  } else {
    modalVerticalStallList.innerHTML = '';
    modalVerticalStallList.style.display = 'none';
    // By restoring the default padding instead of setting it to '0', we prevent the container from collapsing.
    // The visual effect is correct because the list itself is hidden.
    if (testContainer) testContainer.style.paddingLeft = '';
  }

  // Show Modal
  document.body.classList.add('body-modal-open');
  elements.modal.classList.remove('hidden');
  elements.modalNavControls.style.display = 'grid';
  elements.modal.setAttribute('aria-hidden', 'true');

  updateModalMagnifierView(stall, elements, isMobile);
}

/**
 * Hides the modal and clears any selection.
 * @param context An object containing all necessary dependencies.
 */
export function closeModal(context: ModalContext) {
  const { elements, magnifierController, uiState } = context;

  document.body.classList.remove('body-modal-open');
  elements.modal.classList.add('hidden');
  elements.modalNavControls.style.display = 'none';
  elements.modal.setAttribute('aria-hidden', 'true');
  
  clearSelection(elements, magnifierController, uiState);

  if (magnifierController && modalState.wasMagnifierVisible) {
    magnifierController.show();
  }
  modalState.wasMagnifierVisible = false;
  elements.modalMagnifierWrapper.style.display = 'none';
  elements.modalVerticalStallList.style.display = 'none';
}

/**
 * Sets up all event listeners related to the modal.
 * @param context An object containing all necessary dependencies.
 */
export function initializeModalEventListeners(context: ModalContext) {
  const { elements, allStalls } = context;

  elements.modalNavControls.addEventListener('click', (e) => {
    const button = (e.target as HTMLElement).closest('.modal-nav-btn') as HTMLButtonElement;
    if (button?.dataset.targetId) {
      openModal(button.dataset.targetId, context);
    }
  });
  
  elements.modalVerticalStallList.addEventListener('click', (e) => {
    const item = (e.target as HTMLElement).closest('.modal-vertical-stall-item') as HTMLElement;
    if (item?.dataset.stallId) {
      openModal(item.dataset.stallId, context);
    }
  });

  elements.modalMagnifierWrapper.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const clickedGroupArea = target.closest('.stall-group-area') as HTMLElement | null;
    const clickedStallArea = target.closest('.stall-area:not(.stall-group-area)') as HTMLElement | null;
    const currentStallId = context.uiState.selectedStallElement?.dataset.stallId;

    if (clickedGroupArea?.dataset.rowId) {
      const rowId = clickedGroupArea.dataset.rowId;
      // Prevent reloading if the clicked row is already active.
      if (rowId === currentStallId?.substring(0, 1)) {
        return;
      }
      
      // Find the first stall in the row (top-most for vertical rows) and open its modal directly.
      const stallsInRow = allStalls
        .filter(s => s.id.startsWith(rowId))
        .sort((a, b) => b.num - a.num); // Sort by number descending.

      if (stallsInRow.length > 0) {
        openModal(stallsInRow[0].id, context);
      }
    } else if (clickedStallArea?.dataset.stallId) {
      const clickedStallId = clickedStallArea.dataset.stallId;
      if (clickedStallId === currentStallId) {
        return; // Do nothing if the same stall is clicked
      }
      openModal(clickedStallId, context);
    }
  });

  elements.modalClose.addEventListener('click', () => closeModal(context));
  elements.modalOverlay.addEventListener('click', () => closeModal(context));

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (elements.modal.classList.contains('hidden')) return;
    switch (e.key) {
      case 'Escape': closeModal(context); break;
      case 'ArrowUp': elements.modalNavUp.click(); break;
      case 'ArrowDown': elements.modalNavDown.click(); break;
      case 'ArrowLeft': elements.modalNavLeft.click(); break;
      case 'ArrowRight': elements.modalNavRight.click(); break;
    }
  });

  // Custom tooltip for nav controls
  const { modalNavControls, tooltip } = elements;
  modalNavControls.addEventListener('mouseover', (e) => {
    const button = (e.target as HTMLElement).closest('.modal-nav-btn');

    if (button instanceof HTMLButtonElement && !button.disabled) {
      const label = button.ariaLabel;
      if (label) {
        tooltip.innerHTML = label;
        const btnRect = button.getBoundingClientRect();
        
        // Make the tooltip visible to correctly calculate its dimensions for centering.
        // This all happens in one execution thread, so it won't cause a visual flicker.
        tooltip.classList.remove('hidden');
        const tooltipRect = tooltip.getBoundingClientRect();
        
        // Position it centered above the button.
        const top = btnRect.top - tooltipRect.height - 8; // 8px gap.
        const left = btnRect.left + (btnRect.width / 2) - (tooltipRect.width / 2);

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
      }
    } else {
      // If the mouse is over the container but not a button (i.e., in a gap), hide the tooltip.
      tooltip.classList.add('hidden');
    }
  });

  modalNavControls.addEventListener('mouseleave', () => {
    tooltip.classList.add('hidden');
  });
}