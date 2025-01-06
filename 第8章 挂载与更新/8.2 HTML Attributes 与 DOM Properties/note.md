# HTML Attributes 与 DOM Properties

## HTML Attributes

指定义在 HTML 标签上的属性。

```html
<input id="my-input" type="text" value="foo" />
```

## DOM Properties

浏览器解析 HTML 标签，生成与之相符的 DOM 元素对象。

DOM 元素对象上的属性，称为 DOM Properties。

## 关联

很多 HTML Attributes 在 DOM 对象上都有与之对应的 DOM Properties。

但是名称不一定一样，如 class 与 className。

## 核心

**HTML Attributes 的作用是设置与之对应的DOM Properties 的初始值。**

```html
<input id="my-input" type="text" value="foo" />
```

当用户输入内容时，假设为 bar，将会更新 DOM Properties 的值。

```js
const input = document.querySelector('#my-input')
console.log(input.value) // bar
```

但是 HTML Attributes 的值并不会改变。

```js
console.log(input.getAttribute('value')) // foo
``` 
## 限制

浏览器对 HTML Attributes 有一定的限制。

如果 HTML Attributes 的值不合法，浏览器会使用内建的合法值。
