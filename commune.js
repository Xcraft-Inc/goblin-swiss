const {Elf} = require('xcraft-core-goblin');
const {Commune, CommuneLogic} = require('goblin-swiss/lib/commune.js');

exports.xcraftCommands = Elf.birth(Commune, CommuneLogic);
