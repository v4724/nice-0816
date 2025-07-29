
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { StallData } from './types.ts';
import type { DOMElements } from './dom-elements.ts';
import type { MagnifierController } from './magnifier.ts';
import { allRowIds, getAdjacentStallId, getNavigableStalls } from './navigation.ts';
import { locateStalls } from './official-data.ts';
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
  // Panning state for all devices
  isPanning: false,
  panStartX: 0,
  panStartY: 0,
  initialBgX: 0,
  initialBgY: 0,
  panHappened: false,
  clickTarget: null as EventTarget | null,
  // State for smooth panning with requestAnimationFrame
  animationFrameId: 0,
  targetBgX: 0,
  targetBgY: 0,
};

/**
 * Opens a lightbox to display an enlarged version of an image.
 * @param src The source URL of the image to display.
 * @param alt The alternative text for the image.
 * @param elements A reference to all DOM elements.
 */
function openImageLightbox(src: string, alt: string, elements: DOMElements) {
    if (src) {
        elements.imageLightboxImage.src = src;
        elements.imageLightboxImage.alt = alt;
        elements.imageLightbox.classList.remove('hidden');
        // The main modal is already open, so `body-modal-open` class is already on the body.
    }
}

/**
 * Closes the image lightbox.
 * @param elements A reference to all DOM elements.
 */
function closeImageLightbox(elements: DOMElements) {
    elements.imageLightbox.classList.add('hidden');
    elements.imageLightboxImage.src = ''; // Clear src to stop loading and free memory.
}


/**
 * Updates the modal's row indicator. It prioritizes using the explicit `stall`
 * for accuracy when selecting, and falls back to a geometric calculation based
 * on the view's center when panning. It also hides the indicator for the '範' stall.
 * @param context The application context.
 * @param currentBgX The current horizontal background position of the map.
 * @param currentBgY The current vertical background position of the map.
 * @param stall The currently selected stall, if any.
 */
function updateModalRowIndicator(context: ModalContext, currentBgX: number, currentBgY: number, stall?: StallData) {
    const { elements, isMobile } = context;
    const { modalMagnifier, mapImage, modalMagnifierRowIndicatorContainer } = elements;
    const { modalMagnifierRowIndicatorPrev, modalMagnifierRowIndicatorCurrent, modalMagnifierRowIndicatorNext } = elements;

    modalMagnifierRowIndicatorContainer.style.display = 'flex';

    let closestRowData: (typeof locateStalls[0]) | null = null;

    if (stall) {
      // Priority 1: Use the provided stall's data for 100% accuracy.
      const rowId = stall.id.substring(0, 1);
      closestRowData = locateStalls.find(r => r.id === rowId) ?? null;
    } else {
      // Priority 2 (Fallback for panning): Use geometric calculation based on view center.
      const zoomFactor = isMobile ? 4.5 : 1.8;
      const viewW = modalMagnifier.offsetWidth;
      const viewH = modalMagnifier.offsetHeight;
      const mapW = mapImage.offsetWidth;
      const mapH = mapImage.offsetHeight;
      
      if (mapW === 0 || mapH === 0) return;
      
      // Calculate what point on the original map is now at the center of the view.
      const mapPointAtViewCenterX = (viewW / 2 - currentBgX) / zoomFactor;
      const mapPointAtViewCenterY = (viewH / 2 - currentBgY) / zoomFactor;

      const lensCenterX_pct = (mapPointAtViewCenterX / mapW) * 100;
      const lensCenterY_pct = (mapPointAtViewCenterY / mapH) * 100;
      
      let minDistanceSq = Infinity;

      for (const row of locateStalls) {
          const dx = Math.max(row.border.left - lensCenterX_pct, 0, lensCenterX_pct - row.border.right);
          const dy = Math.max(row.border.top - lensCenterY_pct, 0, lensCenterY_pct - row.border.bottom);
          const distanceSq = dx * dx + dy * dy;

          if (distanceSq < minDistanceSq) {
              minDistanceSq = distanceSq;
              closestRowData = row;
          }
      }
    }
    
	if (closestRowData && closestRowData.id === '範') {
		modalMagnifierRowIndicatorCurrent.textContent = '';
		modalMagnifierRowIndicatorPrev.textContent = '';
		modalMagnifierRowIndicatorNext.textContent = '';
	} else {
		modalMagnifierRowIndicatorContainer.style.display = 'flex';
		if (closestRowData) {
			const currentIndex = allRowIds.indexOf(closestRowData.id);
			modalMagnifierRowIndicatorCurrent.textContent = closestRowData.id;
			modalMagnifierRowIndicatorPrev.textContent = currentIndex > 0 ? allRowIds[currentIndex - 1] : '';
			modalMagnifierRowIndicatorNext.textContent = currentIndex < allRowIds.length - 1 ? allRowIds[currentIndex + 1] : '';
		} else {
			modalMagnifierRowIndicatorCurrent.textContent = '';
			modalMagnifierRowIndicatorPrev.textContent = '';
			modalMagnifierRowIndicatorNext.textContent = '';
		}
	}
}

