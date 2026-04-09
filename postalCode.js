const {Elf} = require('xcraft-core-goblin');
const {PostalCode, PostalCodeLogic} = require('goblin-swiss/lib/postalCode.js');

exports.xcraftCommands = Elf.birth(PostalCode, PostalCodeLogic);
