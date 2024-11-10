// 原有代码在分支切换的情况下存在部分副作用已经不需要, 但仍然会在副作用列表里面
const bucket = new WeakMap()

let activeEffect = null
const effectStack = []

/** 注册副作用 在执行传入函数之前对activeEffect进行赋值为当前副作用函数 */
function effect(fn, options = {}) {
  const effectFn = () => {
    cleanup(effectFn)
    activeEffect = effectFn
    effectStack.push(effectFn)
    const res = fn()
    effectStack.pop()
    activeEffect = effectStack[effectStack.length - 1]
    return res
  }
  effectFn.options = options
  effectFn.deps = []
  if (!options.lazy) {
    effectFn()
  }
  return effectFn
}

/** 清理副作用函数与响应性数据的依赖关系 */
function cleanup(effectFn) {
  const deps = effectFn.deps
  if (!deps.length) return

  deps.forEach(dep => {
    dep.delete(effectFn)
  })

  effectFn.deps.length = 0
}

// 用于调度到微任务队列中执行副作用
const jobQueue = new Set()
const p = Promise.resolve()
let isFlushing = false
function flushJob() {
  if (isFlushing) return
  isFlushing = true
  p.then(() => {
    jobQueue.forEach(job => job())
    jobQueue.clear()
  }).finally(() => {
    isFlushing = false
  })
}

/** 将当前activeEffect添加到target的key的依赖集合中 */
function track(target, key) {
  if (!activeEffect) return

  let depsMap = bucket.get(target)
  if (!depsMap) {
    bucket.set(target, depsMap = new Map())
  }

  let deps = depsMap.get(key)
  if (!deps) {
    depsMap.set(key, deps = new Set())
  }
  deps.add(activeEffect)

  activeEffect.deps.push(deps)
}

/** 触发target对象的key属性的依赖 */
function trigger(target, key) {
  const depsMap = bucket.get(target)
  if (!depsMap) return
  const effects = depsMap.get(key)

  const effectsToRun = new Set()
  effects && effects.forEach(effectFn => {
    if (effectFn !== activeEffect) {
      effectsToRun.add(effectFn)
    }
  })
  effectsToRun.forEach(effectFn => {
    if (effectFn.options.scheduler) {
      effectFn.options.scheduler(effectFn)
    } else {
      effectFn()
    }
  })
}

/** 计算属性 */
function computed(getter) {
  let value
  let dirty = true

  const effectFn = effect(() => {
    return getter()
  }, {
    lazy: true,
    scheduler: () => {
      if (!dirty) {
        dirty = true
        trigger(obj, 'value')
      }
    }
  })

  // 返回一个计算属性对象 同样为响应式
  const obj = {
    get value() {
      if (dirty) {
        value = effectFn()
        dirty = false
        // 跟踪依赖当前计算属性的副作用函数
        track(obj, 'value')
      }
      return value
    }
  }
  return obj
}

/** 访问器 */
function traverse(value, seen = new Set()) {
  if (typeof value !== 'object' || value === null || seen.has(value)) return
  seen.add(value)
  for (const k in value) {
    traverse(value[k], seen)
  }
  return value
}

/** watch 实质上就是给传入的响应式对象加一个副作用 */
function watch(source, cb) {
  let getter
  if (typeof source === 'function') {
    getter = source
  } else {
    getter = () => traverse(source)
  }
  let oldValue, newValue
  const effectFn = effect(() => getter(), {
    lazy: true,
    scheduler: () => {
      newValue = effectFn()
      cb(newValue, oldValue)
      oldValue = newValue
    }
  })
  oldValue = effectFn()
}

// 设置响应性对象
const obj = new Proxy({ foo: 1 }, {
  get(target, key) {
    track(target, key)
    return target[key]
  },
  set(target, key, value) {
    target[key] = value
    trigger(target, key)
  }
})

watch(() => obj.foo, (newValue, oldValue) => {
  console.log('obj', newValue, oldValue)
})
obj.foo++
