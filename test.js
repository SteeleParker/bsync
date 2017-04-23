var assert = require('assert');
var ssync = require('./dist/ssync.js');

describe("Sequence", function() {

    var func1 = function(opts, cb) {
        cb(null, {func1:1});
    };

    var func2 = function(opts, cb) {
        cb(null, {func2:2});
    };

    var func3 = function(opts, cb) {
        cb(null, {func3:3});
    };

    it("Explicit Args", function() {
        ssync.sequence([ func1, func2, func3 ], {arg1:1, arg2:2}, function(err, data) {
            assert.equal(data.func3, 3);
        });
    });

    it("Implict Args", function() {
        ssync.sequence({
            sequence: [
                func1,
                func2,
                func3
            ],
            args : {arg1:1, arg2:2},
            callback : function(err, data) {
                assert.equal(data.func3, 3);
            }
        })
    })

    it("Async Component", function() {
        ssync.sequence({
            sequence: [
                [
                    func1,
                    func2,
                    func3
                ],
                function(opts, cb) {
                    console.log(opts);
                    assert.equal(opts.func1, 1);
                    assert.equal(opts.func2, 2);
                    assert.equal(opts.func3, 3);

                    cb(null, {success:true});
                }
            ],
            args : {arg1:1, arg2:2},
            callback : function(err, data) {
                assert.equal(data.success, true);
            }
        })
    })
});