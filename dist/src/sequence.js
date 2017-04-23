"use strict";

/**
 * @public
 * @readonly
 * @author Steele Parker
 * @module ssync/sequence
 * @param {Object|Array} config|sequence object containing keys ['sequence', 'args', 'callback'] or array of {Function|Array}.<br /><br />
 * If a config object is passed, only 1 argument must be passed. If arguments are implied, only 3 must be passed.
 * @param {Object} args <i>(optional when config object is passed otherwise required)</i><br /><br />
 * args object containing args to be made available to each function within the sequence
 * @param {Function} callback <i>(optional)</i><br /><br />
 * callback to execute after the sequence has completed.
 * @returns {Sequencer}
 * @description
 * Instantiates, Configures and begins execution of a new {@link Sequencer}. <br/><br />
 *
 * The purpose of this function is to operate as a synchronous scaffolding for asynchronous functionality. An
 * array of independent aSynchronous events that rely on the results passed between each other is passed, then
 * executed in the order specified in the sequence registry.<br/><br />
 *
 * Each function touched by the sequencer should be written such that they can take the same arguments passed
 * to any other function in the sequencer for the purposes of convention over configuration, including shared config.
 * Functioned consumed by the sequencer should follow the convention of function(opts, callback) and callback (err, data)
 * as per http://blog.gvm-it.eu/post/22040726249/callback-conventions-in-nodejs-how-and-why and other resources.<br/><br />
 *
 * Each instance of a sequence should be thought of as a contained application with its own config, passed in the form of args.<br/><br />
 *
 * The data returned from each function in the sequence will be made available to the following function in the sequence.<br/><br />
 *
 * A portion of the sequencer itself will be passed into each stage of the sequence so that it can track it's current execution stage
 * In the analogy of a close application, the sequencer will be the application context.<br/><br />
 *
 * The sequencer must be instantiated, multiple sequencers can be instantiated but the developer must handle
 * the asynchronous nature of them as you would any other asynchronous functionality.
 * @example
 * //Return the sequencer for use elsewhere
 * //Implied args
 * var ssync = require('bsync')
 *
 * var sequence1 = bsync.sequence([
 *     function1,
 *     function2
 * ],{
 *     arg1 : "String",
 *     arg2 : true
 * },function(err, data) {
 *     //Do something with the result of the final output
 * });
 * @example
 * //Explicit args
 * ssync.sequence({
 *     sequence:[
 *         function1,
 *         function2
 *     ],
 *     args: {
 *         arg1 : "String",
 *         arg2 : true
 *     },
 *     callback: function(err, data) {
 *         //Do something with the result of the final output
 *     }
 * });
 * @example
 * //Concurrent functions
 * ssync.sequence([
 *      [ function1, function2 ],
 *  ],
 *  null,
 *  function(err, data) {
 *      // the merged results of function1 and function2 will be
 *      // passed here instead of just the output of function2
 *  }
 */

/**
 * Primary Sequencer Class
 * @constructor
 * @example
 *  var sequencer = new Sequencer();
 *
 *  sequencer.registerSequence({
 *      sequence : [
 *          function1,
 *          function2
 *      ],
 *      args : {
 *          arg1 : "String",
 *          arg2 : true
 *      },
 *      callback: function(err, data) {
 *          //Do something with the result of the final output
 *      }
 *  });
 *
 *  sequencer.go();
 */
var Sequencer = function() {
    this.sequenceRegistry = [];
};

var registerSequence = function(/*Array*/ funcsToSequence) {
    this.sequenceRegistry.push(funcsToSequence);
};

var executeSequenceRegistry = function(callback) {

    if( !this.sequenceRegistry || !this.sequenceRegistry.length ) {
        if( callback ) {
            callback("Sequence registry was blank or null in executeSequenceRegistry");
        }
    }

    var idx
    for( idx in this.sequenceRegistry ) {
        this.sequenceRegistry[idx].terminate = terminate.bind(this.sequenceRegistry[idx]);
        processNextSequenceFunction.bind(this.sequenceRegistry[idx])();
    }
}

