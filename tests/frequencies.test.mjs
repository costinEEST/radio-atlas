import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Mureș services expose every published FM and AM frequency as structured data', async () => {
  const catalog = JSON.parse(await readFile(new URL('../radios.json', import.meta.url)));
  for (const [id, expected] of [
    ['mures', ['102.9 MHz FM', '98.9 MHz FM', '94.9 MHz FM', '1197 kHz AM', '1593 kHz AM']],
    ['marosvasarhelyi', ['96.0 MHz FM', '92.3 MHz FM', '106.8 MHz FM', '1323 kHz AM', '1197 kHz AM', '1593 kHz AM']],
  ]) {
    const station = catalog.stations.find(s => s.id === id);
    assert.deepEqual(station.frequencies.map(f => `${f.value} ${f.band}`), expected);
    assert.ok(!station.frequency);
    for (const f of station.frequencies) assert.ok(f.city.name.en && f.city.name.ro);
    for (const source of station.frequency_verification.sources) {
      assert.ok(station.sources.some(s => s.url === source));
    }
  }
});

test('RRA reconciled FM catalog preserves locations, provenance and frequency-only verification', async () => {
  const catalog = JSON.parse(await readFile(new URL('../radios.json', import.meta.url)));
  const station = catalog.stations.find(({ id }) => id === 'romania-actualitati');
  const fm = station.frequencies.filter(f => f.band === 'MHz FM');
  const am = station.frequencies.filter(f => f.band === 'kHz AM');
  assert.equal(fm.length, 71);
  assert.equal(new Set(fm.map(f => f.city.slug)).size, 71);
  assert.equal(am.length, 23);
  for (const f of am) {
    assert.ok(Number(f.value) >= 531 && Number(f.value) <= 1602);
    assert.match(f.note.en, /current transmission not confirmed/);
    assert.ok(f.licensed_site.en && f.licensed_site.ro);
  }
  assert.equal(station.frequencies[0].city.slug, 'bucuresti');
  for (const f of fm) {
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
