# 13.1 异步组件要解决的问题

## 基本概念

### 同步组件

```js
import App from './App.vue'
createApp(App).mount('#app')
```

### 异步组件

异步加载的组件

```js
const loader = () => import('App.vue')
loader().then(App => {
  createApp(App).mount('#app')
})
```

## 基本实现

异步组件的实现原理非常简单，就是利用了 ES6 的 `import()` 语法，将异步组件的加载过程从同步变成异步。

并且利用元组件 component的`is`属性，渲染动态组件。

```html
<template>
  <CompA />
  <component :is="asyncComp" />
</template>
<script>
import { shallowRef } from 'vue'
import CompA from 'CompA.vue'

export default {
  components: { CompA },
  setup() {
    const asyncComp = shallowRef(null)

    // 异步加载 CompB 组件
    import('CompB.vue').then(CompB => asyncComp.value = CompB)

    return {
      asyncComp
    }
  }
}
</script>
```

## 要解决的问题

- 异步组件加载失败或超时，是否渲染 error 组件
- 是否渲染占位符组件
- 如何避免 Loading 组件和正确组件在极短时间切换造成的闪烁
  - 如果组件在 200ms 内没有加载成功，才渲染 Loading 组件
- 加载失败后，是否重试

## vue3 框架支持

- 允许指定加载失败时要渲染的组件
- 允许用户指定 loading 组件，以及展示改组件的延时时间
- 允许用户设置加载组件的超时时间
- 组件加载失败后提供重试能力
