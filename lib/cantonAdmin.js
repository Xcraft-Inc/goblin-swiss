// @ts-check
const {id} = require('xcraft-core-goblin/lib/types.js');
const {Elf} = require('xcraft-core-goblin');
const {string, array} = require('xcraft-core-stones');

class MetaShape {
  index = string;
  status = string;
  locale = string;
  scope = string;
}

class CantonAdminShape {
  id = id('cantonAdmin');
  name = string;
  cantonId = id('canton');
  cantonCode = string;
  cantonName = string;
  communeIds = array(id('commune'));
  meta = MetaShape;
}

class CantonAdminState extends Elf.Sculpt(CantonAdminShape) {}

class CantonAdminLogic extends Elf.Archetype {
  static db = 'swiss';
  static indices = [];

  state = new CantonAdminState();

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

class CantonAdmin extends Elf {
  logic = Elf.getLogic(CantonAdminLogic);
  state = new CantonAdminState();

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
  CantonAdmin,
  CantonAdminLogic,
  CantonAdminShape,
  CantonAdminState,
};