/**
 * Sets the position of the mini-map view, clamps it within bounds, culls off-screen elements,
 * and updates the row indicator. It now returns the final clamped background positions.
 * @param context The application context.
 * @param bgX The target horizontal background position.
 * @param bgY The target vertical background position.
 * @param stall The stall being centered on, if any, to ensure accurate row indicator display.
 * @returns An object with the final, clamped background coordinates.
 */
function setModalMapPosition(context: ModalContext, bgX: number, bgY: number, stall?: StallData): { clampedBgX: number, clampedBgY: number } {
    const { elements, isMobile, allStalls, uiState } = context;
    const { modalMagnifier, modalMagnifierStallLayer, mapImage } = elements;

    const zoomFactor = isMobile ? 4.5 : 1.8;
    const viewW = modalMagnifier.offsetWidth;
    const viewH = modalMagnifier.offsetHeight;

    if (viewW === 0 || viewH === 0) return { clampedBgX: 0, clampedBgY: 0 };

    const mapW = mapImage.offsetWidth;
    const mapH = mapImage.offsetHeight;
    if (mapW === 0 || mapH === 0) return { clampedBgX: 0, clampedBgY: 0 };

    const scaledMapW = mapW * zoomFactor;
    const scaledMapH = mapH * zoomFactor;
    
    const clampedBgX = Math.max(viewW - scaledMapW, Math.min(bgX, 0));
    const clampedBgY = Math.max(viewH - scaledMapH, Math.min(bgY, 0));

    // PERFORMANCE: Use `transform` for movement instead of `left`/`top`.
    modalMagnifier.style.backgroundPosition = `${clampedBgX}px ${clampedBgY}px`;
    modalMagnifierStallLayer.style.transform = `translate(${clampedBgX}px, ${clampedBgY}px) scale(${zoomFactor})`;

    // --- Viewport Culling for Performance ---
    const bufferX = (viewW / zoomFactor) * 0.5;
    const bufferY = (viewH / zoomFactor) * 0.5;
    const visibleLeft = (-clampedBgX / zoomFactor) - bufferX;
    const visibleTop = (-clampedBgY / zoomFactor) - bufferY;
    const visibleRight = ((-clampedBgX + viewW) / zoomFactor) + bufferX;
    const visibleBottom = ((-clampedBgY + viewH) / zoomFactor) + bufferY;

    allStalls.forEach(s => {
        const clone = uiState.stallIdToModalCloneMap.get(s.id);
        if (!clone || !s.numericCoords) return;

        const { left, top, width, height } = s.numericCoords;
        const stallLeft_px = (left / 100) * mapW;
        const stallTop_px = (top / 100) * mapH;
        const stallRight_px = stallLeft_px + ((width / 100) * mapW);
        const stallBottom_px = stallTop_px + ((height / 100) * mapH);

        const isVisible =
            stallLeft_px < visibleRight &&
            stallRight_px > visibleLeft &&
            stallTop_px < visibleBottom &&
            stallBottom_px > visibleTop;
        
        clone.classList.toggle('modal-map-hidden', !isVisible);
    });

    locateStalls.forEach(row => {
        const clone = uiState.rowIdToModalGroupCloneMap.get(row.id);
        if (!clone) return;

        const rowLeft_px = (row.border.left / 100) * mapW;
        const rowTop_px = (row.border.top / 100) * mapH;
        const rowRight_px = (row.border.right / 100) * mapW;
        const rowBottom_px = (row.border.bottom / 100) * mapH;

        const isVisible =
            rowLeft_px < visibleRight &&
            rowRight_px > visibleLeft &&
            rowTop_px < visibleBottom &&
            rowBottom_px > visibleTop;
        
        clone.classList.toggle('modal-map-hidden', !isVisible);
    });
    
    updateModalRowIndicator(context, clampedBgX, clampedBgY, stall);

    return { clampedBgX, clampedBgY };
}


