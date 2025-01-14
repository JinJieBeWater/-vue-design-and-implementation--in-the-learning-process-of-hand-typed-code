## 延迟与 Loading 组件

### api 设计

```js
defineAsyncComponent({
  loader: () => new Promise(r => { /* ... */ }),
  // 延迟 200ms 展示 Loading 组件
  delay: 200,
  // Loading 组件
  loadingComponent: {
    setup() {
      return () => {
        return { type: 'h2', children: 'Loading...' }
      }
    }
  }
})
```

### 实现

```js
function defineAsyncComponent(options) {
  if (typeof options === 'function') {
    options = {
      loader: options
    }
  }

  const { loader } = options

  let InnerComp = null

  return {
    name: 'AsyncComponentWrapper',
    setup() {
      const loaded = ref(false)
      const error = shallowRef(null)
      // 一个标志，代表是否正在加载，默认为 false
      const loading = ref(false)

      let loadingTimer = null
      // 如果配置项中存在 delay，则开启一个定时器计时，当延迟到时后将 loading.value 设置为 true
      if (options.delay) {
        loadingTimer = setTimeout(() => {
          loading.value = true
        }, options.delay);
      } else {
        // 如果配置项中没有 delay，则直接标记为加载中
        loading.value = true
      }
      loader()
        .then(c => {
          InnerComp = c
          loaded.value = true
        })
        .catch((err) => error.value = err)
        .finally(() => {
          loading.value = false
          // 加载完毕后，无论成功与否都要清除延迟定时器
          clearTimeout(loadingTimer)
        })

      let timer = null
      if (options.timeout) {
        timer = setTimeout(() => {
          const err = new Error(`Async component timed out after ${options.timeout}ms.`)
          error.value = err
        }, options.timeout)
      }

      const placeholder = { type: Text, children: '' }

      return () => {
        if (loaded.value) {
          return { type: InnerComp }
        } else if (error.value && options.errorComponent) {
          return { type: options.errorComponent, props: { error: error.value } }
        } else if (loading.value && options.loadingComponent) {
          // 如果异步组件正在加载，并且用户指定了 Loading 组件，则渲染 Loading 组件
          return { type: options.loadingComponent }
        } else {
          return placeholder
        }
      }
    }
  }
}
```

### 组件卸载支持

```js
function unmount(vnode) {
  if (vnode.type === Fragment) {
    vnode.children.forEach(c => unmount(c))
    return
  } else if (typeof vnode.type === 'object') {
    // 对于组件的卸载，本质上是要卸载组件所渲染的内容，即 subTree
    unmount(vnode.component.subTree)
    return
  }
  const parent = vnode.el.parentNode
  if (parent) {
    parent.removeChild(vnode.el)
  }
}
```
