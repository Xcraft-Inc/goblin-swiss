const {Transform} = require('node:stream');
const {pipeline} = require('node:stream/promises');

const isOutside = (c) => ['FL', 'IT', 'DE', ''].includes(c);

function createGeoDataCsvParser(geoData) {
  let leftover = '';

  const buildRow = (geoData, columns) => {
    const [
      name,
      zip,
      zipAddon,
      zipId,
      communeName,
      communeSourceId,
      cantonCode,
      coverage,
      lat,
      long,
      lang,
      validity,
    ] = columns;

    const communeId = isOutside(cantonCode)
      ? null
      : `commune@${communeSourceId}`;

    geoData.push({
      id: communeId
        ? `postalCode@${communeId}@${zipId}` //swiss postalCode
        : `postalCode@ext@${zipId}`, //non-swiss
      name,
      zip,
      zipAddon,
      zipId,
      communeName,
      communeId,
      cantonCode,
      coverage,
      lat,
      long,
      lang,
      validity,
    });
  };

  return new Transform({
    transform(chunk, _enc, cb) {
      try {
        let data = chunk.toString('utf8');
        if (leftover) {
          data = leftover + data;
          leftover = '';
        }

        const lines = data.split(/\n/);
        leftover = lines.pop() ?? '';

        for (let line of lines) {
          line = line.replace(/\r$/, '');
          if (!line) continue;

          const columns = line.split(';');
          buildRow(geoData, columns);
        }

        cb();
      } catch (err) {
        cb(err);
      }
    },

    flush(cb) {
      try {
        const line = leftover.replace(/\r$/, '');
        leftover = '';
        if (!line) return cb();

        const columns = line.split(';');
        if (columns.length === 16 && columns[0] === '01') {
          buildRow(geoData, columns);
        }

        cb();
      } catch (err) {
        cb(err);
      }
    },
  });
}

function createGeoDataEntryConsumer(geoData) {
  return new Transform({
    objectMode: true,

    async transform(entry, _enc, cb) {
      try {
        if (!entry?.path) {
          entry.autodrain?.();
          return cb();
        }
        await pipeline(entry, createGeoDataCsvParser(geoData));
        cb();
      } catch (err) {
        entry?.autodrain?.();
        cb(err);
      }
    },
  });
}

function createSwissAdminCsvTransform(communes, admins, cantons) {
  let leftover = '';

  const clean = (s) => {
    if (!s) return s;
    if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') {
      return s.slice(1, -1);
    }
    return s;
  };

  const handleLine = (line) => {
    line = line.replace(/\r$/, '');
    if (!line) return;

    const columns = line.split(',');
    if (columns.length !== 29) return;

    const [
      id,
      _vf,
      _vt,
      lvl,
      _p,
      _nameEn,
      nameFr,
      nameDe,
      nameIt,
      abbEn,
      abbFr,
    ] = columns;

    if (id !== 'Identifier' && lvl === '"1"') {
      cantons.push({
        id: `canton@${clean(id)}`,
        name: clean(nameFr),
        code: clean(abbFr),
      });
    }

    if (id !== 'Identifier' && lvl === '"2"') {
      admins.push({
        id: `cantonAdmin@${clean(id)}`,
        name: clean(nameFr),
        cantonId: `canton@${clean(_p)}`,
      });
    }

    if (id !== 'Identifier' && lvl === '"3"') {
      communes.push({
        id: `commune@${clean(id)}`,
        name: clean(nameFr),
        cantonAdminId: `cantonAdmin@${clean(_p)}`,
      });
    }
  };

  return new Transform({
    transform(chunk, _enc, cb) {
      try {
        let data = chunk.toString();
        if (leftover) {
          data = leftover + data;
          leftover = '';
        }

        const lines = data.split(/\n/);
        leftover = lines.pop() || '';

        for (const line of lines) handleLine(line);
        cb();
      } catch (err) {
        cb(err);
      }
    },

    flush(cb) {
      try {
        if (leftover) handleLine(leftover);
        leftover = '';
        cb();
      } catch (err) {
        cb(err);
      }
    },
  });
}

module.exports = {
  createGeoDataEntryConsumer,
  createSwissAdminCsvTransform,
};
