// const { effect, ref } = VueReactivity

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
   * @param {*} n1 旧vnode
   * @param {*} n2 新vnode
   * @param {*} container 
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

  // 双端 diff
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

  //快速 diff
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
    } else if (j > newEnd && j <= oldEnd) {
      // 删除
      while (j <= oldEnd) {
        unmount(oldchildren[j++])
      }
    }
  }

  // 卸载
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

  function render(vnode, container) {
    if (vnode) {
      // 新的 vnode 与旧的 vnode 进行对比
      patch(container._vnode, vnode, container)
    } else if (container._vnode) {
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

