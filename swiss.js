const {Elf} = require('xcraft-core-goblin');
const {Swiss, SwissLogic} = require('goblin-swiss/lib/swiss.js');

exports.xcraftCommands = Elf.birth(Swiss, SwissLogic);
