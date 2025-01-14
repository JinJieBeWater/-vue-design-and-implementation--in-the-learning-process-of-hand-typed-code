const { effect, ref, reactive, shallowReactive } = VueReactivity

/**
 * 获取数组的最长递增子序列的索引数组
 * 使用贪心 + 二分查找算法求解
 * 时间复杂度 O(nlogn)，空间复杂度 O(n)
 * @param {Array<number>} arr - 输入数组
 * @returns {Array<number>} - 最长递增子序列中元素在原数组中的索引
 */
function getSequence(arr) {
  const p = arr.slice()
  const result = [0]
  let i, j, u, v, c
  const len = arr.length
  for (i = 0;i < len;i++) {
    const arrI = arr[i]
    if (arrI !== 0) {
      j = result[result.length - 1]
      if (arr[j] < arrI) {
        p[i] = j
        result.push(i)
        continue
      }
      u = 0
      v = result.length - 1
      while (u < v) {
        c = ((u + v) / 2) | 0
        if (arr[result[c]] < arrI) {
          u = c + 1
        } else {
          v = c
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1]
        }
        result[u] = i
      }
    }
  }
  u = result.length
  v = result[u - 1]
  while (u-- > 0) {
    result[u] = v
    v = p[v]

  }
  return result
}

/**
 * 解析组件的props和attrs属性
 * 将组件定义的props选项与传入的props数据进行匹配
 * 匹配的属性存入props对象，未匹配的存入attrs对象
 * @param {Object} options - 组件定义的props选项
 * @param {Object} propsData - 传递给组件的props数据
 * @returns {Array} - 返回包含props和attrs的数组 [props, attrs]
 */
function resolveProps(options, propsData) {
  const props = {}
  const attrs = {}
  for (const key in propsData) {
    if (key in options || key.startsWith('on')) {
      props[key] = propsData[key]
    } else {
      attrs[key] = propsData[key]
    }
  }

  return [props, attrs]
}

// 全局变量，存储当前正在被初始化的组件实例
let currentInstance = null
// 该方法接收组件实例作为参数，并将该实例设置为 currentInstance
function setCurrentInstance(instance) {
  currentInstance = instance
}

