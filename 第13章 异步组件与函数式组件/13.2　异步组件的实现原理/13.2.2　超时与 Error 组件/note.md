## 超时与 Error 组件

### api 设计

```js
const AsyncComp = defineAsyncComponent({
  loader: () => import('CompA.vue'),
  timeout: 2000, // 超时时长，其单位为 ms
  errorComponent: MyErrorComp // 指定出错时要渲染的组件
})
```

### 实现

开启一个定时器，在定时器结束后就表示出错，加载成功后要记住卸载定时器

```js
function defineAsyncComponent(options) {
  // options 可以是配置项，也可以是加载器
  if (typeof options === 'function') {
    // 如果 options 是加载器，则将其格式化为配置项形式
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
      // 代表是否超时，默认为 false，即没有超时
      const timeout = ref(false)

      let timer = null

      loader().then(c => {
        InnerComp = c
        loaded.value = true
        clearTimeout(timer)
      })

      if (options.timeout) {
        // 如果指定了超时时长，则开启一个定时器计时
        timer = setTimeout(() => {
          // 超时后将 timeout 设置为 true
          timeout.value = true
        }, options.timeout)
      }
      // 包装组件被卸载时清除定时器
      onUmounted(() => clearTimeout(timer))

      // 占位内容
      const placeholder = { type: Text, children: '' }

      return () => {
        if (loaded.value) {
          // 如果组件异步加载成功，则渲染被加载的组件
          return { type: InnerComp }
        } else if (timeout.value) {
          // 如果加载超时，并且用户指定了 Error 组件，则渲染该组件
          return options.errorComponent ? { type: options.errorComponent } : placeholder
        }
        return placeholder
      }
    }
  }
}
```

### 错误传递

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
      // 定义 error，当错误发生时，用来存储错误对象
      const error = shallowRef(null)

      let timer = null

      loader()
        .then(c => {
          InnerComp = c
          loaded.value = true
          // 取消定时器
          clearTimeout(timer)
        })
        // 添加 catch 语句来捕获加载过程中的错误
        .catch((err) => error.value = err)

      if (options.timeout) {
        timer = setTimeout(() => {
          // 超时后创建一个错误对象，并复制给 error.value
          const err = new Error(`Async component timed out after ${options.timeout}ms.`)
          error.value = err
        }, options.timeout)
      }

      const placeholder = { type: Text, children: '' }

      return () => {
        if (loaded.value) {
          return { type: InnerComp }
        } else if (error.value && options.errorComponent) {
          // 只有当错误存在且用户配置了 errorComponent 时才展示 Error 组件，同时将 error 作为 props 传递
          return { type: options.errorComponent, props: { error: error.value } }
        } else {
          return placeholder
        }
      }
    }
  }
}
```
