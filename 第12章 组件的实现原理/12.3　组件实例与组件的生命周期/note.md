## 组件实例与组件的生命周期

### 组件实例

在mountComponent函数中为每个组件创建一个实例 包含组件的状态、是否已挂载、子树 

同时将实例挂载到vnode上 方便后续使用

```js
// 定义组件实例
const instance = {
  state,
  isMounted: false,
  subTree: null,
}

// 组件实例挂载到vnode上 方便后续使用
vnode.component = instance
```

在副作用中，即可通过组件实例上的状态判断是初次挂载还是更新

```js
// 组件自更新
effect(() => {
  const subTree = render().call(state, state)
  // 检查组件是否初次渲染
  if (!instance.isMounted) {
    // 初次挂载
    patch(null, subTree, container, anchor)
    instance.isMounted = true
  }
  // patch
  else {
    // 更新
    patch(instance.subTree, subTree, container, anchor)
  }
  instance.subTree = subTree
}, {
  scheduler: queueJob
})
```

### 组件的生命周期

有了组件实例，就可以在组件的整个生命周期中执行相应的钩子函数

1. 获取钩子
```js
const { render, data, beforeCreate, created, beforeMount, mounted, beforeUpdate, updated } = componentOptions
```
2. 在正确的时机调用钩子

```js
// beforeCreate 钩子
beforeCreate && beforeCreate()

const state = reactive(data())

const instance = {
  state,
  isMounted: false,
  subTree: null,
}

vnode.component = instance

// created 钩子
created && created()

effect(() => {
  const subTree = render().call(state, state)
  if (!instance.isMounted) {
    // beforeMount 钩子
    beforeMount && beforeMount()
    patch(null, subTree, container, anchor)
    instance.isMounted = true
    // mounted 钩子
    mounted && mounted()
  }
  else {
    // beforeUpdate 钩子
    beforeUpdate && beforeUpdate()
    patch(instance.subTree, subTree, container, anchor)
    // updated 钩子
    updated && updated()
  }
  instance.subTree = subTree
}, {
  scheduler: queueJob
})
``` 
