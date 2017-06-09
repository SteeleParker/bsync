var sequence = require("./src/sequence.js");

Function.prototype.isFunction = function(f) {
    return f instanceof Function;
}

/**
 * @module ssync
 * @exports ssync
 */
module.exports = {
    sequence : sequence
}