// @ts-check
const {Elf} = require('xcraft-core-goblin');
const {id} = require('xcraft-core-goblin/lib/types.js');
const {pipeline} = require('node:stream/promises');
const {
  createSwissAdminCsvTransform,
  createGeoDataEntryConsumer,
} = require('./utils.js');
const Batcher = require('xcraft-core-utils/lib/batcher.js');
const {PostalCodeLogic, PostalCode} = require('./postalCode.js');
const {Canton} = require('./canton.js');
const {Commune, CommuneLogic} = require('./commune.js');
const {CantonAdmin} = require('./cantonAdmin.js');

function parseAutocompleteInput(input) {
  const q = String(input ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  if (!q) {
    return null;
  }

  const tokens = q
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean)
    .slice(0, 5);

  if (!tokens.length) {
    return null;
  }

  return tokens.map((token) => `${token}*`).join(' ');
}

class SwissShape {
  id = id;
}

class SwissState extends Elf.Sculpt(SwissShape) {}

class SwissLogic extends Elf.Spirit {
  state = new SwissState({
    id: 'swiss',
  });
}

class Swiss extends Elf.Alone {
  logic = Elf.getLogic(SwissLogic);
  state = new SwissState();
  /** @type {Set<Batcher>} */ _batchers = new Set();

  async init() {
    this.log.dbg('Pain, fromage et viande séchée...');
    const bestCommuneOfSwitzerlandExist = await this.cryo.isPersisted(
      CommuneLogic.db,
      'commune@6512'
    );
    if (!bestCommuneOfSwitzerlandExist) {
      await this.loadEntities();
    }
  }

  async searchPostalCode(input) {
    const query = parseAutocompleteInput(input);
    if (!query) {
      return [];
    }
    const results = await this.cryo.search2(
      PostalCodeLogic.db,
      query,
      ['fr'],
      ['postalCode'],
      10
    );
    return Array.from(results);
  }

  async loadEntities() {
    this.log.dbg('Loading swiss entities...');
    const postalCodesByCommuneId = await this.loadSwissGeoData();

    const {communes, admins, cantons} = await this.loadSwissAdmin();
    const communesToInsert = [];
    const adminsToInsert = [];
    const cantonsToInsert = [];

    const communesById = {};
    const communesByAdminId = {};
    const communesByCantonId = {};
    const adminsByCantonId = {};

    this.log.dbg('Make federalism great again...');
    for (const commune of Object.values(communes)) {
      const admin = admins[commune.cantonAdminId];
      if (!admin) {
        throw new Error('Data loading error');
      }
      const canton = cantons[admin.cantonId];
      if (!canton) {
        throw new Error('Data loading error');
      }

      if (!communesByAdminId[commune.cantonAdminId]) {
        communesByAdminId[commune.cantonAdminId] = [];
      }
      communesByAdminId[commune.cantonAdminId].push(commune.id);

      if (!communesByCantonId[canton.id]) {
        communesByCantonId[canton.id] = [];
      }
      communesByCantonId[canton.id].push(commune.id);

      let postalCodeIds = [];
      let languages = [];
      const postalCodes = postalCodesByCommuneId[commune.id];
      if (postalCodes) {
        postalCodeIds = postalCodes.map((p) => p.id);
        languages = postalCodes.reduce((languages, p) => {
          if (!languages.includes(p.lang)) {
            languages.push(p.lang);
          }
          return languages;
        }, []);
      }

      const communeState = {
        id: commune.id,
        name: commune.name,
        cantonId: canton.id,
        cantonCode: canton.code,
        cantonName: canton.name,
        cantonAdminId: commune.cantonAdminId,
        cantonAdminName: admin.name,
        postalCodeIds,
        languages,
        meta: {
          status: 'published',
          index: commune.name,
          locale: 'fr',
          scope: 'commune',
        },
      };
      communesById[commune.id] = communeState;
      communesToInsert.push(communeState);
    }

    for (const admin of Object.values(admins)) {
      const canton = cantons[admin.cantonId];
      if (!adminsByCantonId[admin.cantonId]) {
        adminsByCantonId[admin.cantonId] = [];
      }
      adminsByCantonId[admin.cantonId].push(admin.id);
      adminsToInsert.push({
        id: admin.id,
        name: admin.name,
        cantonId: canton.id,
        cantonCode: canton.code,
        cantonName: canton.name,
        communeIds: communesByAdminId[admin.id],
        meta: {
          status: 'published',
          index: admin.name,
          locale: 'fr',
          scope: 'admin',
        },
      });
    }

    for (const canton of Object.values(cantons)) {
      cantonsToInsert.push({
        id: canton.id,
        name: canton.name,
        code: canton.code,
        cantonAdminIds: adminsByCantonId[canton.id],
        communeIds: communesByCantonId[canton.id],
        meta: {
          status: 'published',
          index: `${canton.code} ${canton.name}`,
          locale: 'fr',
          scope: 'canton',
        },
      });
    }

    this.log.dbg('Adressing switzerland ...');
    const postalCodeToInsert = [];
    for (const postalCodes of Object.values(postalCodesByCommuneId)) {
      for (const postalCode of postalCodes) {
        const commune = communesById[postalCode.communeId];
        let cantonId = null;
        let cantonAdminId = null;
        if (commune) {
          cantonId = commune.cantonId;
          cantonAdminId = commune.cantonAdminId;
        }

        postalCodeToInsert.push({
          id: postalCode.id,
          zipId: postalCode.zipId,
          zipCode: postalCode.zip,
          zipCodeAddon: postalCode.zipAddon,
          name: postalCode.name,
          lat: postalCode.lat,
          long: postalCode.long,
          language: postalCode.lang,
          coverage: postalCode.coverage,
          communeId: postalCode.communeId,
          cantonAdminId,
          cantonId,
          meta: {
            status: 'published',
            index: `${postalCode.zip} ${postalCode.name}`,
            locale: 'fr',
            scope: 'postalCode',
          },
        });
      }
    }

    const cryo = this.quest.getAPI('cryo');
    const batcher = new Batcher(
      async () => {
        this.log.dbg(`Swiss entities begin transaction`);
        await cryo.begin({db: PostalCodeLogic.db});
      },
      async (batch) => {
        this.log.dbg(`Swiss entities commit transaction (batch of ${batch})`);
        await cryo.commit({db: PostalCodeLogic.db});
      }
    );
    this._batchers.add(batcher);

    await batcher.start();
    this.quest.defer(async () => {
      this._batchers.delete(batcher);
      await batcher.stop();
      this.log.dbg(`End load entities`);
    });

    const feedId = await this.newQuestFeed();
    for (const postalCode of postalCodeToInsert) {
      if (!(await batcher.pump())) {
        break;
      }

      await new PostalCode(this).insertOrReplace(
        postalCode.id,
        feedId,
        postalCode
      );

      if (!(await batcher.bump())) {
        break;
      }
    }

    for (const canton of cantonsToInsert) {
      if (!(await batcher.pump())) {
        break;
      }

      await new Canton(this).insertOrReplace(canton.id, feedId, canton);

      if (!(await batcher.bump())) {
        break;
      }
    }

    for (const commune of communesToInsert) {
      if (!(await batcher.pump())) {
        break;
      }

      await new Commune(this).insertOrReplace(commune.id, feedId, commune);

      if (!(await batcher.bump())) {
        break;
      }
    }

    for (const admin of adminsToInsert) {
      if (!(await batcher.pump())) {
        break;
      }

      await new CantonAdmin(this).insertOrReplace(admin.id, feedId, admin);

      if (!(await batcher.bump())) {
        break;
      }
    }

    this.log.dbg('Swiss entities loaded !');
  }

