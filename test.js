function Animal(name) {
  this.name = name
}

Animal.prototype.data = { height: 100, weight: 100 }

let animal1 = new Animal('dog')
let animal2 = new Animal('cat')

console.dir(Animal.prototype === Function.prototype.__proto__)
console.dir(Animal.prototype.__proto__ === Object.prototype)
