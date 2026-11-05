/**
 * Pure Domain Parser & Line Merger for Barcode / QR Cargo Intake
 * Zero DOM dependencies so it runs identically in browser & Node.js unit tests.
 */

export interface DraftDispatchLine {
  sku: string;
  itemName: string;
  unit: string;
  unitPrice: number;
  quantitySent: number;
  notes?: string;
}

export interface ParsedIntakeItem {
  sku: string;
  itemName: string;
  unit: string;
  unitPrice: number;
  quantitySent: number;
  notes?: string;
  matchedFromCatalog: boolean;
}

export interface ParsedBarcodeResult {
  ok: boolean;
  items: ParsedIntakeItem[];
  rawCode: string;
  format: string;
  error?: string;
}

export interface BarcodeCatalogEntry {
  sku: string;
  ean13?: string;
  itemName: string;
  unit: string;
  unitPrice: number;
}

export const BARCODE_CATALOG: BarcodeCatalogEntry[] = [
  {
    sku: 'SKU-GLS-101',
    ean13: '8901012001014',
    itemName: 'Premium Olive Oil 750ml (Box of 6 glass bottles)',
    unit: 'boxes',
    unitPrice: 54.0,
  },
  {
    sku: 'SKU-SPA-303',
    ean13: '8901012003032',
    itemName: 'Artisan Bronze-Die Pasta 500g (Pack of 20)',
    unit: 'cartons',
    unitPrice: 32.0,
  },
  {
    sku: 'SKU-DAI-201',
    ean13: '8901012002011',
    itemName: 'Grade-A Organic Whole Milk 1-Gallon (Crate of 4)',
    unit: 'cases',
    unitPrice: 28.5,
  },
  {
    sku: 'SKU-DRY-042',
    ean13: '8901012000420',
    itemName: 'Fair-Trade Rolled Oats 25kg Bulk Bag',
    unit: 'sacks',
    unitPrice: 42.0,
  },
  {
    sku: 'SKU-COLD-501',
    ean13: '8901012005012',
    itemName: 'Insulated Thermal Pallet Blankets (Reusable)',
    unit: 'units',
    unitPrice: 85.0,
  },
  {
    sku: 'SKU-SEC-602',
    ean13: '8901012006026',
    itemName: 'Tamper-Evident High-Security Bolt Seals (Pack of 50)',
    unit: 'boxes',
    unitPrice: 45.0,
  },
  {
    sku: 'SKU-PKG-703',
    ean13: '8901012007030',
    itemName: 'Heavy-Duty Stretch Wrap Film 80 Gauge (Case of 4 Rolls)',
    unit: 'cases',
    unitPrice: 62.0,
  },
  {
    sku: 'SKU-BEV-108',
    ean13: '8901012001083',
    itemName: 'Ethiopian Yirgacheffe & Sidama Roasted Coffee Beans (20kg)',
    unit: 'bags',
    unitPrice: 118.0,
  },
];

const SUPPORTED_UNITS = new Set([
  'cases',
  'boxes',
  'cartons',
  'bags',
  'units',
  'kg',
  'pallets',
  'sacks',
]);

export function normalizeIntakeUnit(rawUnit?: string): string {
  if (!rawUnit) return 'cases';
  const cleaned = rawUnit.trim().toLowerCase();
  if (SUPPORTED_UNITS.has(cleaned)) return cleaned;
  if (cleaned === 'case' || cleaned === 'cs') return 'cases';
  if (cleaned === 'box' || cleaned === 'bx') return 'boxes';
  if (cleaned === 'carton' || cleaned === 'ctn') return 'cartons';
  if (cleaned === 'bag') return 'bags';
  if (cleaned === 'unit' || cleaned === 'pcs' || cleaned === 'pc' || cleaned === 'ea') return 'units';
  if (cleaned === 'kilogram' || cleaned === 'kilograms' || cleaned === 'kgs') return 'kg';
  if (cleaned === 'pallet' || cleaned === 'plt') return 'pallets';
  if (cleaned === 'sack') return 'sacks';
  return 'cases';
}

export function lookupCatalogByCode(code: string): BarcodeCatalogEntry | undefined {
  const normalized = code.trim().toUpperCase();
  return BARCODE_CATALOG.find(
    (entry) =>
      entry.sku.toUpperCase() === normalized ||
      (entry.ean13 && entry.ean13.toUpperCase() === normalized)
  );
}

function roundQty(val: number): number {
  return Math.round(val * 1000) / 1000;
}

