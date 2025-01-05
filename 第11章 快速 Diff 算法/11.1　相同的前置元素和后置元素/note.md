## 快速 Diff 算法

### 核心

1. 先对相同的前置元素和后置元素进行比较，patch相同的前置元素和后置元素

2. 通过索引j与newEnd、oldEnd判断
   - j > oldEnd && j <= newEnd 处理新增节点
   - j > newEnd && j <= oldEnd 处理删除节点


