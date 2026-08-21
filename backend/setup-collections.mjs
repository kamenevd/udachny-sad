#!/usr/bin/env node
/**
 * Создаёт коллекции PocketBase для «уДачного сада» через REST API.
 * Использование:
 *   node setup-collections.mjs <pb-url> <superuser-email> <superuser-password>
 *
 * Скрипт идемпотентен: существующие коллекции обновляются (PATCH), новые создаются (POST).
 */

const [, , BASE, EMAIL, PASSWORD] = process.argv;
if (!BASE || !EMAIL || !PASSWORD) {
  console.error('usage: node setup-collections.mjs <pb-url> <email> <password>');
  process.exit(1);
}

async function api(path, opts = {}, token) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: token } : {}),
      ...(opts.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${opts.method || 'GET'} ${path} -> ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

const auth = await api('/api/collections/_superusers/auth-with-password', {
  method: 'POST',
  body: JSON.stringify({ identity: EMAIL, password: PASSWORD }),
});
const token = auth.token;

const IMG = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const THUMBS = ['100x100', '400x400', '800x0'];

const ownerRule = 'owner = @request.auth.id';
const ownerCreate = '@request.auth.id != "" && owner = @request.auth.id';
const collaboratorRule = 'owner = @request.auth.id || members ?= @request.auth.id';
const inviteJoinRule =
  '@request.auth.email != "" && @collection.plot_invites.plot ?= id && @collection.plot_invites.email ?= @request.auth.email && @collection.plot_invites.status ?= "invited"';
const plotRule = 'plot.owner = @request.auth.id || plot.members ?= @request.auth.id';
const plotCreate = '@request.auth.id != "" && (plot.owner = @request.auth.id || plot.members ?= @request.auth.id)';
const plantingRule =
  'planting.plot.owner = @request.auth.id || planting.plot.members ?= @request.auth.id';
const plantingCreate =
  '@request.auth.id != "" && (planting.plot.owner = @request.auth.id || planting.plot.members ?= @request.auth.id)';

// Определения без системных полей (id/created/updated PB добавляет сам).
const collections = [
  {
    name: 'plots',
    type: 'base',
    fields: [
      { type: 'relation', name: 'owner', collectionId: '_pb_users_auth_', maxSelect: 1, required: true, cascadeDelete: true },
      { type: 'relation', name: 'members', collectionId: '_pb_users_auth_', maxSelect: 50 },
      { type: 'text', name: 'name', required: true, max: 120 },
      { type: 'number', name: 'width', required: true, min: 2, max: 1000 },
      { type: 'number', name: 'height', required: true, min: 2, max: 1000 },
      { type: 'autodate', name: 'created', onCreate: true },
      { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
    ],
    listRule: collaboratorRule,
    viewRule: collaboratorRule,
    createRule: ownerCreate,
    updateRule: `${collaboratorRule} || (${inviteJoinRule})`,
    deleteRule: ownerRule,
  },
  {
    name: 'plot_invites',
    type: 'base',
    fields: [
      { type: 'relation', name: 'plot', collectionId: '@plots', maxSelect: 1, required: true, cascadeDelete: true },
      { type: 'text', name: 'email', required: true, max: 255 },
      { type: 'select', name: 'status', required: true, maxSelect: 1, values: ['invited', 'accepted'] },
      { type: 'relation', name: 'user', collectionId: '_pb_users_auth_', maxSelect: 1 },
      { type: 'relation', name: 'invited_by', collectionId: '_pb_users_auth_', maxSelect: 1, required: true },
      { type: 'autodate', name: 'created', onCreate: true },
      { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
    ],
    indexes: [
      'CREATE UNIQUE INDEX `idx_plot_invites_plot_email` ON `plot_invites` (`plot`, `email`)',
    ],
    listRule: 'plot.owner = @request.auth.id || plot.members ?= @request.auth.id || email = @request.auth.email',
    viewRule: 'plot.owner = @request.auth.id || plot.members ?= @request.auth.id || email = @request.auth.email',
    createRule: '@request.auth.id != "" && plot.owner = @request.auth.id && invited_by = @request.auth.id',
    updateRule: 'plot.owner = @request.auth.id || (email = @request.auth.email && status = "invited")',
    deleteRule: 'plot.owner = @request.auth.id || email = @request.auth.email',
  },
  {
    name: 'features',
    type: 'base',
    fields: [
      { type: 'relation', name: 'plot', collectionId: '@plots', maxSelect: 1, required: true, cascadeDelete: true },
      { type: 'select', name: 'kind', required: true, maxSelect: 1, values: ['house', 'building', 'bed', 'lawn', 'path', 'hedge', 'tree', 'shrub', 'water'] },
      { type: 'text', name: 'label', max: 120 },
      { type: 'json', name: 'shape', required: true, maxSize: 100000 },
      { type: 'number', name: 'z' },
      { type: 'text', name: 'author_email', max: 255 },
      { type: 'autodate', name: 'created', onCreate: true },
      { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
    ],
    listRule: plotRule, viewRule: plotRule, createRule: plotCreate, updateRule: plotRule, deleteRule: plotRule,
  },
  {
    name: 'plants',
    type: 'base',
    fields: [
      { type: 'relation', name: 'owner', collectionId: '_pb_users_auth_', maxSelect: 1, required: true, cascadeDelete: true },
      { type: 'text', name: 'name', required: true, max: 160 },
      { type: 'text', name: 'cultivar', max: 160 },
      { type: 'select', name: 'ptype', maxSelect: 1, values: ['perennial', 'shrub', 'tree', 'conifer', 'bulb', 'annual', 'vine', 'grass'] },
      { type: 'text', name: 'notes', max: 4000 },
      { type: 'file', name: 'photo', maxSelect: 1, maxSize: 10485760, mimeTypes: IMG, thumbs: THUMBS },
      { type: 'autodate', name: 'created', onCreate: true },
      { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
    ],
    listRule: ownerRule, viewRule: ownerRule, createRule: ownerCreate, updateRule: ownerRule, deleteRule: ownerRule,
  },
  {
    name: 'plantings',
    type: 'base',
    fields: [
      { type: 'relation', name: 'plot', collectionId: '@plots', maxSelect: 1, required: true, cascadeDelete: true },
      { type: 'relation', name: 'plant', collectionId: '@plants', maxSelect: 1, required: true },
      { type: 'relation', name: 'feature', collectionId: '@features', maxSelect: 1 },
      { type: 'number', name: 'x', required: true },
      { type: 'number', name: 'y', required: true },
      { type: 'text', name: 'plant_name', max: 160 },
      {
        type: 'select',
        name: 'plant_ptype',
        maxSelect: 1,
        values: ['perennial', 'shrub', 'tree', 'conifer', 'bulb', 'annual', 'vine', 'grass'],
      },
      { type: 'text', name: 'author_email', max: 255 },
      { type: 'date', name: 'planted_on' },
      { type: 'select', name: 'status', required: true, maxSelect: 1, values: ['growing', 'dead', 'moved'] },
      { type: 'date', name: 'ended_on' },
      { type: 'text', name: 'end_note', max: 1000 },
      { type: 'autodate', name: 'created', onCreate: true },
      { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
    ],
    listRule: plotRule, viewRule: plotRule, createRule: plotCreate, updateRule: plotRule, deleteRule: plotRule,
  },
  {
    name: 'entries',
    type: 'base',
    fields: [
      { type: 'relation', name: 'planting', collectionId: '@plantings', maxSelect: 1, required: true, cascadeDelete: true },
      { type: 'select', name: 'etype', required: true, maxSelect: 1, values: ['water', 'bloom', 'prune', 'feed', 'disease', 'shelter', 'replant', 'death', 'note'] },
      { type: 'date', name: 'happened_on', required: true },
      { type: 'text', name: 'note', max: 4000 },
      { type: 'file', name: 'photos', maxSelect: 5, maxSize: 10485760, mimeTypes: IMG, thumbs: THUMBS },
      { type: 'text', name: 'author_email', max: 255 },
      { type: 'autodate', name: 'created', onCreate: true },
      { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
    ],
    listRule: plantingRule, viewRule: plantingRule, createRule: plantingCreate, updateRule: plantingRule, deleteRule: plantingRule,
  },
];

const existing = await api('/api/collections?perPage=200', {}, token);
const byName = Object.fromEntries(existing.items.map((c) => [c.name, c]));
const idByName = { _pb_users_auth_: '_pb_users_auth_' };
for (const c of existing.items) idByName[c.name] = c.id;

for (const def of collections) {
  // Ссылки вида '@plots' заменяем на реальные id уже созданных коллекций.
  const resolved = JSON.parse(JSON.stringify(def));
  for (const f of resolved.fields) {
    if (f.type === 'relation' && f.collectionId.startsWith('@')) {
      const target = f.collectionId.slice(1);
      if (!idByName[target]) throw new Error(`collection ${target} must be created before ${def.name}`);
      f.collectionId = idByName[target];
    }
  }
  if (byName[def.name]) {
    const cur = byName[def.name];
    // Сохраняем id существующих полей, чтобы PATCH не пересоздавал колонки с данными.
    for (const f of resolved.fields) {
      const old = cur.fields.find((x) => x.name === f.name);
      if (old) f.id = old.id;
    }
    const updated = await api(`/api/collections/${cur.id}`, { method: 'PATCH', body: JSON.stringify(resolved) }, token);
    idByName[def.name] = updated.id;
    console.log(`updated: ${def.name}`);
  } else {
    const created = await api('/api/collections', { method: 'POST', body: JSON.stringify(resolved) }, token);
    idByName[def.name] = created.id;
    console.log(`created: ${def.name}`);
  }
}

console.log('done');
