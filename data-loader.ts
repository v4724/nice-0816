/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- Configuration ---
// IMPORTANT: Replace this with your Google Sheet's "Publish to web" CSV URL.
// In Google Sheets: File > Share > Publish to web > Select a sheet & "Comma-separated values (.csv)" > Publish.
const GOOGLE_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSekTVRYingSPdcpjSzVazPOJRJr_SxAyQV1lvqvgzvoW6BtnP8aEoVOo1sZSF6tJ27tLXv7JvxCPP9/pub?output=csv&gid=0&single=true';

/**
 * A robust CSV parser that handles quoted fields, double quotes inside fields,
 * and empty fields correctly. It skips the first line, assuming it's a description,
 * and uses the second line as headers.
 * @param csvText The raw CSV string.
 * @returns An array of objects, where keys are headers.
 */
function parseCsv(csvText: string): Record<string, string>[] {
  // Standardize line endings and split into lines.
  const lines = csvText.trim().replace(/\r\n/g, '\n').split('\n');

  // Need at least 2 lines: one for description (skipped) and one for headers.
  if (lines.length < 2) {
    return [];
  }

  /**
   * Parses a single line of CSV, respecting quotes.
   * @param line The string for a single CSV row.
   * @returns An array of string values for that row.
   */
  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let currentVal = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        // If we see a quote, and the next character is also a quote (""),
        // it's an escaped quote, so add a single " to the value and skip the next character.
        if (inQuotes && line[i + 1] === '"') {
          currentVal += '"';
          i++; // Skip the second quote of the pair.
        } else {
          // Otherwise, it's a quote that starts or ends a quoted field.
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // If it's a comma and we're not inside a quoted field, it's a field separator.
        values.push(currentVal);
        currentVal = ''; // Reset for the next value.
      } else {
        // Any other character is part of the current value.
        currentVal += char;
      }
    }
    // Add the final value after the loop finishes.
    values.push(currentVal);
    return values;
  };

  // The first line is a description, so we skip it.
  // The second line (index 1) contains the headers.
  const headers = parseLine(lines[1]).map((h) => h.trim());
  const results: Record<string, string>[] = [];

  // Process the rest of the lines (starting from the third line, index 2) as data rows.
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue; // Skip empty lines in the sheet.

    const values = parseLine(line);
    const obj: Record<string, string> = {};
    let hasContent = false;

    headers.forEach((header, index) => {
      const value = values[index] || ''; // Default to empty string if a value is missing.
      obj[header] = value;
      if (value.trim() !== '') hasContent = true; // Track if the row has any data at all.
    });

    // Only add the row to results if it's not completely empty.
    if (hasContent) {
      results.push(obj);
    }
  }

  return results;
}

/**
 * Fetches stall data from a published Google Sheet CSV. It first tries to fetch
 * with a cache-busting timestamp to get the latest data. If that fails (e.g., with a
 * 500 server error), it falls back to fetching without the timestamp for reliability.
 * @returns A promise that resolves to an array of stall objects.
 */
export async function fetchStallData(): Promise<Record<string, string>[]> {
  const urlWithTimestamp = `${GOOGLE_SHEET_CSV_URL}&_=${Date.now()}`;

  // --- First Attempt: With Cache-Busting Timestamp ---
  try {
    const response = await fetch(urlWithTimestamp);
    if (response.ok) {
      const csvText = await response.text();
      return parseCsv(csvText);
    }
    // Log non-critical server errors and proceed to fallback.
    console.warn(
      `Initial fetch with timestamp failed with status: ${response.status}. Retrying without timestamp.`
    );
  } catch (error) {
    // Catches network errors (e.g., DNS, CORS).
    console.warn(
      'Initial fetch with timestamp failed with a network error. Retrying without timestamp.',
      error
    );
  }

  // --- Second Attempt (Fallback): Without Timestamp ---
  console.log('Attempting fallback fetch without cache-busting timestamp.');
  try {
    const fallbackResponse = await fetch(GOOGLE_SHEET_CSV_URL);
    if (!fallbackResponse.ok) {
      // If the fallback also fails, this is a critical error.
      throw new Error(
        `Fallback fetch failed: ${fallbackResponse.status} ${fallbackResponse.statusText}`
      );
    }
    const csvText = await fallbackResponse.text();
    return parseCsv(csvText);
  } catch (error) {
    // If both attempts fail, log the final error and return empty.
    console.error(
      'Error fetching or parsing stall data after fallback:',
      error
    );
    return [];
  }
}