function createRenderer(options) {

  // 通过options得到操作 dom 的方法, 实现平台分离
  const {
    createElement,
    setElementText,
    createText,
    setText,
    insert,
    patchProp,
  } = options

  /**
   * 更新或挂载虚拟节点
   * @param {Object|null} n1 - 旧的虚拟节点，首次渲染时为null
   * @param {Object} n2 - 新的虚拟节点
   * @param {Element} container - 容器元素
   * @param {Element|null} anchor - 锚点元素，用于指定插入位置
   */
  function patch(n1, n2, container, anchor) {
    // n1存在 并且 vnode 描述内容 不相同则卸载
    if (n1 && n1.type !== n2.type) {
      unmount(n1)
      n1 = null
    }

    // 到这里时 新的 vnode 与旧的 vnode 描述的内容相同
    const type = n2.type
    // 描述的是元素
    if (typeof type === 'string') {
      // 如果旧的 vnode 不存在 则挂载
      if (!n1) {
        // 挂载
        mountElement(n2, container, anchor)
      } else {
        // 打补丁
        patchElement(n1, n2, container)
      }
    }
    // 描述的是组件
    else if (typeof type === 'object') {
      if (!n1) {
        mountComponent(n2, container, anchor)
      } else {
        patchComponent(n1, n2, anchor)
      }
    }
    // 描述的文本节点
    else if (type === Text) {
      // 如果旧的 vnode 不存在 则挂载
      if (!n1) {
        const el = n2.el = createText(n2.children)
        insert(el, container)
      }
      // 旧的 vnode 存在 更新文本节点
      else {
        const el = n2.el = n1.el
        if (n2.children !== n1.children) {
          setText(el, n2.children)
        }
      }
    }
    // Fragment 节点
    else if (type === Fragment) {
      // 如果旧的 vnode 不存在 则挂载
      if (!n1) {
        // 挂载
        n2.children.forEach(c => patch(null, c, container))
      }
      // 旧的 vnode 存在 更新 Fragment 节点
      else {
        // 更新 Fragment 节点
        patchChildren(n1, n2, container)
      }
    }

  }

  /**
   * 挂载元素节点
   * @param {Object} vnode - 虚拟节点
   * @param {Element} container - 容器元素
   * @param {Element|null} anchor - 锚点元素，用于指定插入位置
   */
  function mountElement(vnode, container, anchor) {
    // 创建dom
    // 在vnode上与真实dom进行关联
    const el = vnode.el = createElement(vnode.type)

    if (typeof vnode.children === 'string') {
      setElementText(el, vnode.children)
    } else if (Array.isArray(vnode.children)) {
      vnode.children.forEach(child => {
        patch(null, child, el)
      })
    }

    if (vnode.props) {
      for (const key in vnode.props) {
        patchProp(el, key, null, vnode.props[key])
      }
    }

    insert(el, container, anchor)
  }

  /**
   * 更新元素节点，包括更新props和子节点
   * @param {Object} n1 - 旧的虚拟节点
   * @param {Object} n2 - 新的虚拟节点
   * @param {Element} container - 容器元素
   */
  function patchElement(n1, n2, container) {
    const el = n2.el = n1.el
    const oldProps = n1.props
    const newProps = n2.props

    // 更新新的 props
    for (const key in newProps) {
      if (newProps[key] !== oldProps[key]) {
        patchProp(el, key, oldProps[key], newProps[key])
      }
    }
    // 删除旧的 props
    for (const key in oldProps) {
      if (!(key in newProps)) {
        patchProp(el, key, oldProps[key], null)
      }
    }

    // 第二步: 更新子节点
    patchChildren(n1, n2, el)
  }

  /**
   * 更新新旧虚拟节点的子节点
   * @param {Object} n1 - 旧的虚拟节点
   * @param {Object} n2 - 新的虚拟节点  
   * @param {Element} container - 容器元素
   */
  function patchChildren(n1, n2, container) {
    // 新 children 是一个字符串 
    if (typeof n2.children === 'string') {
      // 如果旧节点是一组子节点 进行卸载
      if (Array.isArray(n1.children)) {
        n1.children.forEach(child => unmount(child))
      }
      setElementText(container, n2.children)
    }
    // 新 children 是一组子节点
    else if (Array.isArray(n2.children)) {
      // 旧节点是一组子节点
      if (Array.isArray(n1.children)) {
        // ... 核心 dom diff 
        patchKeyedChildren(n1, n2, container)

      } else {
        // 旧节点是一个字符串
        setElementText(container, '')
        n2.children.forEach(c => patch(null, c, container))
      }
    }
    // 新 children 没有子节点
    else {
      // 旧节点有子节点 进行逐个卸载
      if (Array.isArray(n1.children)) {
        n1.children.forEach(child => unmount(child))
      }
      // 旧节点是文本 清空
      else if (typeof n1.children === 'string') {
        setElementText(container, '')
      }
    }
  }

  /**
   * 双端 Diff 算法实现子节点的更新
   * 通过维护四个索引(新旧头尾)对节点进行比较，尽可能复用已有节点
   * 算法步骤:
   * 1. 新旧头部节点比较
   * 2. 新旧尾部节点比较
   * 3. 旧头部与新尾部比较
   * 4. 旧尾部与新头部比较
   * 5. 处理非理想情况(查找、新增、删除节点)
   * 6. 处理剩余节点
   * 
   * @param {Object} n1 - 旧的虚拟节点
   * @param {Object} n2 - 新的虚拟节点
   * @param {Element} container - 容器元素
   */
  function patchKeyedChildren(n1, n2, container) {
    const oldchildren = n1.children
    const newChildren = n2.children

    // 四个索引
    let oldStartIdx = 0
    let oldEndIdx = oldchildren.length - 1
    let newStartIdx = 0
    let newEndIdx = newChildren.length - 1


    // 四个索引指向的vnode
    let oldStartVNode = oldchildren[oldStartIdx]
    let oldEndVNode = oldchildren[oldEndIdx]
    let newStartVNode = newChildren[newStartIdx]
    let newEndVNode = newChildren[newEndIdx]

    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      // 旧头部节点为undefined 则该节点已被处理过
      if (!oldStartVNode) {
        oldStartVNode = oldchildren[++oldStartIdx]
      }
      // 旧尾部节点为undefined 则该节点已被处理过
      else if (!oldEndVNode) {
        oldEndVNode = oldchildren[--oldEndIdx]
      }
      // 旧头部节点与新头部节点
      else if (oldStartVNode.key === newStartVNode.key) {
        patch(oldStartVNode, newStartVNode, container)
        oldStartVNode = oldchildren[++oldStartIdx]
        newStartVNode = newChildren[++newStartIdx]
      }
      // 旧尾部节点与新尾部节点
      else if (oldEndVNode.key === newEndVNode.key) {
        patch(oldEndVNode, newEndVNode, container)
        oldEndVNode = oldchildren[--oldEndIdx]
        newEndVNode = newChildren[--newEndIdx]
      }
      // 旧头部节点与新尾部节点
      else if (oldStartVNode.key === newEndVNode.key) {
        patch(oldStartVNode, newEndVNode, container)
        insert(oldStartVNode.el, container, oldEndVNode.el.nextSibling)
        oldStartVNode = oldchildren[++oldStartIdx]
        newEndVNode = newChildren[--newEndIdx]
      }
      // 旧尾部节点与新头部节点
      else if (oldEndVNode.key === newStartVNode.key) {
        patch(oldEndVNode, newStartVNode, container)
        insert(oldEndVNode.el, container, oldStartVNode.el)
        oldEndVNode = oldchildren[--oldEndIdx]
        newStartVNode = newChildren[++newStartIdx]
      } else {
        // 未命中
        const idxInOld = oldchildren.findIndex(node => node.key === newStartVNode.key)
        // 找到可复用
        if (idxInOld > 0) {
          const vnodeTomove = oldchildren[idxInOld]
          patch(vnodeTomove, newStartVNode, container)
          insert(vnodeTomove.el, container, oldStartVNode.el)
          oldchildren[idxInOld] = undefined
        }
        // 未找到可复用 添加新的元素
        else {
          patch(null, newStartVNode, container, oldStartVNode.el)
        }
        newStartVNode = newChildren[++newStartIdx]
      }
    }

    // 循环结束检查索引值情况
    if (oldEndIdx < oldStartIdx && newStartIdx <= newEndIdx) {
      // 添加由于算法缺陷遗漏在头部的新元素
      for (let i = newStartIdx;i <= newEndIdx;i++) {
        patch(null, newChildren[i], container, oldStartVNode.el)
      }
    } else if (newEndIdx < newStartIdx && oldStartIdx <= oldEndIdx) {
      // 删除diff后未处理的旧节点
      for (let i = oldStartIdx;i <= oldEndIdx;i++) {
        unmount(oldchildren[i])
      }
    }
  }

  /**
   * 快速 Diff 算法实现子节点的更新
   * 该算法通过以下步骤优化更新性能:
   * 1. 预处理: 处理相同的前置和后置节点
   * 2. 特殊情况处理: 处理新增或删除的节点
   * 3. 未知序列处理:
   *    - 构建索引表进行节点复用
   *    - 计算最长递增子序列避免不必要的移动
   *    - 移动、新增或删除节点
   * 
   * @param {Object} n1 - 旧的虚拟节点
   * @param {Object} n2 - 新的虚拟节点
   * @param {Element} container - 容器元素
   */
  function patchKeyedChildren2(n1, n2, container) {
    const newChildren = n2.children
    const oldchildren = n1.children

    // 处理相同的前置节点
    let j = 0
    let oldVNode = oldchildren[j]
    let newVNode = newChildren[j]
    while (oldVNode && newVNode && oldVNode.key === newVNode.key) {
      patch(oldVNode, newVNode, container)
      j++
      newVNode = newChildren[j]
      oldVNode = oldchildren[j]
    }

    // 处理相同的后置节点
    let oldEnd = oldchildren.length - 1
    let newEnd = newChildren.length - 1
    oldVNode = oldchildren[oldEnd]
    newVNode = newChildren[newEnd]
    while (oldVNode && newVNode && oldVNode.key === newVNode.key) {
      patch(oldVNode, newVNode, container)
      oldEnd--
      newEnd--
      oldVNode = oldchildren[oldEnd]
      newVNode = newChildren[newEnd]
    }

    // 处理新增节点
    if (j > oldEnd && j <= newEnd) {
      const anchorIndex = newEnd + 1
      const anchor = anchorIndex < newChildren.length ? newChildren[anchorIndex].el : null
      while (j <= newEnd) {
        patch(null, newChildren[j++], container, anchor)
      }
    }
    // 处理删除节点
    else if (j > newEnd && j <= oldEnd) {
      // 删除
      while (j <= oldEnd) {
        unmount(oldchildren[j++])
      }
    }
    // 处理非理想情况
    else {
      const count = newEnd - j + 1
      const source = new Array(count)
      source.fill(-1)

      const oldStart = j
      const newStart = j

      let moved = false
      let pos = 0

      // 构造索引表
      const keyIndex = {}
      for (let i = newStart;i <= newEnd;i++) {
        keyIndex[newChildren[i].key] = i
      }

      // 更新过的节点数量
      let patched = 0
      // 遍历旧的一组节点中未处理的节点
      for (let i = oldStart;i <= oldEnd;i++) {
        const oldVNode = oldchildren[i]
        // 更新过的节点数量仍然小于需要更新的节点数量
        if (patched <= count) {
          // 在映射表中寻找可复用的节点 
          const k = keyIndex[oldVNode.key]
          // 找到可复用的节点代表处理完一个新节点
          if (k !== undefined) {
            // 可复用的节点
            const newVNode = newChildren[k]
            patch(oldVNode, newVNode, container)
            // 更新过的节点数量数量加一
            patched++
            // 更新映射表
            source[k - newStart] = i

            // 判断节点是否需要移动
            if (k < pos) {
              moved = true
            } else {
              pos = k
            }
          } else {
            unmount(oldVNode)
          }
        }
        // 已处理完所有新节点 剩下的旧节点卸载
        else {
          unmount(oldVNode)
        }
      }

      // 如果 moved 为 true 则需要移动
      if (moved) {
        // 计算最长递增子序列
        const seq = getSequence(source) // [0, 1] source中索引为0、1的节点不需要移动
        let s = seq.length - 1
        let i = count - 1
        // 从后向前遍历
        for (i;i >= 0;i--) {
          // 如果映射表中对应索引值为-1 代表未在旧节点中找到对应节点 需要新增
          if (source[i] === -1) {
            // 构造真实位置
            const pos = i + newStart
            // 获取节点
            const newVNode = newChildren[pos]
            // 获取下一个节点的位置
            const nextPos = pos + 1
            // 构造锚点
            const anchor = nextPos < newChildren.length ? newChildren[nextPos].el : null
            // 挂载
            patch(null, newVNode, container, anchor)
          }
          else if (i !== seq[s]) {
            // 需要移动
            // 构造真实位置
            const pos = i + newStart
            // 获取节点
            const newVNode = newChildren[pos]
            // 获取下一个节点的位置
            const nextPos = pos + 1
            // 构造锚点
            const anchor = nextPos < newChildren.length ? newChildren[nextPos].el : null
            // 移动 已经patch过 所以不需要再patch 直接移动即可
            insert(newVNode.el, container, anchor)
          }
          // i === seq[s] 则不需要移动 s指向下一个位置
          else {
            s--
          }
        }
      }
    }
  }

  /**
   * 卸载虚拟节点及其子节点
   * 如果是Fragment节点则只需处理其子节点
   * 如果是普通节点则从DOM树中移除对应的真实DOM元素
   * @param {Object} vnode - 要卸载的虚拟节点
   */
  function unmount(vnode) {
    // Fragment 节点本身并没有 el 元素 所以不能进行卸载 处理 children 即可
    if (vnode.type === Fragment) {
      vnode.children.forEach(c => unmount(c))
      return
    }

    // 常规节点卸载
    const parent = vnode.el.parentNode
    if (parent) {
      parent.removeChild(vnode.el)
    }
  }

  /**
 * 挂载组件
 * 负责组件的初始化、生命周期钩子调用和状态管理
 * 包括:
 * 1. 创建组件实例并初始化状态
 * 2. 处理props和attrs
 * 3. 调用生命周期钩子(beforeCreate/created/beforeMount/mounted等)
 * 4. 设置响应式更新机制
 * 
 * @param {Object} vnode - 组件的虚拟节点
 * @param {Element} container - 组件将被挂载的DOM容器
 * @param {Element|null} anchor - 插入位置的锚点元素
 */
  function mountComponent(vnode, container, anchor) {
    const componentOptions = vnode.type

    // 提取出 setup 选项
    const { render, data, props: propsOption, setup, beforeCreate, created, beforeMount, mounted, beforeUpdate, updated } = componentOptions

    // beforeCreate 钩子
    beforeCreate && beforeCreate()

    // 使数据响应式
    const state = data ? reactive(data()) : null

    const [props, attrs] = resolveProps(propsOption, vnode.props)

    // 定义组件实例
    const instance = {
      state,
      props: shallowReactive(props),
      isMounted: false,
      subTree: null,
      slots,
      // 在组件实例中添加 mounted 数组，用来存储通过 onMounted 函数注册的生命周期钩子函数
      mounted: []
    }

    function emit(event, ...payload) {
      // 根据约定对事件名称进行处理 例如 click => onClick
      const eventName = `on${event[0].toUpperCase() + event.slice(1)}`
      const handler = instance.props[eventName]
      if (handler) {
        handler(...payload)
      } else {
        console.error('事件不存在')
      }
    }

    // 获取插槽函数
    const slots = vnode.children || {}

    // setup 上下文
    const setupContext = { attrs, emit, slots }

    setCurrentInstance(instance)
    // 取得 setup 返回值
    const setupResult = setup(shallowReadonly(instance.props), setupContext)
    setCurrentInstance(null)

    // 存储 setup 返回的数据
    let setupState = null
    if (typeof setupResult === 'function') {
      if (render) console.error('setup 函数返回渲染函数，render 选项将被忽略')
      render = setupResult
    } else {
      setupState = setupResult
    }

    // 组件实例挂载到vnode上 方便后续使用
    vnode.component = instance

    // 渲染上下文
    const renderContext = new Proxy(instance, {
      get(t, k, r) {
        const { state, props, slots } = t

        if (k === '$slots') return slots

        // state 存在 则返回 state 中的值
        if (state && k in state) {
          return state[k]
        }
        // props 存在 则返回 props 中的值
        else if (k in props) {
          return props[k]
        }
        // setupState 存在 则返回 setupState 中的值
        else if (setupState && k in setupState) {
          return setupState[k]
        } else {
          console.error('不存在')
        }
      },
      set(t, k, v, r) {
        const { state, props } = t
        if (state && k in state) {
          state[k] = v
        } else if (k in props) {
          console.warn(`Attempting to mutate prop ${k}. Props are readonly.`)
        }
        else if (setupState && k in setupState) {
          setupState[k] = v
        }
        else {
          console.error('不存在')
        }
      },
    })

    // created 钩子
    created && created().call(renderContext)

    // 组件自更新
    effect(() => {
      const subTree = render().call(state, state)
      // 检查组件是否初次渲染
      if (!instance.isMounted) {
        // beforeMount 钩子
        beforeMount && beforeMount()
        // 初次挂载
        patch(null, subTree, container, anchor)
        instance.isMounted = true
        // mounted 钩子
        instance.mounted && instance.mounted.forEach(hook => hook.call(renderContext))

      }
      // patch
      else {
        // beforeUpdate 钩子
        beforeUpdate && beforeUpdate()
        // 更新
        patch(instance.subTree, subTree, container, anchor)
        // updated 钩子
        updated && updated()
      }
      instance.subTree = subTree
    }, {
      scheduler: queueJob
    })
  }

  /**
 * 比较新旧props是否发生变化
 * 通过比较props的数量和值来判断是否需要更新组件
 * @param {Object} prevProps - 旧的props对象
 * @param {Object} nextProps - 新的props对象
 * @returns {boolean} - 如果props发生变化返回true，否则返回false
 */
  function hasPropsChanged(prevProps, nextProps) {
    const nextKeys = Object.keys(nextProps)

    if (nextKeys.length !== Object.keys(prevProps).length) {
      return true
    }

    for (let i = 0;i < nextKeys.length;i++) {
      const key = nextKeys[i]
      if (nextProps[key] !== prevProps[key]) return true
    }

    return false
  }

  function patchComponent(n1, n2, anchor) {
    const instance = (n2.component = n1.component)

    const { props } = instance

    // 判断组件是否需要更新
    if (hasPropsChanged(n1.props, n2.props)) {
      // 需要更新
      // 重新解析新的虚拟dom的 props
      const [nextProps] = resolveProps(n2.type.props, n2.props)
      // 新增与修改 props
      for (const k in nextProps) {
        props[k] = nextProps[k]
      }
      // 删除不存在的 props
      for (const k in props) {
        if (!(k in nextProps)) delete props[k]
      }
    }
  }

  /**
   * 渲染虚拟节点到容器中，负责新旧节点的对比更新和卸载
   * @param {Object|null} vnode - 要渲染的虚拟节点，如果为null则表示要卸载
   * @param {Element} container - DOM容器元素
   */
  function render(vnode, container) {
    // 进行patch
    if (vnode) {
      // 新的 vnode 与旧的 vnode 进行对比
      patch(container._vnode, vnode, container)
    }
    // 卸载 清空容器
    else if (container._vnode) {
      // 卸载 清空容器
      // container.innerHTML = ''
      // 这样做不严谨 卸载时应该调用子节点的各个生命周期函数 或者 自定义指令等钩子

      unmount(vnode)
    }

    // 把旧的 vnode 存储到 container 上,以供下一次更新使用
    container._vnode = vnode
  }

  // 服务端渲染
  function hydrate(vnode, container) {
    // ...
  }

  return {
    render,
    hydrate,
  }
}