function toParsedIntakeItem(rawObj: Record<string, any>): ParsedIntakeItem | null {
  const rawSku = String(rawObj.sku || rawObj.code || rawObj.id || '').trim().toUpperCase();
  const catalogMatch = rawSku ? lookupCatalogByCode(rawSku) : undefined;

  const sku = catalogMatch?.sku || rawSku || `SKU-${Date.now().toString().slice(-4)}`;
  const rawName = String(rawObj.itemName || rawObj.name || rawObj.description || '').trim();
  const itemName = rawName || catalogMatch?.itemName || `Scanned Item (${sku})`;

  const rawQty = rawObj.quantitySent ?? rawObj.quantity ?? rawObj.qty ?? 1;
  const parsedQty = typeof rawQty === 'number' ? rawQty : parseFloat(String(rawQty));
  if (isNaN(parsedQty) || parsedQty <= 0) {
    return null;
  }

  const rawPrice = rawObj.unitPrice ?? rawObj.price ?? catalogMatch?.unitPrice ?? 0;
  const parsedPrice = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice));

  const unit = normalizeIntakeUnit(
    rawObj.unit ? String(rawObj.unit) : catalogMatch?.unit
  );

  return {
    sku,
    itemName,
    unit,
    unitPrice: isNaN(parsedPrice) || parsedPrice < 0 ? 0 : parsedPrice,
    quantitySent: roundQty(parsedQty),
    notes: rawObj.notes ? String(rawObj.notes).trim() : undefined,
    matchedFromCatalog: Boolean(catalogMatch),
  };
}

/**
 * Parses raw barcode or QR code strings into structured dispatch line items.
 * Supports:
 * 1. JSON objects or arrays / { items: [...] }
 * 2. URL or custom scheme query strings (e.g., ?sku=...&name=...&unit=...&qty=...)
 * 3. Pipe / semicolon delimited warehouse labels (SKU|Name|Unit|Qty|Price)
 * 4. Plain SKU or 1D EAN-13/UPC-A/Code-128 barcodes
 */
export function parseIntakeBarcode(
  rawInput: string,
  detectedFormat: string = 'BARCODE'
): ParsedBarcodeResult {
  const rawCode = (rawInput || '').trim();
  if (!rawCode) {
    return {
      ok: false,
      items: [],
      rawCode: '',
      format: detectedFormat,
      error: 'Empty barcode or QR payload.',
    };
  }

  // 1. JSON QR payload
  if (rawCode.startsWith('{') || rawCode.startsWith('[')) {
    try {
      const parsed = JSON.parse(rawCode);
      const rawList = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.items)
        ? parsed.items
        : [parsed];

      const items: ParsedIntakeItem[] = [];
      for (const entry of rawList) {
        if (entry && typeof entry === 'object') {
          const item = toParsedIntakeItem(entry);
          if (item) items.push(item);
        }
      }

      if (items.length === 0) {
        return {
          ok: false,
          items: [],
          rawCode,
          format: 'QR_JSON',
          error: 'JSON QR payload did not contain any valid positive-quantity items.',
        };
      }

      return {
        ok: true,
        items,
        rawCode,
        format: 'QR_JSON',
      };
    } catch {
      return {
        ok: false,
        items: [],
        rawCode,
        format: 'QR_JSON',
        error: 'Malformed JSON QR barcode payload.',
      };
    }
  }

  // 2. URL or URI scheme with query parameters
  if (rawCode.includes('?') && (rawCode.includes('sku=') || rawCode.includes('name=') || rawCode.includes('code='))) {
    try {
      const queryPart = rawCode.split('?')[1];
      const params = new URLSearchParams(queryPart);
      const item = toParsedIntakeItem({
        sku: params.get('sku') || params.get('code') || '',
        itemName: params.get('itemName') || params.get('name') || params.get('desc') || '',
        unit: params.get('unit') || '',
        quantity: params.get('qty') || params.get('quantity') || '1',
        unitPrice: params.get('price') || params.get('unitPrice') || undefined,
      });

      if (!item) {
        return {
          ok: false,
          items: [],
          rawCode,
          format: 'QR_URL',
          error: 'Invalid quantity in QR URL payload.',
        };
      }

      return {
        ok: true,
        items: [item],
        rawCode,
        format: 'QR_URL',
      };
    } catch {
      // fall through
    }
  }

  // 3. Pipe or semicolon delimited warehouse label: SKU|ItemName|Unit|Qty|Price
  if (rawCode.includes('|') || rawCode.includes(';')) {
    const delimiter = rawCode.includes('|') ? '|' : ';';
    const parts = rawCode.split(delimiter).map((p) => p.trim());
    if (parts.length >= 2 && parts[0]) {
      const item = toParsedIntakeItem({
        sku: parts[0],
        itemName: parts[1],
        unit: parts[2] || undefined,
        quantity: parts[3] ? parseFloat(parts[3]) : 1,
        unitPrice: parts[4] ? parseFloat(parts[4]) : undefined,
      });

      if (!item) {
        return {
          ok: false,
          items: [],
          rawCode,
          format: 'DELIMITED_LABEL',
          error: 'Delimited barcode label contains invalid quantity.',
        };
      }

      return {
        ok: true,
        items: [item],
        rawCode,
        format: 'DELIMITED_LABEL',
      };
    }
  }

  // 4. Plain 1D Barcode (EAN-13, UPC-A, Code-128, SKU)
  const catalogEntry = lookupCatalogByCode(rawCode);
  if (catalogEntry) {
    return {
      ok: true,
      items: [
        {
          sku: catalogEntry.sku,
          itemName: catalogEntry.itemName,
          unit: catalogEntry.unit,
          unitPrice: catalogEntry.unitPrice,
          quantitySent: 1,
          matchedFromCatalog: true,
        },
      ],
      rawCode,
      format: detectedFormat === 'BARCODE' && catalogEntry.ean13 === rawCode ? 'EAN_13' : detectedFormat,
    };
  }

  // Generic 1D barcode not in pre-seeded catalog -> creates structured line ready for manifest
  const cleanSku = rawCode.replace(/\s+/g, '-').toUpperCase();
  return {
    ok: true,
    items: [
      {
        sku: cleanSku,
        itemName: `Scanned Item (${cleanSku})`,
        unit: 'cases',
        unitPrice: 0,
        quantitySent: 1,
        matchedFromCatalog: false,
      },
    ],
    rawCode,
    format: detectedFormat,
  };
}

