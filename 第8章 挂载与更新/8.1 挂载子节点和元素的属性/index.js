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
    const el = createElement(vnode.type)

    if (vnode.props) {
      for (const key in vnode.props) {
        // 1. el.setAttribute(key, vnode.props[key])
        // 2. el[key] = vnode.props[key]
        // 不管使用哪种方法 都有问题
        // 当key为disabled时 如果值是false 即 el.setAttribute('disabled', false) 会出现异常
        // 因为 false 就是一个字符串 不是布尔值 转换后反而变成了真值 使disabled属性生效

        if (key in el) {
          if (type === 'boolean' && value === '') {
            el[key] = true
          } else {
            el[key] = vnode.props[key]
          }
        } else {
          el.setAttribute(key, vnode.props[key])
        }
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

  function render(vnode, container) {
    if (vnode) {
      patch(container._vnode, vnode, container)
    } else if (container._vnode) {
      container.innerHTML = ''
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

const optionsReallyNeeded = {
  createElement(tag) {
    return document.createElement(tag)
  },
  setElementText(el, text) {
    el.textContent = text
  },
  insert(el, parent, anchor = null) {
    parent.insertBefore(el, anchor)
  }
}

const renderer = createRenderer(optionsReallyNeeded)

const vnode = {
  type: 'div',
  props: {
    id: 'foo'
  },
  children: [
    {
      type: 'p',
      children: 'hello'
    }
  ]
}

renderer.render(vnode, document.querySelector('#app'))