// 是否要设置为属性
function shouldSetAsProps(el, key, value) {
  // 特殊处理只读属性
  if (key === 'form' && el.tagName === 'INPUT') return false

  // ...

  // 兜底
  return key in el
}

// 实现平台分离
const optionsReallyNeeded = {
  createElement(tag) {
    return document.createElement(tag)
  },
  setElementText(el, text) {
    el.textContent = text
  },
  insert(el, parent, anchor = null) {
    parent.insertBefore(el, anchor)
  },
  createText(text) {
    return document.createTextNode(text)
  },
  setText(node, text) {
    node.nodeValue = text
  },
  patchProp(el, key, prevValue, nextValue) {
    // vue 3 中 对于 class 进行了特殊处理 但最终到此时会序列化成一串字符串
    // 有三种方式设置class el.className = 'foo' el.setAttribute('class', 'foo') el.classList.add('foo')
    // el.className 是性能最好的

    // 事件
    if (/^on/.test(key)) {
      // 事件
      let invoker = el._evi
      const name = key.slice(2).toLowerCase()
      if (nextValue) {
        if (!invoker) {
          // 如果没有 invoker 创建一个伪造的 invoker 缓存到 e.l._evi
          invoker = el._evi = (e) => {
            // e.timeStamp 是事件触发的时间戳
            // 如果事件发生时间早于事件处理函数绑定时间戳 则不执行事件处理函数
            if (e.timeStamp < invoker.attached) return

            if (Array.isArray(invoker.value)) {
              invoker.value.forEach(fn => fn(e))
            } else {
              invoker.value(e)
            }
          }

          invoker.value = nextValue
          // 缓存事件处理函数绑定的时间戳
          invoker.attached = performance.now()

          el.addEventListener(name, invoker)
        }
      } else {
        el.removeEventListener(name, invoker)
      }
    } else
      // 由这里可见得 vnode的属性与真实dom的元素属性的数据结构不总是一致
      if (key === 'class') {
        el.className = nextValue || ''
      } else
        if (shouldSetAsProps(el, key, nextValue)) {
          // 判断属性的类型
          const type = typeof el[key]
          // 如果是布尔值 并且值为空字符串 则将其设置为true
          if (type === 'boolean' && nextValue === '') {
            el[key] = true
          } else {
            el[key] = value
          }
        } else {
          el.setAttribute(key, nextValue)
        }
  }
}

const Text = Symbol('Text')
const Comment = Symbol('Comment')
const Fragment = Symbol('Fragment')

const renderer = createRenderer(optionsReallyNeeded)