export interface MergeLinesResult {
  lines: DraftDispatchLine[];
  addedCount: number;
  incrementedCount: number;
  totalUnitsAdded: number;
  affectedSkus: string[];
}

/**
 * Merges scanned intake items into existing Create Dispatch draft lines.
 * - Matching SKU (case-insensitive) increments quantitySent.
 * - Otherwise fills any blank placeholder row first, or appends a new row.
 */
export function mergeScannedItemsIntoDispatchLines(
  existingLines: DraftDispatchLine[],
  scannedItems: ParsedIntakeItem[]
): MergeLinesResult {
  const nextLines: DraftDispatchLine[] = existingLines.map((l) => ({ ...l }));
  let addedCount = 0;
  let incrementedCount = 0;
  let totalUnitsAdded = 0;
  const affectedSkus: string[] = [];

  for (const scanned of scannedItems) {
    const targetSku = scanned.sku.trim().toUpperCase();
    const matchIndex = nextLines.findIndex(
      (l) => l.sku.trim().toUpperCase() === targetSku && l.itemName.trim().length > 0
    );

    if (matchIndex !== -1) {
      nextLines[matchIndex] = {
        ...nextLines[matchIndex],
        quantitySent: roundQty((Number(nextLines[matchIndex].quantitySent) || 0) + scanned.quantitySent),
        unitPrice:
          nextLines[matchIndex].unitPrice > 0 ? nextLines[matchIndex].unitPrice : scanned.unitPrice,
      };
      incrementedCount++;
    } else {
      // Check for an empty placeholder row
      const emptyIndex = nextLines.findIndex((l) => l.itemName.trim() === '');
      const newLine: DraftDispatchLine = {
        sku: targetSku,
        itemName: scanned.itemName,
        unit: scanned.unit,
        unitPrice: scanned.unitPrice,
        quantitySent: scanned.quantitySent,
        notes: scanned.notes,
      };

      if (emptyIndex !== -1) {
        nextLines[emptyIndex] = newLine;
      } else {
        nextLines.push(newLine);
      }
      addedCount++;
    }

    totalUnitsAdded = roundQty(totalUnitsAdded + scanned.quantitySent);
    if (!affectedSkus.includes(targetSku)) {
      affectedSkus.push(targetSku);
    }
  }

  return {
    lines: nextLines,
    addedCount,
    incrementedCount,
    totalUnitsAdded,
    affectedSkus,
  };
}
