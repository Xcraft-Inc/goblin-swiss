// @ts-check
const {id} = require('xcraft-core-goblin/lib/types.js');
const {Elf} = require('xcraft-core-goblin');
const {string, option} = require('xcraft-core-stones');

class MetaShape {
  index = string;
  status = string;
  locale = string;
  scope = string;
}

class PostalCodeShape {
  id = id('postalCode');
  zipId = string;
  zipCode = string;
  zipCodeAddon = string;
  name = string;
  lat = string;
  long = string;
  language = string;
  coverage = string;
  communeId = option(id('commune'));
  cantonAdminId = option(id('cantonAdmin'));
  cantonId = option(id('canton'));
  meta = MetaShape;
}

class PostalCodeState extends Elf.Sculpt(PostalCodeShape) {}

class PostalCodeLogic extends Elf.Archetype {
  static db = 'swiss';
  static indices = ['communeId', 'cantonId'];

  state = new PostalCodeState();

  create(id, porfolio) {
    const {state} = this;
    for (const [k, v] of Object.entries(porfolio)) {
      state[k] = v;
    }
    state.id = id;
  }

  patch(patch) {
    const {state} = this;
    state._state.merge('', patch);
  }

  index(index) {
    this.state.meta.index = index;
  }
}

class PostalCode extends Elf {
  logic = Elf.getLogic(PostalCodeLogic);
  state = new PostalCodeState();

  async create(id, desktopId, porfolio) {
    this.logic.create(id, porfolio);
    await this.index();
    return this;
  }

  /**
   * @param {Partial<this['state']>} patch
   */
  async patch(patch) {
    this.logic.patch(patch);
    await this.index();
  }

  async index() {
    const index = `${this.state.zipCode} ${this.state.name}`;
    this.logic.index(index);
    await this.persist();
  }

  delete() {}
}

module.exports = {
  PostalCode,
  PostalCodeLogic,
  PostalCodeShape,
  PostalCodeState,
};
