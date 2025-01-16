# KeepAlive 组件的实现原理

## 组件的激活与失活

KeepAlive 的原理其实就是

1. 缓存管理
2. 特殊的挂载/卸载逻辑

### 缓存管理

KeepAlive 组件本身不渲染内容，始终返回默认插槽的内容

```html
<template>
  <!-- 使用 KeepAlive 组件包裹 -->
  <KeepAlive>
    <Tab v-if="currentTab === 1">...</Tab>
    <Tab v-if="currentTab === 2">...</Tab>
    <Tab v-if="currentTab === 3">...</Tab>
  </KeepAlive>
</template>
```

#### 在编译阶段

上述三个 Tab 就已经决议出最终的默认插槽内容了

#### 在挂载阶段

在 KeepAlive 组件的 render 函数中，先获取编译阶段生成的默认插槽内容，然后判断该内容是否是组件

KeepAlive 只对组件进行缓存

```js
// KeepAlive 的默认插槽就是要被 KeepAlive 的组件
let rawVNode = slots.default()
// 如果不是组件，直接渲染即可，因为非组件的虚拟节点无法被 KeepAlive
if (typeof rawVNode.type !== 'object') {
  return rawVNode
}
```

只需要将 rawVNode 的 type 作为 key 存储到 keep-alive 的缓存中，整个虚拟 dom 作为值既可以进行缓存

```js
// 在挂载时先获取缓存的组件 vnode
const cachedVNode = cache.get(rawVNode.type)
if (cachedVNode) {
  // 如果有缓存的内容，则说明不应该执行挂载，而应该执行激活
  // 继承组件实例
  rawVNode.component = cachedVNode.component
  // 在 vnode 上添加 keptAlive 属性，标记为 true，避免渲染器重新挂载它
  rawVNode.keptAlive = true
} else {
  // 如果没有缓存，则将其添加到缓存中，这样下次激活组件时就不会执行新的挂载动作了
  cache.set(rawVNode.type, rawVNode)
}
```

当状态变化后重新调用 render 函数时，就可以得到组件的缓存

### 激活/失活逻辑

KeepAlive 实现激活和失活的核心就是在在挂载 mountComponent KeepAlive 时对其 rawVNode 打上标记

然后在挂载和卸载逻辑中根据标记将 rawVNode 移出/移入 隐藏容器中

#### 隐藏容器

在 keep-alive 组件中，我们定义了一个隐藏容器，并在挂载和卸载逻辑中移动 rawVNode 到该容器中

```js
// 创建隐藏容器
const storageContainer = createElement('div')

// KeepAlive 组件的实例上会被添加两个内部函数，分别是 _deActivate 和 _activate
// 这两个函数会在渲染器中被调用
instance._deActivate = (vnode) => {
  move(vnode, storageContainer)
}
instance._activate = (vnode, container, anchor) => {
  move(vnode, container, anchor)
}
```

#### 失活

当rawVNode 第一次 render 时，就会添加 shouldKeepAlive 标记，并在 keepAliveInstance 属性上保存 KeepAlive 组件的实例

```js
// 在组件 vnode 上添加 shouldKeepAlive 属性，并标记为 true，避免渲染器真的将组件卸载
rawVNode.shouldKeepAlive = true
// 将 KeepAlive 组件的实例也添加到 vnode 上，以便在渲染器中访问
rawVNode.keepAliveInstance = instance
```

但卸载时，就会根据 shouldKeepAlive 标记将 rawVNode 移入不可见的 dom 容器中，作为失活

```js
// 卸载操作
function unmount(vnode) {
  if (vnode.type === Fragment) {
    vnode.children.forEach(c => unmount(c))
    return
  } else if (typeof vnode.type === 'object') {
    // vnode.shouldKeepAlive 是一个布尔值，用来标识该组件是否应该被 KeepAlive
    if (vnode.shouldKeepAlive) {
      // 对于需要被 KeepAlive 的组件，我们不应该真的卸载它，而应调用该组件的父组件，
      // 即 KeepAlive 组件的 _deActivate 函数使其失活
      vnode.keepAliveInstance._deActivate(vnode)
    } else {
      unmount(vnode.component.subTree)
    }
    return
  }
  const parent = vnode.el.parentNode
  if (parent) {
    parent.removeChild(vnode.el)
  }
}
```

#### 激活

```js
function patch(n1, n2, container, anchor) {
  // 省略部分代码

  // 描述的是组件 无论是有状态组件还是函数式组件
  else if (typeof type === 'object' || typeof type === 'function') {
    if (!n1) {
      if (n2.keptAlive) {
        n2.keepAliveInstance._activate(n2, container, anchor)
      } else {
        mountComponent(n2, container, anchor)
      }
    } else {
      patchComponent(n1, n2, anchor)
    }
  }
  
  // 省略部分代码
}
```

### 完整实现

```js
const KeepAlive = {
  // KeepAlive 组件独有的属性，用作标识
  __isKeepAlive: true,
  setup(props, { slots }) {
    // 创建一个缓存对象
    // key: vnode.type
    // value: vnode
    const cache = new Map()
    // 当前 KeepAlive 组件的实例
    const instance = currentInstance
    // 对于 KeepAlive 组件来说，它的实例上存在特殊的 keepAliveCtx 对象，该对象由渲染器注入
    // 该对象会暴露渲染器的一些内部方法，其中 move 函数用来将一段 DOM 移动到另一个容器中
    const { move, createElement } = instance.keepAliveCtx

    // 创建隐藏容器
    const storageContainer = createElement('div')

    // KeepAlive 组件的实例上会被添加两个内部函数，分别是 _deActivate 和 _activate
    // 这两个函数会在渲染器中被调用
    instance._deActivate = (vnode) => {
      move(vnode, storageContainer)
    }
    instance._activate = (vnode, container, anchor) => {
      move(vnode, container, anchor)
    }

    return () => {
      // KeepAlive 的默认插槽就是要被 KeepAlive 的组件
      let rawVNode = slots.default()
      // 如果不是组件，直接渲染即可，因为非组件的虚拟节点无法被 KeepAlive
      if (typeof rawVNode.type !== 'object') {
        return rawVNode
      }

      // 在挂载时先获取缓存的组件 vnode
      const cachedVNode = cache.get(rawVNode.type)
      if (cachedVNode) {
        // 如果有缓存的内容，则说明不应该执行挂载，而应该执行激活
        // 继承组件实例
        rawVNode.component = cachedVNode.component
        // 在 vnode 上添加 keptAlive 属性，标记为 true，避免渲染器重新挂载它
        rawVNode.keptAlive = true
      } else {
        // 如果没有缓存，则将其添加到缓存中，这样下次激活组件时就不会执行新的挂载动作了
        cache.set(rawVNode.type, rawVNode)
      }

      // 在组件 vnode 上添加 shouldKeepAlive 属性，并标记为 true，避免渲染器真的将组件卸载
      rawVNode.shouldKeepAlive = true
      // 将 KeepAlive 组件的实例也添加到 vnode 上，以便在渲染器中访问
      rawVNode.keepAliveInstance = instance

      // 渲染组件 vnode
      return rawVNode
    }
  }
}
```