/* Within the context of an individual sequence within the sequencing registry */
var processNextSequenceFunction = function(data) {
    this.currentIdx = this.currentIdx != null ? this.currentIdx+1 : 0;

    if( this.currentIdx == 0 && this.sequence.length == 0 ) {
        console.log("Sequencer processing was requested but there was nothing to execute.");

        if( this.callback ) {
            this.callback(null, null);
        }

        return;
    }

    var opts = {
        sequence : this
    };

    if( this.args ) {
        for( var prop in this.args ) {
            opts[prop] = this.args[prop];
        }
    }

    if( data ) {
        for( prop in data ) {
            if( opts[prop] != null ) {
                console.warn("Existing property [" + prop + "] in opts to be passed to next sequence. Old value was [" + opts[prop] + "].");
            }

            opts[prop] = data[prop];
        }
    }

    if( this.sequence.length > this.currentIdx+1 ) {
        this.hasNext = true;
        this.next = processNextSequenceFunction.bind(this);
    } else {
        this.hasNext = false;
        this.next = null;
    }

    var whatToExecute = this.sequence[this.currentIdx];

    if( Array.isArray(whatToExecute) ) {
        this.concurrentFunctions = whatToExecute.length;
        this.pendingData = {};

        for( var fIdx in whatToExecute ) {
            this.sequence[this.currentIdx][fIdx](opts, handleSequencePartialComplete.bind(this));
        }
    } else {
        this.sequence[this.currentIdx](opts, handleSequenceFunctionComplete.bind(this));
    }
}

var handleSequencePartialComplete = function(err, data) {
    this.concurrentFunctions--;

    if( data ) {
        for( var prop in data ) {
            if( this.pendingData[prop] != null ) {
                console.warn("Existing property [" + prop + "] in opts to be passed to next sequence. Old value was [" + this.pendingData[prop] + "].");
            }

            this.pendingData[prop] = data[prop];
        }
    }

    if( this.concurrentFunctions == 0 ) {
        delete this.concurrentFunctions;

        /* TODO: Handle errors here */
        handleSequenceFunctionComplete.bind(this)(null, this.pendingData);
    }
}

var handleSequenceFunctionComplete = function(err, data) {
    if( this.hasNext && !err ) {
        if( data )
            this.next(data);
        else
            this.next();
    } else {
        //TODO: Handle Err/Callback

        if( this.callback ) {
            if (err) {
                this.callback(err, data);
            } else {
                this.callback(null, data);
            }
        }
    }
}

/*
 * Used to permaturely terminate a sequence
 */
var terminate = function(err, data) {
    if( this.callback ) {
        if(err) {
            this.callback(err, data);
        } else {
            this.callback(null, data);
        }
    }
}

Sequencer.prototype.registerSequence = registerSequence;
Sequencer.prototype.go = executeSequenceRegistry;
Sequencer.prototype.handleSequenceFunctionComplete = handleSequenceFunctionComplete;
Sequencer.prototype.processNextSequenceFunction = processNextSequenceFunction;

function sequence() {
    var functionsToCall, argsToApply, callback;

    if( arguments.length != 1 ) {
        //User has attempted implicit arg structure and it should be treated as such

        // args[0] == Functions to call
        functionsToCall = arguments[0];

        // args[1] == Args to apply to each function
        argsToApply = arguments[1];

        // args[2] == Callback after sequence completes
        callback = arguments[2];
    } else {
        functionsToCall = arguments[0].sequence;
        argsToApply = arguments[0].args;
        callback = arguments[0].callback;
    }

    if( !functionsToCall || !functionsToCall.length ) {
        if( callback ) {
            callback("Sequence registry was blank or null in executeSequenceRegistry");
        }

        return false;
    }

    //Department of redundancy department
    var sequencer = new Sequencer();

    sequencer.registerSequence({
        sequence : functionsToCall,
        args : argsToApply,
        callback: callback
    });

    sequencer.go();

    return sequencer;
};

module.exports = sequence;