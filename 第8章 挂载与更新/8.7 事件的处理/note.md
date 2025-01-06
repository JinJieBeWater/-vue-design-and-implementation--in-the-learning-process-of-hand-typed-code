# 8.7 事件的处理

## 渲染器支持

在 patchProp 函数中，如果 key 以 on 开头，则说明是事件。

```js
patchProp(el, key, prevValue, nextValue) {
  if (/^on/.test(key)) {
    /** 省略 */
  }
  /** 省略 */
}
```

## invoker

通过使用 invoker 代理事件的执行，将 invoker 绑定为事件，事件修改时只需要修改 invoker 的值即可，不需要 dom 操作换绑。

```js
// 获取之前缓存的 invoker
let invoker = el._evi
const name = key.slice(2).toLowerCase()
// 如果 nextValue 存在，则添加或更新事件
if (nextValue) {
  // 如果 invoker 不存在，则创建 invoker
  if (!invoker) {
    invoker = el._evi = (e) => {
      invoker.value(e)
    }

    invoker.value = nextValue
    el.addEventListener(name, invoker)
  }
  else {
    invoker.value = nextValue
  }
}
// 如果 nextValue 不存在，则移除事件
else if (invoker) {
  el.removeEventListener(name, invoker)
}
```
