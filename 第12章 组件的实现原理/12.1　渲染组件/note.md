# 渲染组件

## 核心

类似渲染器渲染普通元素、text、fragment 虚拟节点，渲染组件的逻辑也类似，组件的虚拟节点的type为对象，对象中包含描述组件的选项。

## componentOptions

组件的虚拟dom
```js
const CompVNode = {
  type: MyComponent,
}

const MyComponent = {
  name: 'MyComponent',
  data() {
    return {
      foo: 'hello world',
    }
  },
  render() {
    return {
      type: 'div',
      children: `foo的值是: ${this.foo}`,
    }
  }
}
```

## 渲染器适配

渲染器需要适配组件 在 patch 中判断 type 为对象时调用 mountComponent 函数

```js
function mountComponent(vnode, container, anchor) {
    const componentOptions = vnode.type
    const { render } = componentOptions

    const subTree = render()
    patch(null, subTree, container, anchor)
  }
```
