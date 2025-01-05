# 组件状态与更新

## 核心

### 1. 组件状态

对组件的数据进行响应式处理

```js
const state = reactive(data())
```

### 2. 组件状态更新

上面对让组件拥有了状态，现在通过让组件的状态收集副作用函数，当状态发生变化时，触发副作用函数，从而更新组件。

```js
effect(() => {
  const subTree = render().call(state, state)
  patch(null, subTree, container, anchor)
})
```

通过 call 调用渲染函数，将组件状态作为渲染函数的参数，这样渲染函数内部就可以访问组件状态了。

## 缺陷

effect 副作用执行为同步 多次修改状态会导致多次渲染，有性能问题

## 调度器异步更新

### 核心

实现一个 effect 的调度器，将副作用的执行延迟到微任务中执行

1. 通过 set 去重副作用
2. 通过将副作用的执行延迟到微任务中执行 确保在所有同步状态更新后执行
3. 通过 isFlushing 避免多次执行副作用

```Mermaid
flowchart TD
start[初始化] --> A[set 缓冲队列]
start --> B[isFlushing 刷新标志]
start --> C[p 立即决议的Promise实例]
```

### 具体实现

```js
const queue = new Set()
let isFlushing = false
const p = Promise.resolve()

function queueJob(job) {
  queue.add(job)
  if (!isFlushing) {
    isFlushing = true
    p.then(() => {
      try {
        queue.forEach(job => job())
      } finally {
        isFlushing = false
        queue.clear = 0
      }
    })
  }
}
```

### 使用

```js
effect(() => {
      const subTree = render().call(state, state)
      patch(null, subTree, container, anchor)
    }, {
      scheduler: queueJob
    })
```

## 缺陷

副作用中 patch 的第一个参数是 null 每次状态变化都为重新挂载组件，导致组件状态丢失

正确的做法是，每次更新都拿上一次的 subTree 与新的 subTree 进行 patch 操作

为了解决这个问题，需要实现组件实例，用它来维护组件的整个生命周期的状态
