const assert = require('node:assert/strict');
const {
  requirementName,
  parsePackageJson,
  parsePackageLock,
  parseRequirementsTxt,
  parsePyproject,
  parseGoMod,
  parseCargo,
  parseGemfile,
  parsePomXml,
  parseDotnetProject,
  parseManifest,
  isManifest,
  dedupeDeps,
  addedFromManifest
} = require('../scripts/manifests');

const names = (list) => list.map(d => d.name).sort();

// requirement name extraction (PEP 503 normalized, markers/extras/versions stripped)
assert.equal(requirementName("requests[security]>=2.0 ; python_version<'3.9'"), 'requests');
assert.equal(requirementName('Flask_Foo==1.0'), 'flask-foo');
assert.equal(requirementName('# a comment'), null);

// package.json: every dependency map, npm ecosystem
assert.deepEqual(
  names(parsePackageJson('{"dependencies":{"a":"1"},"devDependencies":{"b":"2"},"peerDependencies":{"c":"3"}}')),
  ['a', 'b', 'c']
);
assert.deepEqual(parsePackageJson('not json'), []);
assert.equal(parsePackageJson('{"dependencies":{"zod":"3"}}')[0].ecosystem, 'npm');
assert.deepEqual(
  names(parsePackageLock('{"lockfileVersion":3,"packages":{"":{"dependencies":{"a":"1"},"devDependencies":{"b":"2"}},"node_modules/a":{}}}')),
  ['a', 'b']
);

// requirements.txt: skip flags/comments, strip versions
assert.deepEqual(
  names(parseRequirementsTxt('# deps\nrequests>=2.0\nflask==2\n-r other.txt\n--hash=abc\n-e git+https://example.invalid/repo.git#egg=Editable_Pkg\n\nDjango')),
  ['django', 'editable-pkg', 'flask', 'requests']
);

// pyproject: PEP 621 array (single + multi-line) and Poetry tables
const pep621 = `
[project]
name = "x"
dependencies = ["requests>=2", "flask"]

[project.optional-dependencies]
test = [
  "pytest>=7",
  "coverage",
]
`;
assert.deepEqual(names(parsePyproject(pep621)), ['coverage', 'flask', 'pytest', 'requests']);

const poetry = `
[tool.poetry.dependencies]
python = "^3.11"
requests = "^2.0"
[tool.poetry.group.dev.dependencies]
pytest = "^7.0"
`;
assert.deepEqual(names(parsePyproject(poetry)), ['pytest', 'requests']); // python is excluded

// go.mod: require block + single line, indirect flagged
const gomod = `
module example.com/x
go 1.21
require (
	github.com/foo/bar v1.2.3
	github.com/baz/qux v0.1.0 // indirect
)
require github.com/solo/dep v1.0.0
`;
const goDeps = parseGoMod(gomod);
assert.deepEqual(goDeps.map(d => d.name).sort(), ['github.com/baz/qux', 'github.com/foo/bar', 'github.com/solo/dep']);
assert.equal(goDeps.find(d => d.name === 'github.com/baz/qux').indirect, true);
assert.equal(goDeps.find(d => d.name === 'github.com/foo/bar').indirect, false);

// Cargo.toml: [dependencies], dev/build sections, and [dependencies.foo] subtables
const cargo = `
[package]
name = "x"
version = "0.1.0"

[dependencies]
serde = "1.0"
tokio = { version = "1", features = ["full"] }
json = { package = "serde_json", version = "1" }

[dependencies.reqwest]
version = "0.11"

[dev-dependencies]
criterion = "0.5"
`;
assert.deepEqual(names(parseCargo(cargo)), ['criterion', 'reqwest', 'serde', 'serde_json', 'tokio']);
assert.equal(parseCargo(cargo)[0].ecosystem, 'cargo');

// Gemfile: gem 'name' lines
assert.deepEqual(
  names(parseGemfile("source 'https://rubygems.org'\ngem 'rails', '~> 7.0'\ngem \"pg\"\n# gem 'commented'")),
  ['pg', 'rails']
);

// Maven / NuGet: name-only extraction from XML manifests.
assert.deepEqual(
  names(parsePomXml(`
    <project>
      <dependencyManagement>
        <dependencies>
          <dependency><groupId>org.managed</groupId><artifactId>not-direct</artifactId></dependency>
        </dependencies>
      </dependencyManagement>
      <dependencies>
        <dependency><groupId>org.example</groupId><artifactId>demo-core</artifactId></dependency>
      </dependencies>
    </project>
  `)),
  ['org.example:demo-core']
);
assert.deepEqual(
  names(parseDotnetProject('<Project><ItemGroup><PackageReference Include="Newtonsoft.Json" Version="13" /><PackageReference Update="Serilog" Version="3" /></ItemGroup></Project>')),
  ['Newtonsoft.Json', 'Serilog']
);

// dispatch + diff helpers
assert.equal(isManifest('path/to/go.mod'), true);
assert.equal(isManifest('src/App.csproj'), true);
assert.equal(isManifest('README.md'), false);
assert.deepEqual(parseManifest('unknown.txt', 'whatever'), []);

const added = addedFromManifest('package.json', '{"dependencies":{"a":"1"}}', '{"dependencies":{"a":"1","b":"2"}}');
assert.deepEqual(added.map(d => d.name), ['b']);
assert.deepEqual(addedFromManifest('package.json', '{"dependencies":{"a":"1"}}', '{"dependencies":{}}'), []);

assert.deepEqual(
  dedupeDeps([{ ecosystem: 'npm', name: 'a' }, { ecosystem: 'npm', name: 'a' }, { ecosystem: 'pypi', name: 'a' }]).length,
  2
);

console.log('manifests tests passed');
