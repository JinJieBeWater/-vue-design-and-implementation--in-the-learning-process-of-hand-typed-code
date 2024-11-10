// 原有代码在分支切换的情况下存在部分副作用已经不需要, 但仍然会在副作用列表里面
const bucket = new WeakMap()

let activeEffect = null
const effectStack = []

function effect(fn) {
  const effectFn = () => {
    cleanup(effectFn)
    activeEffect = effectFn
    effectStack.push(effectFn)
    fn()
    effectStack.pop()
    activeEffect = effectStack[effectStack.length - 1]
  }
  effectFn.deps = []
  effectFn()
}

function cleanup(effectFn) {
  const deps = effectFn.deps
  if (!deps.length) return

  // 遍历deps，删除当前副作用函数
  deps.forEach(dep => {
    dep.delete(effectFn)
  })

  // 最后重置deps数组
  effectFn.deps.length = 0
}


// 跟踪添加依赖
function track(target, key) {
  // 没有正在作用的副作用函数
  if (!activeEffect) return

  // 根据target从桶中取得depsMap，也是Map类型：key --> effects
  let depsMap = bucket.get(target)
  // 如果不存在depsMap，那么新建一个Map并与target关联
  if (!depsMap) {
    bucket.set(target, depsMap = new Map())
  }

  // 根据key从depsMap中取得deps，也是Set类型
  // 里面存储着所有与当前key相关联的副作用函数：effects
  let deps = depsMap.get(key)
  // 如果deps不存在，同样新建一个Set并与key关联
  if (!deps) {
    depsMap.set(key, deps = new Set())
  }
  deps.add(activeEffect)

  // 将当前依赖添加到activeEffect.deps数组中
  activeEffect.deps.push(deps)
}

function trigger(target, key) {
  const depsMap = bucket.get(target)
  if (!depsMap) return
  const effects = depsMap.get(key)

  // effects && effects.forEach(fn => fn())
  const effectsToRun = new Set(effects)
  effectsToRun.forEach(effectFn => {
    // 如果trigger触发执行的副作用函数与当前正在执行的副作用函数相同，则不触发执行
    // 确保调用一次副作用函数，只触发一次
    // 避免无限递归
    if (effectFn !== activeEffect) {
      effectFn()
    }
  })
}

const data = { foo: 1 }

const obj = new Proxy(data, {
  get(target, key) {
    track(target, key)
    return target[key]
  },
  set(target, key, value) {
    target[key] = value
    trigger(target, key)
  }
})

// 在副作用中给obj.foo赋值又触发了副作用 无限递归
effect(function () {
  // obj.foo++
  obj.foo = obj.foo + 1
})



