# 实现 Teleport 组件

## 逻辑分离

Teleport 组件的实现需要渲染器的支持，为避免渲染器膨胀，可以将 Teleport 组件从渲染器分离出来，由 TeleportImpl 组件实现。


```js
else if (typeof type === 'object' && type.__isTeleport) {
  type.process(n1, n2, container, anchor, {
    patch,
    patchChildren,
    unmount,
    move(vnode, container, anchor) {
      insert(vnode.component.subTree ? vnode.component.subTree.el : vnode.el, container, anchor)
    }
  })
}
```


## 定义

```js
const Teleport = {
  __isTeleport: true,
  process(n1, n2, container, anchor, internals) {
    // 在这里处理渲染逻辑
  }
}
```

## 使用

```html
<Teleport to="body">
  <h1>Title</h1>
  <p>content</p>
</Teleport>
```

## 虚拟 dom 结构

### 一般组件子节点处理方式

对于一般组件，它的子节点一般被编译为插槽对象，如下所示：

```js
// 父组件的渲染函数
function render() {
  return {
    type: MyComponent,
    // 组件的 children 会被编译成一个对象
    children: {
      default() {
        return { type: 'h1', children: '我是子节点' }
      }
    }
  }`
}
```

插槽对象会在 setup 上下文 和 渲染上下文中被暴露到 $slots 上，并且可以通过 slots 对象访问它们。

### Teleport 组件子节点处理方式

对于 Teleport 组件，它的子节点被编译为一个数组，如下所示：

```js
function render() {
  return {
    type: Teleport,
    // 以普通 children 的形式代表被 Teleport 的内容
    children: [
      { type: 'h1', children: 'Title' },
      { type: 'p', children: 'content' }
    ]
  }
}
```
## 实现

### 挂载

通过 n2.props.to 取得挂载点，将 n2.children patch 到指定挂载点即可。

```js
const Teleport = {
  __isTeleport: true,
  process(n1, n2, container, anchor, internals) {
    const { patch,patchChildren } = internals
    if (!n1) {
      const target = typeof n2.props.to === 'string'
        ? document.querySelector(n2.props.to)
        : n2.props.to
      n2.children.forEach(c => patch(null, c, target, anchor))
    } else {
      /// ...
    }
  }
}
```

### 更新

1. 先对新旧的 children 调用 patchChildren 函数 
2. 再判断新旧挂载点是否不同，如果不同则执行移动到新挂载点

```js
const Teleport = {
  __isTeleport: true,
  process(n1, n2, container, anchor, internals) {
    const { patch, patchChildren } = internals
    if (!n1) {
     /// ...
    } else {
      patchChildren(n1, n2, container)

      if (n2.props.to !== n1.props.to) {
        const newTarget = typeof n2.props.to === 'string'
          ? document.querySelector(n2.props.to)
          : n2.props.to
        n2.children.forEach(c => move(c, newTarget))
      }
    }
  }
}
```

## 不足

当前的 move 函数仅仅处理了 `组件` 和 `普通节点` 的移动。

```js
move(vnode, container, anchor) {
  insert(vnode.component.subTree ? vnode.component.subTree.el : vnode.el, container, anchor)
}
```


但是 vnode 有很多种类型，包括 `Fragment`、`Text` 等。

完整的实现需要考虑所有这些节点的移动逻辑。

