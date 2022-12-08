// Promise的结构
// Promise实例有三种状态：
// pending:等待态
// fulfilled:成功态
// rejected:失败态
// 状态流转：
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
  /**
   *@param {function} executor 客户端在创建Promise实例时候传入的函数
   */

  constructor(executor) {
    this.#status = MyPromise.PENDING;
    this.#value = undefined;
    this.#reason = undefined;
    // 这儿需要绑定this，防止在执行resolve和reject中打印this丢失
    // 比如在resolve中打印this.status
    executor(this.#resolve.bind(this), this.#reject.bind(this));
  }

  #resolve(value) {
    if (this.#status === MyPromise.PENDING) {
      this.#status = MyPromise.FULFILLED;
      this.#value = value;
    }
  }
  #reject(reason) {
    if (this.#status === MyPromise.PENDING) {
      this.#status = MyPromise.REJECTED;
      this.#reason = reason;
    }
  }

  then(onFulfilled, onRejected) {
    if (this.#status === MyPromise.FULFILLED) {
      onFulfilled(this.#value);
    }
    if (this.#status === MyPromise.FULFILLED) {
      onRejected(this.#reason);
    }
  }
}

const myPromise = new MyPromise(() => {});
console.log(myPromise);
