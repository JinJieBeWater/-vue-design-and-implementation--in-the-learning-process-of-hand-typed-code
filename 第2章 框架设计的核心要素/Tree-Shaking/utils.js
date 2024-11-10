export function foo(obj) {
  console.log('foo')

  obj && console.log(obj.foo)

}

export function bar(obj) {
  obj && obj.bar
}
