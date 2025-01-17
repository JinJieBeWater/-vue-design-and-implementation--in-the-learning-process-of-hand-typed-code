## 快速 Diff 算法

### 核心

1. 先对相同的前置元素和后置元素进行 patch 操作

2. 通过索引j与newEnd、oldEnd判断
   - j > oldEnd && j <= newEnd 则处理新增节点 
   - j > newEnd && j <= oldEnd 则处理删除节点

3. 处理非理想情况(新旧节点都有遗漏)
   1. 构建新节点key索引表 {key: index}
   2. 遍历旧节点组:
      1. 检查更新数量是否超限
         - 未超限: 继续处理
         - 已超限: 卸载多余节点
      2. 在key索引表中查找:
         - 找到: patch节点并记录位置
         - 未找到: 卸载节点
      3. 判断是否需要移动:
         - 需要: moved = true 
         - 不需要: 更新位置标记
  
### 图示


```mermaid
flowchart TD
    A[开始Diff] --> B[处理前置/后置节点]
    B --> C{索引边界判断}
    C -->|新节点有遗漏| D[新增节点]
    C -->|旧节点有遗漏| E[删除节点] 
    C -->|都有遗漏| F[复杂处理]
    F --> G[建立key索引表]
    G --> H[遍历旧节点]
    H --> I{更新数量检查}
    I -->|未超限| J{key查找}
    I -->|已超限| K[卸载多余]
    J -->|存在| L[更新并记录]
    J -->|不存在| M[卸载]
    L --> N{移动检查}
    N -->|需要| O[标记移动]
    N -->|不需要| P[更新位置]
```

