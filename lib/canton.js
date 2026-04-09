// @ts-check
const {id} = require('xcraft-core-goblin/lib/types.js');
const {Elf} = require('xcraft-core-goblin');
const {string, option, array} = require('xcraft-core-stones');

class MetaShape {
  index = string;
  status = string;
  locale = string;
  scope = string;
}

class CantonShape {
  id = id('canton');
  name = string;
  code = string;
  cantonAdminIds = array(id('cantonAdminId'));
  communeIds = array(id('commune'));
  meta = MetaShape;
}

class CantonState extends Elf.Sculpt(CantonShape) {}

class CantonLogic extends Elf.Archetype {
  static db = 'swiss';
  static indices = [];

  state = new CantonState();

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

class Canton extends Elf {
  logic = Elf.getLogic(CantonLogic);
  state = new CantonState();

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
    const index = `${this.state.code} ${this.state.name}`;
    this.logic.index(index);
    await this.persist();
  }

  delete() {}
}

module.exports = {
  Canton,
  CantonLogic,
  CantonShape,
  CantonState,
};
