/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { criticalElementIds } from './dom-elements.ts';

/**
 * Polls the DOM until all critical elements are available, then runs the app.
 * This is a robust way to start the app, especially when a framework might be
 * manipulating the DOM after the initial load.
 * @param runFn The main application function to execute once the DOM is ready.
 */
export function initializeApp(runFn: () => void) {
  const allElementsPresent = () => {
    return criticalElementIds.every((id) => document.getElementById(id));
  };

  const attemptRun = () => {
    if (allElementsPresent()) {
      runFn();
    } else {
      // Use requestAnimationFrame for smoother, more efficient polling.
      requestAnimationFrame(attemptRun);
    }
  };

  attemptRun();
}
