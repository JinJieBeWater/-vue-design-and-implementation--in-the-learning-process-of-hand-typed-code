let div = document.createElement('div')
div.innerHTML = '<div>123</div>'

let invoker = function (e) {
  invoker.value(e)
}

invoker.value = (e) => {
  console.log(e)
}

invoker()
