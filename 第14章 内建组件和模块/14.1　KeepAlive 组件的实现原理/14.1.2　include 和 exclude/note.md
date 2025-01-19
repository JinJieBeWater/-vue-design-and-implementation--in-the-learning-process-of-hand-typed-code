## include 和 exclude

默认情况下，KeepAlive 组件会将所有的组件缓存，并在挂载和卸载时对其进行管理

但是在某些情况下，我们可能希望只缓存某些组件，而不缓存其他组件

为了使用户自定义缓存规则，KeepAlive 组件提供了 include 和 exclude 属性

### API 设计

简化问题，只允许在 include 和 exclude 中使用正则表达式

```js
const KeepAlive = {
  __isKeepAlive: true,
  // 定义 include 和 exclude
  props: {
    include: RegExp,
    exclude: RegExp
  },
  setup(props, { slots }) {
    // 省略部分代码
  }
}
```

### 实现

```js
const cache = new Map()
const KeepAlive = {
  __isKeepAlive: true,
  props: {
    include: RegExp,
    exclude: RegExp
  },
  setup(props, { slots }) {
    // 省略部分代码

    return () => {
      let rawVNode = slots.default()
      if (typeof rawVNode.type !== 'object') {
        return rawVNode
      }
      // 获取“内部组件”的 name
      const name = rawVNode.type.name
      // 对 name 进行匹配
      if (
        name &&
        (
          // 如果 name 无法被 include 匹配
          (props.include && !props.include.test(name)) ||
          // 或者被 exclude 匹配
          (props.exclude && props.exclude.test(name))
        )
      ) {
        // 则直接渲染“内部组件”，不对其进行后续的缓存操作
        return rawVNode
      }

      // 省略部分代码
    }
  }
}
```
