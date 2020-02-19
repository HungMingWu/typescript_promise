enum validStates {
    PENDING,
    FULFILLED,
    REJECTED,
}

function marcoTaskRunner(this: any, callback: Function, ...args: any[]) {
  setTimeout(() => {
    callback.apply(this, args)
  }, 0)
}

const Utils = {
    runAsync: function(fn: Function) {
        setTimeout(fn, 0);
    },
    isFunction: function(val: any) {
        return val && typeof val === 'function';
    },
    isObject: function(val: any) {
        return val && typeof val === 'object';
    },
};

class HandlerType {
    fulfill: any;
    reject: any;
}

export class MyPromise<T> {
    handlers: HandlerType;
    value: T | Error | undefined = undefined;
    state: validStates = validStates.PENDING;
    queue: Array<any> = [];
    constructor(fn?: Function) {
        this.handlers = {
            fulfill: null,
            reject: null,
        };

        if (fn) {
            fn(this.Resolve.bind(this), this.reject.bind(this));
        }
    }
    private then(onFulfilled: any, onRejected: any): any {
        const queuedPromise = new MyPromise();
        if (Utils.isFunction(onFulfilled)) {
            queuedPromise.handlers.fulfill = onFulfilled;
        }

        if (Utils.isFunction(onRejected)) {
            queuedPromise.handlers.reject = onRejected;
        }

        this.queue.push(queuedPromise);
        this.process();

        return queuedPromise;
    }
    public transition(state: Exclude<validStates, validStates.PENDING>, value?: T | Error): void {
        if (this.state === state || this.state !== validStates.PENDING) {
            return;
        }

        this.value = value;
        this.state = state;
        this.process();
    }
    private process() {
        const fulfillFallBack = function(value: any) {
                return value;
            },
            rejectFallBack = function(reason: any) {
                throw reason;
            };

        if (this.state === validStates.PENDING) {
            return;
        }

        marcoTaskRunner(() => {
            while (this.queue.length) {
                const queuedPromise = this.queue.shift();
                let handler = null,
                    value;

                if (this.state === validStates.FULFILLED) {
                    handler = queuedPromise.handlers.fulfill || fulfillFallBack;
                } else if (this.state === validStates.REJECTED) {
                    handler = queuedPromise.handlers.reject || rejectFallBack;
                }

                try {
                    value = handler(this.value);
                } catch (e) {
                    queuedPromise.transition(validStates.REJECTED, e);
                    continue;
                }

                queuedPromise.Resolve(value);
            }
        });
    }
    private reject(reason: any) {
        this.transition(validStates.REJECTED, reason);
    }
    private Resolve(x: any) {
        if (this === x) {
            this.transition(validStates.REJECTED, new TypeError('The promise and its value refer to the same object'));
        } else if (x instanceof MyPromise) {
            if (x.state === validStates.PENDING) {
                x.then(this.Resolve.bind(this), (reason: Error) => this.transition(validStates.REJECTED, reason));
            } else {
                this.transition(x.state, x.value);
            }
        } else if (Utils.isObject(x) || Utils.isFunction(x)) {
            let called = false,
                thenHandler;
            try {
                thenHandler = x.then;

                if (Utils.isFunction(thenHandler)) {
                    thenHandler.call(
                        x,
                        (y: any) => {
                            if (!called) {
                                this.Resolve(y);
                                called = true;
                            }
                        },
                        (r: any) => {
                            if (!called) {
                                this.reject(r);
                                called = true;
                            }
                        },
                    );
                } else {
                    this.transition(validStates.FULFILLED, x);
                    called = true;
                }
            } catch (e) {
                if (!called) {
                    this.reject(e);
                    called = true;
                }
            }
        } else {
            this.transition(validStates.FULFILLED, x);
        }
    }
}
