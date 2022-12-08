class MyPromise {
  static PENDING = "pending";
  static FULFILLED = "fulfilled";
  static REJECTED = "rejected";

  // 私有属性，无法在作用域之外修改
  #status;
  #value;
  #reason;
  #onFulfilledCallbacks = [];
  #onRejectedCallbacks = [];
  /**
   *@param {function} executor 客户端在创建Promise实例时候传入的函数
   */

  constructor(executor) {
    this.#status = MyPromise.PENDING;
    this.#value = undefined;
    this.#reason = undefined;
    // 这儿需要绑定this，防止在执行resolve和reject中打印this丢失
    // 在resolve中打印this.status
    try {
      executor(this.#resolve.bind(this), this.#reject.bind(this));
    } catch (error) {
      this.#reject(error);
    }
  }

  #resolve(value) {
    if (this.#status === MyPromise.PENDING) {
      this.#status = MyPromise.FULFILLED;
      this.#value = value;
      this.#onFulfilledCallbacks.forEach((fn) => {
        fn(this.#value);
      });
    }
  }
  #reject(reason) {
    if (this.#status === MyPromise.PENDING) {
      this.#status = MyPromise.REJECTED;
      this.#reason = reason;
      this.#onRejectedCallbacks.forEach((fn) => {
        fn(this.#reason);
      });
    }
  }

  // then方法的链式调用
  // then方法可以链式调用，代表then方法的返回值有then方法，那就是返回一个Promise实例
  then(onFulfilled, onRejected) {
    let promise2 = new MyPromise((resolve, reject) => {
      // 这儿注释掉。通过返回的Promise实例进行传递值
      // 如果typeof onFulfilled != "function"，那么通过Promise实例的resolve方法传递
      // 同理onRejected
      // onFulfilled = typeof onFulfilled !== "function" ? onFulfilled : (value) => value;
      // onRejected =
      //   typeof onRejected === "function"
      //     ? onRejected
      //     : (reason) => {
      //         throw reason;
      //       };

      if (this.#status === MyPromise.FULFILLED) {
        // 通过queueMicrotask将onFulfilled添加到微任务队列
        queueMicrotask(() => {
          try {
            // 如果typeof onFulfilled != "function"，那么通过Promise实例的resolve方法传递
            // 放在这儿处理
            if (typeof onFulfilled !== "function") {
              resolve(this.#value);
            } else {
              // 处理客户端传入的回调函数返回的值
              let x = onFulfilled(this.#value);
              resolvePromise(promise2, x, resolve, reject);
            }
          } catch (error) {
            reject(error);
          }
        });
      } else if (this.#status === MyPromise.REJECTED) {
        queueMicrotask(() => {
          try {
            if (typeof onRejected !== "function") {
              reject(this.#reason);
            } else {
              let x = onRejected(this.#reason);
              resolvePromise(promise2, x, resolve, reject);
            }
          } catch (error) {
            reject(error);
          }
        });
      } else if (this.#status === MyPromise.PENDING) {
        // onFulfilled和onRejected要在状态改变后异步执行
        // 所以也需要加上queueMicrotask
        this.#onFulfilledCallbacks.push(() => {
          queueMicrotask(() => {
            try {
              if (typeof onFulfilled !== "function") {
                resolve(this.#value);
              } else {
                let x = onFulfilled(this.#value);
                resolvePromise(promise2, x, resolve, reject);
              }
            } catch (error) {
              reject(error);
            }
          });
        });
        this.#onRejectedCallbacks.push(() => {
          queueMicrotask(() => {
            try {
              if (typeof onRejected !== "function") {
                reject(this.#reason);
              } else {
                let x = onRejected(this.#reason);
                resolvePromise(promise2, x, resolve, reject);
              }
            } catch (error) {
              reject(error);
            }
          });
        });
      }
    });
    return promise2;
  }
}

/**
 * 对resolve()、reject() 进行改造增强 针对resolve()和reject()中不同值情况 进行处理
 * @param  {promise} promise2 promise1.then方法返回的新的promise对象
 * @param  {[type]} x         promise1中onFulfilled或onRejected的返回值
 * @param  {[type]} resolve   promise2的resolve方法
 * @param  {[type]} reject    promise2的reject方法
 * @description 处理在then函数中传入的回调函数中的返回值
 */

function resolvePromise(promise2, x, resolve, reject) {
  // then方法返回一个promise2
  // 客户端回调函数中返回x = promise2
  // const promise = new Promise((resolve, reject) => {
  //   resolve(100)
  // })
  // const p1 = promise.then(value => {
  //   console.log(value)
  //   return p1
  // })
  // throw new TypeError("Chaining cycle detected for promise");
  if (x === promise2) {
    throw new TypeError("Chaining cycle detected for promise");
  }

  // 如果客户端回调函数中返回的是Promise实例,那么取到实例的value值,然后再判断,如果是普通值,则返回promise2的resolve(value)
  // 否则继续判断value值
  if (x instanceof MyPromise) {
    x.then((y) => {
      resolvePromise(promise2, y, resolve, reject);
    }, reject);
  } else if (x !== null && (typeof x === "object" || typeof x === "function")) {
    // 如果x为对象或者函数
    // 也就是thenable
    // const thenableObj = {
    //   then(resolve, reject) {
    //     resolve("thenableObj");
    //   },
    // };
    let then;
    try {
      // 取到x的then方法
      then = x.then;
    } catch (error) {
      reject(error);
    }

    // 如果then是函数
    // x作为then的this值进行调用
    // 传递两个回调函数作为参数，
    // 第一个参数叫做 `resolvePromise` ，第二个参数叫做 `rejectPromise`
    if (typeof then === "function") {
      let called = false; //避免循环调用

      // thenable
      // const thenableObj = {
      //   then(resolve:resolvePromise, reject:rejectPromise) {
      //     resolve("thenableObj");
      //   },
      // };
      try {
        then.call(
          x,
          // resolvePromise
          // 处理thenable中then中resolve的值y
          // 使用resolvePromise函数处理promise2与y
          (y) => {
            if (called) return;
            called = true;
            resolvePromise(promise2, y, resolve, reject);
          },
          // rejectPromise
          // 处理thenable中then中reject的值
          // 直接使用promise2的reject返回
          (r) => {
            if (called) return;
            called = true;
            reject(r);
          }
        );
      } catch (error) {
        // 如果调用then方法出现异常，使用promise2的reject抛出
        // 如果then方法已经被调用过了，则忽略，返回
        if (called) return;
        called = true;
        reject(error);
      }
    } else {
      // x为正常对象，使用promise2的resolve(x)
      resolve(x);
    }
  } else {
    //x为原始值，使用promise2的resolve(x)
    resolve(x);
  }
}
