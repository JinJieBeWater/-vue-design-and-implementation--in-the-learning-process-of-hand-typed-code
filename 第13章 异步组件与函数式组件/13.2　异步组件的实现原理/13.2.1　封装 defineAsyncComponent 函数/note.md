# 13.2 异步组件的实现原理

## 13.2.1 defineAsyncComponent 函数

```html
01 <template>
02   <AsyncComp />
03 </template>
04 <script>
05 export default {
06   components: {
07     // 使用 defineAsyncComponent 定义一个异步组件，它接收一个加载器作为参数
08     AsyncComp: defineAsyncComponent(() => import('CompA'))
09   }
10 }
11 </script>
```

## 基本实现

```js
// defineAsyncComponent 函数用于定义一个异步组件，接收一个异步组件加载器作为参数
function defineAsyncComponent(loader) {
  // 一个变量，用来存储异步加载的组件
  let InnerComp = null
  // 返回一个包装组件
  return {
    name: 'AsyncComponentWrapper',
    setup() {
      // 异步组件是否加载成功
      const loaded = ref(false)
      // 执行加载器函数，返回一个 Promise 实例
      // 加载成功后，将加载成功的组件赋值给 InnerComp，并将 loaded 标记为 true，代表加载成功
      loader().then(c => {
        InnerComp = c
        loaded.value = true
      })

      return () => {
        // 如果异步组件加载成功，则渲染该组件，否则渲染一个占位内容
        return loaded.value ? { type: InnerComp } : { type: Text, children: '' }
      }
    }
  }
}
```
