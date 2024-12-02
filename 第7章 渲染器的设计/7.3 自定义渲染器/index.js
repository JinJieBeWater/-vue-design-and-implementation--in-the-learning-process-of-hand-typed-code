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
    if (typeof vnode.children === 'string') {
      setElementText(el, vnode.children)
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

// const renderer = createRenderer(optionsReallyNeeded)

// const vnode = {
//   type: 'h1',
//   children: 'hello world'
// }

// renderer.render(vnode, document.querySelector('#app'))


const optionsForLog = {
  createElement(tag) {
    console.log(`创建元素: ${tag}`)
    return { tag }
  },
  setElementText(el, text) {
    console.log(`设置${JSON.stringify(el)}的文本内容: ${text}`)
    el.textContent = text
  },
  insert(el, parent, anchor = null) {
    console.log(`将${JSON.stringify(el)}添加到${JSON.stringify(parent)}下`)
    parent.children = el
  }
}

const renderer = createRenderer(optionsForLog)

const vnode = {
  type: 'h1',
  children: 'hello world'
}

const container = {
  type: 'root'
}

renderer.render(vnode, container)
