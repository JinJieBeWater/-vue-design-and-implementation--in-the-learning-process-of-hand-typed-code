const { effect, ref } = VueReactivity

function createRenderer() {
  // 打补丁或者直接挂载
  function patch(n1, n2, container) {
    // ...
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




const renderer = createRenderer()

const vnode = 'hello world'
renderer.render(vnode, document.querySelector('#app'))
