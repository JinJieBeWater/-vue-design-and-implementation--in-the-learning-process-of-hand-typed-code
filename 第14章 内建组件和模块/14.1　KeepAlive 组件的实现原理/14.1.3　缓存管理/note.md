## 缓存管理

### 当前的实现

```js
// KeepAlive 组件的渲染函数中关于缓存的实现

// 使用组件选项对象 rawVNode.type 作为键去缓存中查找
const cachedVNode = cache.get(rawVNode.type)
if (cachedVNode) {
  // 如果缓存存在，则无须重新创建组件实例，只需要继承即可
  rawVNode.component = cachedVNode.component
  rawVNode.keptAlive = true
} else {
  // 如果缓存不存在，则设置缓存
  cache.set(rawVNode.type, rawVNode)
}
```

当前缓存不存在时，总会设置新的缓存，会导致缓存不断增加，极端情况下会占用大量内存

需要一个策略来设置一个缓存的阈值，当缓存达到阈值时，对缓存进行修剪

### 修剪策略

Vue 当前的缓存策略叫 “最新一次访问” LRU（Least Recently Used）

#### API 设计

```html
<KeepAlive :max="2">
  <component :is="dynamicComp"/>
</KeepAlive>
```

在 Vue 中，通过 set 结构会记住插入的顺序来模拟 LRU 策略

当未命中缓存时 **keys.add(key)**  

命中缓存时，清除再重新添加

```js
// make this key the freshest
keys.delete(key)
keys.add(key)
```

使 set 的顺序模拟 LRU 策略