  async loadSwissGeoData() {
    const url =
      'https://data.geo.admin.ch/ch.swisstopo-vd.ortschaftenverzeichnis_plz/ortschaftenverzeichnis_plz/ortschaftenverzeichnis_plz_4326.csv.zip';
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    if (!res.body) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    this.log.dbg('Fetching and unzipping swiss geo data...');
    const unzipper = require('unzipper');
    const geoData = [];
    try {
      await pipeline(
        res.body,
        unzipper.Parse(),
        createGeoDataEntryConsumer(geoData)
      );
    } catch (err) {
      this.log.err(err);
    }
    geoData.splice(0, 1);
    return geoData.reduce((state, z) => {
      const key = z.communeId || 'ext'; //communeId can be null (ex. lichtenstein zip codes)
      if (!state[key]) {
        state[key] = [];
      }
      state[key].push(z);
      return state;
    }, {});
  }

  async loadSwissAdmin() {
    const communes = [];
    const cantons = [];
    const admins = [];
    const n = new Date();
    const snapshotDate = `${n.getDate()}-${
      n.getMonth() + 1
    }-${n.getFullYear()}`;
    const url = `https://sms.bfs.admin.ch/WcfBFSSpecificService.svc/AnonymousRest/communes/snapshots?format=Csv&useBfsCode=true&startPeriod=${snapshotDate}&endPeriod=${snapshotDate}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    try {
      this.log.dbg('Fetching and unzipping swiss admin data...');
      await pipeline(
        res.body,
        createSwissAdminCsvTransform(communes, admins, cantons)
      );
    } catch (err) {
      this.log.err(err);
    }

    return {
      communes: communes.reduce((state, c) => {
        if (!state[c.id]) {
          state[c.id] = c;
        } else {
          throw new Error('Duplicate commune infos');
        }

        return state;
      }, {}),
      admins: admins.reduce((state, c) => {
        if (!state[c.id]) {
          state[c.id] = c;
        } else {
          throw new Error('Duplicate admin infos');
        }

        return state;
      }, {}),
      cantons: cantons.reduce((state, c) => {
        if (!state[c.id]) {
          state[c.id] = c;
        } else {
          throw new Error('Duplicate canton infos');
        }

        return state;
      }, {}),
    };
  }
}

module.exports = {Swiss, SwissLogic};
