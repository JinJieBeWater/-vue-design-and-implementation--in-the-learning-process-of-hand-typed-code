# Teleport 组件的实现原理

## Teleport 组件要解决的问题

```html
<template>
  <div id="box" style="z-index: -1;">
    <Overlay />
  </div>
</template>
```

以上代码中，Overlay 是一个蒙层组件，用于遮挡其他内容。

但由于所在 dom 中上级元素的 z-index 值较低，因此 Overlay 组件哪怕设置 z-index 为 100，也会被遮挡。

为了解决这个问题，只能将 Overlay 组件放在其他位置，例如在 body 中。


