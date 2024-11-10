function Render(obj, root) {
    var dom = document.createElement(obj.tag);
    root.appendChild(dom);
    obj.children.forEach(function (child) {
        if (typeof child === 'string') {
            dom.appendChild(document.createTextNode(child));
        }
        else {
            Render(child, dom);
        }
    });
}
