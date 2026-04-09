'use strict';

const {expect} = require('chai');
const {Elf} = require('xcraft-core-goblin/lib/test.js');
const {Swiss} = require('../lib/swiss.js');

describe('goblin.swiss', function () {
  let runner;

  this.beforeAll(function () {
    runner = new Elf.Runner();
    runner.init();
  });

  this.afterAll(function () {
    runner.dispose();
  });

  it.skip('load swisspost zips', async function () {
    this.timeout(process.env.NODE_ENV === 'development' ? 1000000 : 40000);

    /** @this {Elf} */
    async function testLoad() {
      const swiss = new Swiss(this);
      await swiss.boot();
      const results = await swiss.searchPostalCode('z*');
      this.log.dbg(results);
    }

    await runner.it(testLoad);
  });
});
