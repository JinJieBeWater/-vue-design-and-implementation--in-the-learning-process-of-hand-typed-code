## 重试机制

异步组件加载失败后的重试机制，与请求服务端接口失败后的重试机制一样

### api 设计

```js
defineAsyncComponent({
  loader: () => new Promise(r => { /* ... */ }),
  // 延迟 200ms 展示 Loading 组件
  onError: (retry, fail, retries) => {
    if (retries < 3) {
      retry()
    } else {
      fail()
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

  // 记录重试次数
  let retries = 0
  // 封装 load 函数用来加载异步组件
  function load() {
    return loader()
      // 捕获加载器的错误
      .catch((err) => {
        // 如果用户指定了 onError 回调，则将控制权交给用户
        if (options.onError) {
          // 返回一个新的 Promise 实例
          return new Promise((resolve, reject) => {
            // 重试
            const retry = () => {
              resolve(load())
              retries++
            }
            // 失败
            const fail = () => reject(err)
            // 作为 onError 回调函数的参数，让用户来决定下一步怎么做
            options.onError(retry, fail, retries)
          })
        } else {
          throw error
        }
      })
  }

  return {
    name: 'AsyncComponentWrapper',
    setup() {
      const loaded = ref(false)
      const error = shallowRef(null)
      const loading = ref(false)

      let loadingTimer = null
      if (options.delay) {
        loadingTimer = setTimeout(() => {
          loading.value = true
        }, options.delay);
      } else {
        loading.value = true
      }
      // 调用 load 函数加载组件
      load()
        .then(c => {
          InnerComp = c
          loaded.value = true
        })
        .catch((err) => {
          error.value = err
        })
        .finally(() => {
          loading.value = false
          clearTimeout(loadingTimer)
        })

      // 省略部分代码
    }
  }
}
```
