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

class CommuneShape {
  id = id('commune');
  name = string;
  cantonId = option(id('canton'));
  cantonCode = string;
  cantonName = string;
  cantonAdminId = option(id('cantonAdmin'));
  cantonAdminName = string;
  postalCodeIds = array(id('postalCode'));
  languages = array(string);
  meta = MetaShape;
}

class CommuneState extends Elf.Sculpt(CommuneShape) {}

class CommuneLogic extends Elf.Archetype {
  static db = 'swiss';
  static indices = [];

  state = new CommuneState();

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

class Commune extends Elf {
  logic = Elf.getLogic(CommuneLogic);
  state = new CommuneState();

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
    const index = `${this.state.name}`;
    this.logic.index(index);
    await this.persist();
  }

  delete() {}
}

module.exports = {
  Commune,
  CommuneLogic,
  CommuneShape,
  CommuneState,
};
