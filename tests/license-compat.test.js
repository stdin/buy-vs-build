const assert = require('node:assert/strict');
const { categorizeLicense, assessLicenseCompat, formatCompat } = require('../scripts/license-compat');

// Categorization, including the LGPL-vs-GPL trap.
assert.equal(categorizeLicense('MIT'), 'permissive');
assert.equal(categorizeLicense('Apache-2.0'), 'permissive');
assert.equal(categorizeLicense('BSD-3-Clause'), 'permissive');
assert.equal(categorizeLicense('GPL-3.0-or-later'), 'strong-copyleft');
assert.equal(categorizeLicense('GPLv2'), 'strong-copyleft');
assert.equal(categorizeLicense('LGPL-3.0'), 'weak-copyleft'); // must NOT be strong
assert.equal(categorizeLicense('MPL-2.0'), 'weak-copyleft');
assert.equal(categorizeLicense('AGPL-3.0'), 'network-copyleft');
assert.equal(categorizeLicense('CC0-1.0'), 'public-domain');
assert.equal(categorizeLicense('Unlicense'), 'public-domain');
assert.equal(categorizeLicense(''), 'unknown');
assert.equal(categorizeLicense('NOASSERTION'), 'unknown');
assert.equal(categorizeLicense('Proprietary'), 'proprietary');

// Permissive dep is fine anywhere.
assert.equal(assessLicenseCompat('MIT', 'MIT').level, 'ok');
assert.equal(assessLicenseCompat(null, 'Apache-2.0').level, 'ok');

// GPL dep into MIT/proprietary project warns; into a GPL project it's fine.
const gplIntoMit = assessLicenseCompat('MIT', 'GPL-3.0');
assert.equal(gplIntoMit.level, 'warn');
assert.match(gplIntoMit.reason, /strong copyleft/i);
assert.equal(assessLicenseCompat(null, 'GPL-3.0').level, 'warn'); // unknown project = worst case
assert.equal(assessLicenseCompat('GPL-3.0', 'GPL-2.0').level, 'ok');

// AGPL always warns.
assert.equal(assessLicenseCompat('MIT', 'AGPL-3.0').level, 'warn');

// Weak copyleft into permissive is a review, not a hard warning.
assert.equal(assessLicenseCompat('MIT', 'LGPL-3.0').level, 'review');
assert.equal(assessLicenseCompat('GPL-3.0', 'LGPL-3.0').level, 'ok');

// Unclear dependency license -> review.
assert.equal(assessLicenseCompat('MIT', '').level, 'review');
assert.equal(assessLicenseCompat('MIT', null).level, 'review');

// formatCompat renders an icon + reason; null-safe.
assert.match(formatCompat(gplIntoMit), /🚫 License:/);
assert.match(formatCompat(assessLicenseCompat('MIT', 'MIT')), /✅ License:/);
assert.equal(formatCompat(null), null);

console.log('license-compat tests passed');
