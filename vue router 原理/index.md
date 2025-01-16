# 路由原理

## 前言

vue 的路由有两种模式，hash 和 history

hash	主要是通过监听浏览器的hashchange事件来实现

history	主要是通过监听浏览器的popstate事件与History API来实现

## hash 模式

hash 地址的 URL 中带有#号，如：http://www.xxx.com/#/about，＃符号后面的 URL 部分为 hash 值 

可以通过 window.location.hash 获取 hash 值

```js
// 监听浏览器的hashchange事件，当hash值改变时，修改currentPath的值
window.addEventListener("hashchange", () => {
  currentPath.value = window.location.hash;
});
```
## history 模式

history	地址的 URL 为正常模式，如：http://www.xx.com/a/b/c

可以通过 window.location.pathname 获取 pathname 值

### popstate

当点击后退按钮或者在 JavaScript 中调用 history.back() 等方法时，会触发 popstate 事件

```js
// 监听浏览器的popstate事件，当history.back()或者history.forward()时，修改currentPath的值
window.addEventListener("popstate", () => {
  currentPath.value = window.location.pathname;
});
```

### history API

通过事件代理拦截 a 标签的点击事件，并且在 a 标签的 click 事件中，使用 history.pushState() 方法来更新 URL 地址

```js
// a标签点击事件的处理函数
function onPushState(e) {
  const target = e.target;
  const tagName = target.tagName.toLowerCase();
  if (tagName !== "a") return;
  //获取href属性的值
  const url = e.target.getAttribute("href");
  // 添加一条新的历史条目（修改地址栏中URL）
  history.pushState({}, "", url);
  // 给pathname重新赋值，会触发currentView计算属性重新计算，返回新的组件
  pathname.value = url;
}
```

## 组件切换

两种模式都需要维护一个当前路由的变量

以上面的代码为基准，在 hash 模式下是 currentPath，在 history 模式下是 pathname

该变量为有状态变量，在这个状态上通过计算属性查询路由表即可得到当前路由的组件

假设该计算属性为 currentComponent

可通过 动态组件 component 即可实现切换
```html
 <component :is="currentComponent" />```
