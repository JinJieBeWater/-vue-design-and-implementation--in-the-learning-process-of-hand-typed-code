# props 与组件的被动更新

## props

### 两种类型 
vue3 的组件中，需要区分两种类型的 props：

- 为组件传递的 props，即组件的 vnode.props 属性，可由消费者传入任意的值
- 组件选项定义的 props 选项，即组件的 MyComponent.props 属性，在定义组件时就确定下来

### 解析 props

对于没有在组件选项中定义的 props，vue3 会将它们视为 attrs，即组件的 vnode.attrs

通过 resolveProps 函数解析 props
```js
function resolveProps(options, propsData) {
  const props = {}
  const attrs = {}
  for (const key in propsData) {
    if (key in options) {
      props[key] = propsData[key]
    } else {
      attrs[key] = propsData[key]
    }
  }

  return [props, attrs]
}
```

### 挂载到组件实例

为组件实例添加 props 属性，并将其设置为 shallowReactive 响应式数据

当后续组件更新时，props 发生变化时，会触发组件更新

只进行浅层响应式处理，因为 props 是只读的

```js
const [props, attrs] = resolveProps(propsOption, vnode.props)

// 定义组件实例
const instance = {
  state,
  props: shallowReactive(props),
  isMounted: false,
  subTree: null,
}
```


## 组件的被动更新

### 定义

当组件的父组件进行自更新时，会对子组件进行被动更新，在 patch 中调用 patchComponent 函数

### patchComponent

patchComponent 函数主要完成以下工作：

```Mermaid
flowchart TD
    A[开始组件更新] --> B{判断props是否变化}
    B -->|是 需要更新| C[重新构造新的props]
    B -->|否| D[结束更新]
    C --> E[更新props]
    C --> F[更新其他内容]
    E --> D
    F --> D

```

以下只实现了更新 props 的逻辑

note: 判断是否需要更新，通过新旧 vnode 上的 props 进行比较
```js
function hasPropsChanged(prevProps, nextProps) {
  const nextKeys = Object.keys(nextProps)

  if (nextKeys.length !== Object.keys(prevProps).length) {
    return true
  }

  for (let i = 0;i < nextKeys.length;i++) {
    const key = nextKeys[i]
    if (nextProps[key] !== prevProps[key]) return true
  }

  return false
}


function patchComponent(n1, n2, anchor) {
    const instance = (n2.component = n1.component)

    const { props } = instance

    if (hasPropsChanged(n1.props, n2.props)) {
      const [nextProps] = resolveProps(n2.type.props, n2.props)
      for (const k in nextProps) {
        props[k] = nextProps[k]
      }
      for (const k in props) {
        if (!(k in nextProps)) delete props[k]
      }
    }
  }
```

## 渲染上下文

组件的渲染函数及生命周期需要通过 this 访问组件的状态与数据. 创建一个渲染上下文对象, 将其作为 this 的值传递给组件渲染函数与生命周期函数

```js
// 渲染上下文
const renderContext = new Proxy(instance, {
  get(t, k, r) {
    const { state, props } = t
    if (state && k in state) {
      return state[k]
    }
    else if (k in props) {
      return props[k]
    } else {
      console.error('不存在')
    }
  },
  set(t, k, v, r) {
    const { state, props } = t
    if (state && k in state) {
      state[k] = v
    } else if (k in props) {
      console.warn(`Attempting to mutate prop ${k}. Props are readonly.`)
    } else {
      console.error('不存在')
    }
  },
})

// created 钩子
created && created().call(renderContext)
```
