// const { effect, ref } = VueReactivity

function createRenderer(options) {

  // 通过options得到操作 dom 的方法, 实现平台分离
  const {
    createElement,
    setElementText,
    insert,
    patchProp,
    createText,
    setText
  } = options



  // 打补丁或者直接挂载
  function patch(n1, n2, container) {
    // n1 旧的 vnode
    // n2 新的 vnode
    // n1存在 并且vnode 所描述的内容是否相同 不相同 则卸载
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
        mountElement(n2, container)
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

  function mountElement(vnode, container) {
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

    insert(el, container)
  }

  function patchElement(n1, n2, container) {
    const el = n2.el = n1.el
    const oldProps = n1.props
    const newProps = n2.props

    // 第一步: 更新props 
    for (const key in newProps) {
      // 更新新的 props
      if (newProps[key] !== oldProps[key]) {
        patchProp(el, key, oldProps[key], newProps[key])
      }
    }
    for (const key in oldProps) {
      // 删除旧的 props
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

        n1.children.forEach(c => unmount(c))
        n2.children.forEach(c => patch(null, c, container))
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

const TextVNode = {
  type: Text,
  children: '我是文本'
}

const CommentVNode = {
  type: Comment,
  children: '我是注释'
}

const vnode = {
  type: 'ul',
  children: [
    {
      type: Fragment,
      children: [
        { type: 'li', children: '我是第一个子节点' },
        { type: 'li', children: '我是第二个子节点' },
        { type: 'li', children: '我是第三个子节点' },
      ]
    }
  ]
}
