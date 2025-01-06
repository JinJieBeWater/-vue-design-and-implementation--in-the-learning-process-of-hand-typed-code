# 12.6 组件事件与 emit 的实现

## 约定

用户可以自定义事件

```html
<MyComponent @change="handleChange" />
```

但在内部，vue 会约定的将事件名称转换为 onXxx 的形式。

```js
const MyComponent = {
  type: 'MyComponent',
  props: {
    onChange: handleChange,
  },
}
```

## emit

emit 函数实际上是根据事件名称去 props 中查找对应的处理函数并执行。

```js
function emit(event, ...payload) {
  // 根据约定对事件名称进行处理 例如 click => onClick
  const eventName = `on${event[0].toUpperCase() + event.slice(1)}`
  const handler = instance.props[eventName]
  if (handler) {
    handler(...payload)
  } else {
    console.error('事件不存在')
  }
}
```

## 解析 props

在之前的 resolveProps 函数中，解析到的 props 如果没有显式声明，那么会默认添加到 attrs 中。

现在对于 onXxx 的事件，没有显式声明，也默认添加到 props 中。

```js
for (const key in propsData) {
  if (key in options || key.startsWith('on')) {
    props[key] = propsData[key]
  } else {
    attrs[key] = propsData[key]
  }
}
