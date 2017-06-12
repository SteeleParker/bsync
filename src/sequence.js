"use strict";

var isPlainObject = require('is-plain-object');

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
 *  });
 */

/**
 * Primary Sequencer Class
 * @constructor
 * @example
 *  var sequencer = new Sequencer({
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

class Sequencer {
    objConstructor(argObj /*Object*/) {
        this.sequence = argObj.sequence ? argObj.sequence : null;
        this.args = argObj.args ? argObj.args : null;
        this.callback = argObj.callback ? argObj.callback : null;

        if( argObj.callback ) {
            if( Function.isFunction(argObj.callback) ) {
                this.callback = argObj.callback;
            } else {
                var invalidCallback = "Invalid callback function passed to Sequencer.construct. A function or null must be passed.";
                console.error("FATAL EXCEPTION", invalidCallback);
                throw(invalidCallback);
            }
        }


        if(this.startupErrorText) { return; }

        if( Array.isArray(argObj.sequence) || Function.isFunction(argObj.sequence) ) {
            this.sequence = argObj.sequence
        } else {
            this.startupErrorText = "Invalid sequence passed to Sequencer.construct. An array of functions (and arrays) or a single function must be passed.";

            return
        }


        if( argObj.args ) {
            if( isPlainObject(argObj.args) ) {
                this.args = argObj.args;
            } else {
                this.startupErrorText = "Invalid function args passed to Sequencer.construct. An object<k, v> containing arguments must be passed.";

                return;
            }
        }
    }
    arrConstructor(argArray /*Array*/){
        if( !this.startupErrorText && argArray.length > 3 ) {
            this.startupErrorText = "No more than 3 arguments can be passed to Sequencer.construct.";
        }

        if( arguments[2] ) {
            if( Function.isFunction(arguments[2]) ) {
                this.callback = arguments[2];
            } else {
                var invalidCallback = "Invalid callback function passed to Sequencer.construct. A function or null must be passed.";
                console.error("FATAL EXCEPTION", invalidCallback);
                throw(invalidCallback);
            }
        }

        if(this.startupErrorText) { return; }

        if( Array.isArray(argArray[0]) || Function.isFunction(argArray[0]) ) {
            this.sequence = argArray[0];
        } else {
            this.startupErrorText = "Invalid sequence passed to Sequencer.construct. An array of functions (and arrays) or a single function must be passed.";

            return;
        }

        if( arguments[1] ) {
            if( isPlainObject(arguments[1]) ) {
                this.args = arguments[1];
            } else {
                this.startupErrorText = "Invalid function args passed to Sequencer.construct. An object<k, v> containing arguments must be passed.";

                return;
            }
        }
    }
    construct() {
        this.sequence = [];
        this.callback = null;
        this.args = null;
        this.startupErrorText = null;
        this.currentSequenceIdx = 0;
        this.pendingData = {};
        this.concurrentFunctions = 0;

        if( !arguments || !arguments.length ) {

            //If this is the init of the function we can ignore null args;
            if( this.isConstructing ) return;

            var errNullArguments = "arguments passed to Sequencer.constructor were null. Nothing to run. Returning";
            console.warn(errNullArguments);

            this.startupErrorText = errNullArguments;
        }

        if( !Function.isFunction(arguments[0]) && arguments.length == 1 && isPlainObject(arguments[0]) ) {
            this.objConstructor(arguments[0]);
        } else {
            this.arrConstructor(arguments);
        }

        if( this.startupErrorText ) {
            if( this.callback ) this.callback(this.startupErrorText, null);
            return this;
        }
    }
    constructor() {
        this.isConstructing = true;

        this.construct.apply(this, arguments);

        this.isConstructing = false;
    }

    processNextSequenceFunction() {
        var prop;
        var opts = {
            sequence : this
        };

        if( this.args ) {
            for( prop in this.args ) {
                opts[prop] = this.args[prop];
            }
        }

        if( this.pendingData ) {
            for( prop in this.pendingData ) {
                if( opts[prop] != null ) {
                    console.warn("Existing property [" + prop + "] in opts to be passed to next sequence. Old value was [" + opts[prop] + "].");
                }

                opts[prop] = this.pendingData[prop];
            }

            this.pendingData = {};
        }

        var whatToExecute = this.sequence[this.currentSequenceIdx];
        if( Array.isArray(whatToExecute) ) {
            this.concurrentFunctions = whatToExecute.length;

            for( var fIdx in whatToExecute ) {
                whatToExecute[fIdx](opts, this.handlePartialSequenceComplete.bind(this));
            }
        } else {
            whatToExecute(opts, this.handlePartialSequenceComplete.bind(this));
        }
    }

    handlePartialSequenceComplete(err, data) {
        if( this.concurrentFunctions ) this.concurrentFunctions--;

        if( data ) {
            for( var prop in data ) {
                if( this.pendingData[prop] != null ) {
                    console.warn("Existing property [" + prop + "] in opts to be passed to next sequence. Overwritten value was [" + this.pendingData[prop] + "].");
                }

                this.pendingData[prop] = data[prop]
            }
        }

        if( err ) {
            this.pendingErr = this.pendingErr + " " + err || err;
        }

        if( this.concurrentFunctions == 0 ) {
            this.handleSequenceFunctionComplete();
        }
    }

    handleSequenceFunctionComplete() {
        if( this.sequence.length <= (this.currentSequenceIdx+1) ) {
            if( this.callback ) {
                this.callback(this.pendingErr, this.pendingData);
            }
            return;
        }


        this.currentSequenceIdx++;
        this.processNextSequenceFunction();
    }

    terminate() {
        this.currentSequenceIdx = this.sequence.length;
    }

    /**
     * Convenience Method
     */
    go() {
        this.processNextSequenceFunction();
    }
}

function sequence() {

    //Department of redundancy department
    var sequencer = new Sequencer();

    sequencer.construct.apply( sequencer, arguments );

    sequencer.go();

    return sequencer;
};

module.exports = sequence;