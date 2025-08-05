import * as d3 from "d3";

// Defines stable, explicit color mapping for collections.
const collectionColorMap = {
  BMC: "#e6194B",       // Red
  CHEBI: "#3cb44b",     // Moderate lime green
  CHEMBL: "#ffe119",    // Canary
  CL: "#4363d8",        // Tory Blue
  CS: "#f58231",        // Orange
  CSD: "#ffd8b1",       // Light Orange
  GO: "#911eb4",        // Strong magenta
  GS: "#f032e6",        // Magenta
  HsapDv: "#fabed4",    // Pink
  MmusDv: "#dcbeff",    // Pale violet
  MONDO: "#800000",     // Maroon
  NCBITaxon: "#a9a9a9", // Dark Gray
  NCT: "#9A6324",       // Brown
  Orphanet: "#fffac8",  // Cornsilk
  PATO: "#42d4f4",      // Aqua
  PR: "#aaffc3",        // Magic Mint
  PUB: "#808000",       // Olive
  RS: "#000075",        // Navy Blue
  SO: "#000000",        // Black
  UBERON: "#469990",    // Persian Green
};

// Extract domain (collection IDs) and range (colors) for D3.
const domain = Object.keys(collectionColorMap);
const range = Object.values(collectionColorMap);

// Defines D3 ordinal color scale, useful for legends or charts.
export const colorScale = d3.scaleOrdinal(domain, range);

// Default color for unknown or unmapped collections.
const defaultColor = "#cccccc"; // Grey

/**
 * Gets stable color for specific collection ID.
 * @param {string} collectionId - The ID of the collection (e.g., "BMC").
 * @returns {string} The assigned hex color code or default color.
 */
export const getColorForCollection = (collectionId) => {
  // Return mapped color if ID exists in map, otherwise use default.
  return collectionColorMap[collectionId] || defaultColor;
};