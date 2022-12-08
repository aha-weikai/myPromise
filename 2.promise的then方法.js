// Promise的结构
// Promise实例有三种状态：
// pending:等待态
// fulfilled:成功态
// rejected:失败态
//状态流转：
// Promise实例的状态只能从pending向fulfilled或rejected流转
// 流转之后状态不可变

// 当执行resolve，Promise实例的状态从pending变成fulfilled
// 当执行reject，Promise实例的状态从pending变成rejected

// 解决的问题：executor()执行时候，resolve和reject的this丢失

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

  // then方法，
  // 当Promise实例的状态从pending变成fulfilled时，执行then方法中的onFulfilled函数
  // 当Promise实例的状态从pending变成rejected时，执行then方法中的onRejected函数
  // then方法中的回调函数是异步执行

  // 还有参数onFulfilled, onRejected校验，需要是函数
  // 如果不是函数，则直接返回Promise处理的值

  // 如果客户端传入的函数中异步调用resolve或者reject
  // 当执行then时，this.#status = pending，此时应收集onFulfilled和onRejected，
  // 等待状态改变之后执行
  // 且一个Promise实例可以多次调用then方法，所以应该使用数组收集

  then(onFulfilled, onRejected) {
    onFulfilled = typeof onFulfilled === "function" ? onFulfilled : (value) => value;
    onRejected =
      typeof onRejected === "function"
        ? onRejected
        : (reason) => {
            throw reason;
          };
    if (this.#status === MyPromise.FULFILLED) {
      // 通过queueMicrotask将onFulfilled添加到微任务队列
      queueMicrotask(() => {
        onFulfilled(this.#value);
      });
    }
    if (this.#status === MyPromise.REJECTED) {
      queueMicrotask(() => {
        onRejected(this.#reason);
      });
    }
    if (this.#status === MyPromise.PENDING) {
      // onFulfilled和onRejected要在状态改变后异步执行
      // 所以也需要加上queueMicrotask
      this.#onFulfilledCallbacks.push(() => {
        queueMicrotask(() => {
          onFulfilled(this.#value);
        });
      });
      this.#onRejectedCallbacks.push(() => {
        queueMicrotask(() => {
          onRejected(this.#reason);
        });
      });
    }
  }
}

const myPromise = new MyPromise((resolve, rejected) => {
  setTimeout(() => {
    resolve("executor");
  }, 1000);
});
console.log(myPromise);
myPromise.then((res) => {
  console.log(res);
});

console.log("是否异步");