/**
 * Updates the integrated mini-map view inside the modal to center on a stall.
 * This function now provides a smooth transition when switching between stalls.
 * @param stall The stall to display and highlight.
 * @param context The application context.
 */
function updateModalMagnifierView(stall: StallData, context: ModalContext) {
  const { elements, isMobile } = context;
  const { modalMagnifierWrapper, modalMagnifier, modalMagnifierStallLayer, mapImage } = elements;
  
  if (!stall || !stall.coords) {
    modalMagnifierWrapper.style.display = 'none';
    return;
  }

  modalMagnifierWrapper.style.display = 'block';
  modalMagnifierWrapper.style.cursor = 'grab';

  const zoomFactor = isMobile ? 4.5 : 1.8;
  const viewW = modalMagnifier.offsetWidth;
  const viewH = modalMagnifier.offsetHeight;

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
  modalMagnifier.style.backgroundSize = `${scaledMapW}px ${scaledMapH}px`;
  modalMagnifier.style.backgroundImage = `url('${mapImage.src}')`;

  const { left, top, width, height } = stall.numericCoords;
  if ([left, top, width, height].some(v => typeof v !== 'number')) {
    console.error("Could not parse stall coordinates for modal magnifier:", stall.coords);
    modalMagnifierWrapper.style.display = 'none';
    return;
  }
  
  // Calculate the ideal background position to center the stall.
  const stallCenterX_px = (left + width / 2) / 100 * mapW;
  const stallCenterY_px = (top + height / 2) / 100 * mapH;
  const bgX = (viewW / 2) - (stallCenterX_px * zoomFactor);
  const bgY = (viewH / 2) - (stallCenterY_px * zoomFactor);

  setModalMapPosition(context, bgX, bgY, stall);
  
  // Update the highlight element's position. It's inside the stall layer now.
  let highlightEl = modalMagnifierStallLayer.querySelector('.modal-stall-highlight') as HTMLElement | null;
  if (!highlightEl) {
    highlightEl = document.createElement('div');
    highlightEl.className = 'modal-stall-highlight';
    modalMagnifierStallLayer.appendChild(highlightEl);
  }
  
  // Use the percentage-based coordinates directly from the stall data for smooth CSS transition.
  highlightEl.style.width = stall.coords.width;
  highlightEl.style.height = stall.coords.height;
  highlightEl.style.left = stall.coords.left;
  highlightEl.style.top = stall.coords.top;
  highlightEl.style.visibility = 'visible';
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
    
    let tagsHTML = '';
    if (promo.promoTags && promo.promoTags.length > 0) {
        tagsHTML += '<div class="promo-tags-container">';
        promo.promoTags.forEach(tag => {
            tagsHTML += `<span class="promo-tag">#${tag}</span>`;
        });
        tagsHTML += '</div>';
    }

    bodyHTML += `
      <div class="promo-entry">
          <div class="modal-user-info">
              <img src="${avatar}" alt="${promo.promoUser}" class="modal-avatar">
              <span class="modal-username">${promo.promoUser}</span>
          </div>
          <div class="promo-html-content">${promo.promoHTML}</div>
		  
          ${tagsHTML}
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

  if (isVertical) {
    // Only reset scroll if we are opening a *different* vertical row.
    if (rowId !== previousRowId) {
      modalVerticalStallList.scrollTop = 0;
    }
    
    modalVerticalStallList.innerHTML = '';
    modalVerticalStallList.style.display = 'flex';
  
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
        const hasTagMatch = s.promoTags.some(tag =>
          tag.toLowerCase().includes(searchTerm)
        );
        isMatch =
          s.id.toLowerCase().includes(searchTerm) ||
          s.stallTitle.toLowerCase().includes(searchTerm) ||
          hasPromoUserMatch ||
          hasTagMatch;
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
  }

  // Show Modal
  document.body.classList.add('body-modal-open');
  elements.modal.classList.remove('hidden');
  elements.modalNavControls.style.display = 'grid';
  elements.modal.setAttribute('aria-hidden', 'true');

  updateModalMagnifierView(stall, context);
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
 * Handles a click/tap event inside the modal mini-map.
 * @param target The event target.
 * @param context The application context.
 */
function handleModalMapClick(target: HTMLElement, context: ModalContext) {
  const { allStalls, uiState } = context;
  const clickedGroupArea = target.closest('.stall-group-area') as HTMLElement | null;
  const clickedStallArea = target.closest('.stall-area:not(.stall-group-area)') as HTMLElement | null;
  const currentStallId = uiState.selectedStallElement?.dataset.stallId;

  if (clickedGroupArea?.dataset.rowId) {
    const rowId = clickedGroupArea.dataset.rowId;
    if (rowId === currentStallId?.substring(0, 1)) {
      return; // Prevent reloading if the clicked row is already active.
    }
    const stallsInRow = allStalls.filter(s => s.id.startsWith(rowId)).sort((a, b) => b.num - a.num);
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
}

/**
 * Sets up all event listeners related to the modal.
 * @param context An object containing all necessary dependencies.
 */
export function initializeModalEventListeners(context: ModalContext) {
  const { elements } = context;

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

  // --- Mini-Map Interaction: Unified Pan and Click for All Devices ---
  const { modalMagnifierWrapper, modalMagnifier, modalMagnifierStallLayer } = elements;

  const panAnimationLoop = () => {
    if (!modalState.isPanning) return;
    setModalMapPosition(context, modalState.targetBgX, modalState.targetBgY);
    modalState.animationFrameId = requestAnimationFrame(panAnimationLoop);
  };

  const onPanMove = (e: MouseEvent | TouchEvent) => {
    if (!modalState.isPanning) return;
    if (e.type === 'touchmove') e.preventDefault();
    
    const touch = (e as TouchEvent).touches?.[0];
    const clientX = touch ? touch.clientX : (e as MouseEvent).clientX;
    const clientY = touch ? touch.clientY : (e as MouseEvent).clientY;

    const dx = clientX - modalState.panStartX;
    const dy = clientY - modalState.panStartY;

    if (!modalState.panHappened && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        modalState.panHappened = true;
        modalMagnifierWrapper.style.cursor = 'grabbing';
    }

    if (modalState.panHappened) {
      modalState.targetBgX = modalState.initialBgX + dx;
      modalState.targetBgY = modalState.initialBgY + dy;
    }
  };

  const onPanEnd = () => {
    cancelAnimationFrame(modalState.animationFrameId);
    document.removeEventListener('mousemove', onPanMove);
    document.removeEventListener('touchmove', onPanMove);
    document.removeEventListener('mouseup', onPanEnd);
    document.removeEventListener('touchend', onPanEnd);

    if (!modalState.panHappened && modalState.clickTarget) {
      handleModalMapClick(modalState.clickTarget as HTMLElement, context);
    }

    modalState.isPanning = false;
    modalState.clickTarget = null;
    modalMagnifierWrapper.style.cursor = 'grab';
    
    // Restore transitions for smooth centering next time a stall is selected
    modalMagnifier.style.transition = '';
    modalMagnifierStallLayer.style.transition = '';
  };

  const onPanStart = (e: MouseEvent | TouchEvent) => {
    const target = e.target as HTMLElement;
    // Prevent pan from starting if the click is on the vertical stall list.
    if (target.closest('#modal-vertical-stall-list')) {
        return;
    }

    // NEW Check: Prevent pan if clicking the currently active group area.
    const clickedGroupArea = target.closest('.stall-group-area') as HTMLElement | null;
    const currentStallId = context.uiState.selectedStallElement?.dataset.stallId;
    if (clickedGroupArea && currentStallId) {
      const clickedRowId = clickedGroupArea.dataset.rowId;
      const currentRowId = currentStallId.substring(0, 1);
      if (clickedRowId === currentRowId) {
        return; // Don't start a pan/drag if clicking the already-active group area.
      }
    }
    
    // Prevent starting a pan with the right mouse button
    if ('button' in e && e.button !== 0) return;
    
    modalState.isPanning = true;
    modalState.panHappened = false;
    modalState.clickTarget = e.target;
    
    const touch = (e as TouchEvent).touches?.[0];
    const clientX = touch ? touch.clientX : (e as MouseEvent).clientX;
    const clientY = touch ? touch.clientY : (e as MouseEvent).clientY;

    modalState.panStartX = clientX;
    modalState.panStartY = clientY;

    // Get initial position from the transform property
    const transformMatrix = new DOMMatrix(window.getComputedStyle(modalMagnifierStallLayer).transform);
    modalState.initialBgX = transformMatrix.e;
    modalState.initialBgY = transformMatrix.f;
    modalState.targetBgX = modalState.initialBgX;
    modalState.targetBgY = modalState.initialBgY;

    // Disable transitions during panning for direct control
    modalMagnifier.style.transition = 'none';
    modalMagnifierStallLayer.style.transition = 'none';

    const highlight = modalMagnifierStallLayer.querySelector('.modal-stall-highlight');
    if (highlight) (highlight as HTMLElement).style.visibility = 'hidden';

    cancelAnimationFrame(modalState.animationFrameId);
    modalState.animationFrameId = requestAnimationFrame(panAnimationLoop);

    document.addEventListener('mousemove', onPanMove);
    document.addEventListener('touchmove', onPanMove, { passive: false });
    document.addEventListener('mouseup', onPanEnd, { once: true });
    document.addEventListener('touchend', onPanEnd, { once: true });
  };

  modalMagnifierWrapper.addEventListener('mousedown', onPanStart);
  modalMagnifierWrapper.addEventListener('touchstart', onPanStart, { passive: false });
  // --- End of Mini-Map Interaction ---

  // --- Image Lightbox Listeners ---
  const boundCloseImageLightbox = () => closeImageLightbox(elements);

  elements.modalBody.addEventListener('click', e => {
    const target = e.target;
    // Check if the clicked element is an image within the designated areas.
    if (target instanceof HTMLImageElement) {
      let src = '';
      if (target.classList.contains('official-stall-image')) {
        src = target.src;
      } else if (target.closest('.promo-html-content')) {
        if (target.parentElement instanceof HTMLAnchorElement) {
          src = target.alt;

          e.stopPropagation();
          e.preventDefault();
        }
      }

      openImageLightbox(src, target.alt, elements);
    } 
  });

  elements.imageLightboxClose.addEventListener('click', boundCloseImageLightbox);
  // Also close by clicking the overlay background
  elements.imageLightbox.addEventListener('click', e => {
      if (e.target === elements.imageLightbox || e.target === elements.imageLightbox.querySelector('.lightbox-overlay')) {
          boundCloseImageLightbox();
      }
  });

  // --- Global Listeners ---
  elements.modalClose.addEventListener('click', () => closeModal(context));
  elements.modalOverlay.addEventListener('click', () => closeModal(context));

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    // Highest priority: Image lightbox
    if (!elements.imageLightbox.classList.contains('hidden')) {
      if (e.key === 'Escape') {
        boundCloseImageLightbox();
      }
      return; // Stop further key processing
    }

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