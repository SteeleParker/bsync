var assert = require('assert');
var ssync = require('./dist/ssync.js');

describe("Sequence", function() {

    var func1 = function(opts, cb) {
        if( cb )
            cb(null, {func1:1});
        else
            assert.fail(null, Function, "Callback should ALWAYS be available to func");
    };

    var func2 = function(opts, cb) {
        if( cb )
            cb(null, {func2:2});
        else
            assert.fail(null, Function, "Callback should ALWAYS be available to func");
    };

    var func3 = function(opts, cb) {
        if( cb )
            cb(null, {func3:3});
        else
            assert.fail(null, Function, "Callback should ALWAYS be available to func");
    };

    var funcWait = function(opts, cb) {

        if( cb )
            setTimeout(function(){
                this.cb(null, {funcWait:4});
            }.bind({cb:cb}), 200);
        else
            assert.fail(null, Function, "Callback should ALWAYS be available to func");
    }

    var funcFail = function(opts, cb) {
        if( cb )
            assert.fail(null, null, "Function should never execute");
        else
            assert.fail(null, Function, "Callback should ALWAYS be available to func");
    }

    var funcTerminate = function(opts, cb) {
        if (cb) {
            opts.sequence.terminate();
            cb(null, {funcTerminate:5});
        } else
            assert.fail(null, Function, "Callback should ALWAYS be available to func");
    }

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
    });

    it("Async Component", function() {
        ssync.sequence({
            sequence: [
                [
                    func1,
                    func2,
                    func3
                ],
                function(opts, cb) {
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
    });

    it("(External) Early Terminate", function() {
        var terminate = ssync.sequence([
            func1,
            func2,
            funcWait,
            funcFail
        ]);

        terminate.terminate();
    });

    it("(Internal) Early Terminate", function() {
        var terminate = ssync.sequence([
            func1,
            func2,
            funcWait,
            funcTerminate,
            funcFail
        ],
        null,
        function(err, data) {
            assert.equal(data.funcTerminate, 5, "FuncTerminate did not return to Internal Early Terminate Callback");
        });

        terminate.terminate();
    })
});