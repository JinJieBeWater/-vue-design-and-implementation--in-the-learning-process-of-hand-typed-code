// const { effect, ref } = VueReactivity

function createRenderer(options) {

  // 通过options得到操作 dom 的方法, 实现平台分离
  const {
    createElement,
    setElementText,
    insert,
  } = options

  // 打补丁或者直接挂载
  function patch(n1, n2, container) {
    if (!n1) {
      // 挂载
      mountElement(n2, container)
    } else {
      // 打补丁
    }
  }

  function mountElement(vnode, container) {
    // 创建dom
    // 在vnode上与真实dom进行关联
    const el = vnode.el = createElement(vnode.type)
    if (vnode.props) {
      for (const key in vnode.props) {
        // 打属性补丁
        patchProp(el, key, null, vnode.props[key])
      }
    }

    if (typeof vnode.children === 'string') {
      setElementText(el, vnode.children)
    } else if (Array.isArray(vnode.children)) {
      vnode.children.forEach(child => {
        patch(null, child, el)
      })
    }
    insert(el, container)
  }

  // 卸载
  function unmount(vnode) {
    const parent = vnode.el.parentNode
    if (parent) {
      parent.removeChild(vnode.el)
    }
  }

  function render(vnode, container) {
    if (vnode) {
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
  patchProp(el, key, prevValue, nextValue) {
    // vue 3 中 对于 class 进行了特殊处理 但最终到此时会序列化成一串字符串
    // 有三种方式设置class el.className = 'foo' el.setAttribute('class', 'foo') el.classList.add('foo')
    // el.className 是性能最好的

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

const renderer = createRenderer(optionsReallyNeeded)

const vnode = {
  type: 'div',
  props: {
    id: 'foo',
    class: normalizeClass([ //特殊处理
      'foo',
      {
        bar: true
      }
    ])
  },
  children: [
    {
      type: 'p',
      children: 'hello'
    }
  ]
}

renderer.render(vnode, document.querySelector('#app'))

// 卸载
renderer.render(null, document.querySelector('#app'))
