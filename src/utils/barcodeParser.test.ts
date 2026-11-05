import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseIntakeBarcode,
  mergeScannedItemsIntoDispatchLines,
  normalizeIntakeUnit,
  lookupCatalogByCode,
  DraftDispatchLine,
} from './barcodeParser.js';

describe('Barcode & QR Intake Parser (Pure Domain Logic)', () => {
  it('parses known EAN-13 and SKU barcodes against the warehouse catalog', () => {
    const eanResult = parseIntakeBarcode('8901012001014', 'ean_13');
    assert.equal(eanResult.ok, true);
    assert.equal(eanResult.items.length, 1);
    assert.equal(eanResult.items[0].sku, 'SKU-GLS-101');
    assert.equal(eanResult.items[0].unit, 'boxes');
    assert.equal(eanResult.items[0].unitPrice, 54.0);
    assert.equal(eanResult.items[0].quantitySent, 1);
    assert.equal(eanResult.items[0].matchedFromCatalog, true);

    const skuResult = parseIntakeBarcode('sku-bev-108', 'code_128');
    assert.equal(skuResult.ok, true);
    assert.equal(skuResult.items[0].sku, 'SKU-BEV-108');
    assert.equal(skuResult.items[0].matchedFromCatalog, true);
    assert.ok(skuResult.items[0].itemName.includes('Coffee'));
  });

  it('parses JSON single-item and batch multi-item pallet QR payloads', () => {
    const singleJson = parseIntakeBarcode(
      JSON.stringify({
        sku: 'SKU-COLD-501',
        itemName: 'Insulated Thermal Pallet Blankets',
        unit: 'units',
        quantity: 12,
        unitPrice: 85,
      })
    );
    assert.equal(singleJson.ok, true);
    assert.equal(singleJson.format, 'QR_JSON');
    assert.equal(singleJson.items.length, 1);
    assert.equal(singleJson.items[0].quantitySent, 12);

    const batchJson = parseIntakeBarcode(
      JSON.stringify({
        items: [
          { sku: 'SKU-GLS-101', name: 'Olive Oil Cases', unit: 'boxes', qty: 4 },
          { sku: 'SKU-DRY-042', name: 'Rolled Oats Sacks', unit: 'sacks', qty: 10 },
        ],
      })
    );
    assert.equal(batchJson.ok, true);
    assert.equal(batchJson.items.length, 2);
    assert.equal(batchJson.items[0].sku, 'SKU-GLS-101');
    assert.equal(batchJson.items[0].quantitySent, 4);
    assert.equal(batchJson.items[1].sku, 'SKU-DRY-042');
    assert.equal(batchJson.items[1].quantitySent, 10);
  });

  it('parses URL query QR codes and delimited 1D warehouse labels', () => {
    const urlQr = parseIntakeBarcode(
      'https://dispatchbridge.local/intake?sku=SKU-PKG-703&name=Stretch+Wrap+Film&unit=case&qty=25&price=62'
    );
    assert.equal(urlQr.ok, true);
    assert.equal(urlQr.format, 'QR_URL');
    assert.equal(urlQr.items[0].sku, 'SKU-PKG-703');
    assert.equal(urlQr.items[0].unit, 'cases');
    assert.equal(urlQr.items[0].quantitySent, 25);

    const pipeLabel = parseIntakeBarcode('SKU-CUSTOM-88|Cold-Pack Gel Bricks|cartons|18.5|19.99');
    assert.equal(pipeLabel.ok, true);
    assert.equal(pipeLabel.format, 'DELIMITED_LABEL');
    assert.equal(pipeLabel.items[0].sku, 'SKU-CUSTOM-88');
    assert.equal(pipeLabel.items[0].itemName, 'Cold-Pack Gel Bricks');
    assert.equal(pipeLabel.items[0].unit, 'cartons');
    assert.equal(pipeLabel.items[0].quantitySent, 18.5);
    assert.equal(pipeLabel.items[0].unitPrice, 19.99);
  });

  it('handles unknown alphanumeric barcodes cleanly and rejects empty or malformed payloads', () => {
    const unknown = parseIntakeBarcode('upc 7741 9920', 'upc_a');
    assert.equal(unknown.ok, true);
    assert.equal(unknown.items[0].sku, 'UPC-7741-9920');
    assert.equal(unknown.items[0].matchedFromCatalog, false);
    assert.equal(unknown.items[0].quantitySent, 1);

    const empty = parseIntakeBarcode('   ');
    assert.equal(empty.ok, false);
    assert.ok(empty.error);

    const badJson = parseIntakeBarcode('{invalid json');
    assert.equal(badJson.ok, false);

    const negativeQty = parseIntakeBarcode(JSON.stringify({ sku: 'SKU-1', name: 'Item', qty: -3 }));
    assert.equal(negativeQty.ok, false);
  });

  it('merges scanned items into dispatch lines by filling placeholders and incrementing duplicate SKUs', () => {
    const initialLines: DraftDispatchLine[] = [
      { sku: 'SKU-001', itemName: '', unit: 'cases', unitPrice: 0, quantitySent: 10 },
    ];

    // 1. First scan fills empty placeholder row
    const firstScan = parseIntakeBarcode('SKU-GLS-101|Premium Olive Oil 750ml|boxes|6|54');
    const merge1 = mergeScannedItemsIntoDispatchLines(initialLines, firstScan.items);
    assert.equal(merge1.lines.length, 1);
    assert.equal(merge1.addedCount, 1);
    assert.equal(merge1.incrementedCount, 0);
    assert.equal(merge1.lines[0].sku, 'SKU-GLS-101');
    assert.equal(merge1.lines[0].quantitySent, 6);

    // 2. Scanning same SKU again increments quantity rather than creating duplicate row
    const repeatScan = parseIntakeBarcode('8901012001014'); // EAN-13 for SKU-GLS-101 (+1)
    const merge2 = mergeScannedItemsIntoDispatchLines(merge1.lines, repeatScan.items);
    assert.equal(merge2.lines.length, 1);
    assert.equal(merge2.addedCount, 0);
    assert.equal(merge2.incrementedCount, 1);
    assert.equal(merge2.lines[0].quantitySent, 7);

    // 3. Scanning a distinct SKU appends a second line
    const thirdScan = parseIntakeBarcode('SKU-DRY-042');
    const merge3 = mergeScannedItemsIntoDispatchLines(merge2.lines, thirdScan.items);
    assert.equal(merge3.lines.length, 2);
    assert.equal(merge3.addedCount, 1);
    assert.equal(merge3.lines[1].sku, 'SKU-DRY-042');
    assert.equal(merge3.lines[1].unit, 'sacks');
  });

  it('normalizes unit aliases deterministically', () => {
    assert.equal(normalizeIntakeUnit('CS'), 'cases');
    assert.equal(normalizeIntakeUnit('kilograms'), 'kg');
    assert.equal(normalizeIntakeUnit('EA'), 'units');
    assert.equal(normalizeIntakeUnit('pallet'), 'pallets');
    assert.ok(lookupCatalogByCode('8901012001083'));
  });
});
