import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('RRA reconciled FM catalog preserves locations, provenance and frequency-only verification', async () => {
  const catalog = JSON.parse(await readFile(new URL('../radios.json', import.meta.url)));
  const station = catalog.stations.find(({ id }) => id === 'romania-actualitati');
  assert.equal(station.frequencies.length, 71);
  assert.equal(new Set(station.frequencies.map(f => f.city.slug)).size, 71);
  assert.equal(station.frequencies[0].city.slug, 'bucuresti');
  for (const f of station.frequencies) {
    assert.ok(Number(f.value) >= 87.5 && Number(f.value) <= 108);
    assert.equal(f.band, 'MHz FM');
    assert.ok(f.licensed_site.en && f.licensed_site.ro);
    assert.ok(!f.location_type || ['region', 'transmitter'].includes(f.location_type));
  }
  assert.equal(station.frequencies.find(f => f.city.slug === 'botosani').value, '100.8');
  for (const url of station.frequency_verification.sources) {
    assert.ok(station.sources.some(source => source.url === url));
  }
  assert.match(station.frequency_verification.checked, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(station.frequency_verification.source_updated, '2025-08-21');
});
