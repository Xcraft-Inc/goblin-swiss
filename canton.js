const {Elf} = require('xcraft-core-goblin');
const {Canton, CantonLogic} = require('goblin-swiss/lib/canton.js');

exports.xcraftCommands = Elf.birth(Canton, CantonLogic);
