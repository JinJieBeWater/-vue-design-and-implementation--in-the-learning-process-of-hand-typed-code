# 插槽的工作原理与实现

## 插槽的工作原理

### 插槽的声明

```html
<template>
  <header><slot name="header" /></header>
  <div>
    <slot name="body" />
  </div>
  <footer><slot name="footer" /></footer>
</template>
```

### 插槽的使用

```html
<MyComponent>
  <template #header>
    <h1>我是标题</h1>
  </template>
  <template #body>
    <section>我是内容</section>
  </template>
  <template #footer>
    <p>我是注脚</p>
  </template>
</MyComponent>
```

### 渲染函数

当组件使用了插槽时，插槽会被编译到 vnode 的 children 中，并被暴露在组件的渲染上下文中以供使用。

```js
// 父组件的渲染函数
function render() {
  return {
    type: MyComponent,
    // 组件的 children 会被编译成一个对象
    children: {
      header() {
        return { type: 'h1', children: '我是标题' }
      },
      body() {
        return { type: 'section', children: '我是内容' }
      },
      footer() {
        return { type: 'p', children: '我是注脚' }
      }
    }
  }`
}
```
