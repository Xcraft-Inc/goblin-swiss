const {Elf} = require('xcraft-core-goblin');
const {
  CantonAdmin,
  CantonAdminLogic,
} = require('goblin-swiss/lib/cantonAdmin.js');

exports.xcraftCommands = Elf.birth(CantonAdmin, CantonAdminLogic);
