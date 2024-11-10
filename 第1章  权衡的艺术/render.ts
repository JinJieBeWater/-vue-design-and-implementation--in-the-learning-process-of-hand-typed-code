type Dom = {
  tag: string,
  children: Array<Dom | string>
}


function Render(obj: Dom, root: HTMLElement) {
  const dom = document.createElement(obj.tag)
  root.appendChild(dom)
  obj.children.forEach(child => {
    if (typeof child === 'string') {
      dom.appendChild(document.createTextNode(child))
    } else {
      Render(child, dom)
    }
  })
}
