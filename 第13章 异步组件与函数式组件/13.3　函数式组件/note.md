## 函数式组件

### 定义

一个函数式组件本质就是一个返回虚拟 dom 的函数

```js
function MyComponent(props) {
  return { type: 'h1', children: props.title }
}
```

函数式组件没有状态，但可以接受props

```js
function MyComponent(props) {
  return { type: 'h1', children: props.title }
}

MyComponent.props = {
  title: String
}
```

### 实现

找有状态组件的基础上，只需要选择性的复用一些逻辑即可

需要注意的是，函数式组件没有自己的状态和生命周期

#### patch

vnode 的 type 为 对象时，为有状态组件，为函数时，为函数式组件

但对于 patch 函数来说，都调用 mountComponent 和 patchComponent 进行处理

```js
function patch(n1, n2, container, anchor) {
  if (n1 && n1.type !== n2.type) {
    unmount(n1)
    n1 = null
  }

  const { type } = n2

  if (typeof type === 'string') {
    // 省略部分代码
  } else if (type === Text) {
    // 省略部分代码
  } else if (type === Fragment) {
    // 省略部分代码
  } else if (
    // type 是对象 --> 有状态组件
    // type 是函数 --> 函数式组件
    typeof type === 'object' || typeof type === 'function'
  ) {
    // component
    if (!n1) {
      mountComponent(n2, container, anchor)
    } else {
      patchComponent(n1, n2, anchor)
    }
  }
}
```

#### mountComponent

函数式组件的挂载仅需要复用 mountComponent函数，对 vnode.type 这个参数做适配即可，复用 有状态组件的逻辑

```js
function mountComponent(vnode, container, anchor) {
  // 检查是否是函数式组件
  const isFunctional = typeof vnode.type === 'function'

  let componentOptions = vnode.type
  if (isFunctional) {
    // 如果是函数式组件，则将 vnode.type 作为渲染函数，将 vnode.type.props 作为 props 选项定义即可
    componentOptions = {
      render: vnode.type,
      props: vnode.type.props
    }
  }

  // 省略部分代码
}
```
