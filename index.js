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
const pQueue = Promise.resolve()
let isFlushing = false
function flushJob() {
  if (isFlushing) return
  isFlushing = true
  pQueue.then(() => {
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

const TriggerType = {
  SET: 'SET',
  ADD: 'ADD',
  DELETE: 'DELETE'
}
/** 触发target对象的key属性的依赖 */
function trigger(target, key, type) {
  const depsMap = bucket.get(target)
  if (!depsMap) return
  const effects = depsMap.get(key)

  const effectsToRun = new Set()
  effects && effects.forEach(effectFn => {
    if (effectFn !== activeEffect) {
      effectsToRun.add(effectFn)
    }
  })

  // 如果是删除或者添加操作 则触发与 ITERATE_KEY 相关的副作用函数
  if (type === 'ADD' || type === 'DELETE') {
    // 取得与 ITERATE_KEY 相同的依赖
    const iterateDeps = depsMap.get(ITERATE_KEY)
    // 将 ITERATE_KEY 的依赖加入到 effectsToRun 中
    iterateDeps && iterateDeps.forEach(effectFn => {
      if (effectFn !== activeEffect) {
        effectsToRun.add(effectFn)
      }
    })
  }

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
function watch(source, cb, options = {}) {
  let getter
  if (typeof source === 'function') {
    getter = source
  } else {
    getter = () => traverse(source)
  }
  let oldValue, newValue

  let cleanup
  function onInvalidate(fn) {
    cleanup = fn
  }

  const job = () => {
    newValue = effectFn()
    if (cleanup) {
      cleanup()
    }
    cb(newValue, oldValue, onInvalidate)
    oldValue = newValue
  }

  const effectFn = effect(() => getter(), {
    lazy: true,
    scheduler: () => {
      if (options.flush === 'post') {
        const p = Promise.resolve()
        p.then(job)
      } else {
        job()
      }
    }
  })

  if (options.immediate) {
    job()
  } else {
    oldValue = effectFn()
  }
}
const ITERATE_KEY = Symbol()

function createReactive(obj, isShallow = false, isReadonly = false) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      if (key === 'raw') {
        return target
      }
      if (!isReadonly) {
        // 建立联系
        track(target, key)
      }

      // 得到原始结果
      const res = Reflect.get(target, key, receiver)

      // isShallow 如果是浅响应 则直接返回res
      if (isShallow) {
        return res
      }

      if (typeof res === 'object' && res !== null) {
        // 如果是对象 则将其转换为响应式对象
        // 如果是只读的 则返回只读的对象
        return isReadonly ? readonly(res) : createReactive(res)
      }
      // 返回res
      return res
    },
    has(target, key) {
      // 建立联系
      track(target, key)
      // 返回属性值
      return Reflect.has(target, key)
    },
    ownKeys(target) {
      // 建立联系
      track(target, ITERATE_KEY)
      // 返回属性值
      return Reflect.ownKeys(target)
    },
    // 拦截设置操作
    set(target, key, newVal, receiver) {
      if (isReadonly) {
        console.warn(`属性${key}是只读的`)
        return true
      }
      // 取出旧值
      const oldVal = target[key]

      const type = Object.prototype.hasOwnProperty.call(target, key) ? TriggerType.SET : TriggerType.ADD

      const res = Reflect.set(target, key, newVal, receiver)

      //  判断是否target === receiver.raw 说明 receiver 就是target 的代理对象
      if (target == receiver.raw) {
        if (oldVal !== newVal && (oldVal === oldVal || newVal === newVal)) {
          trigger(target, key, type)
        }
      }
      return res
    },
    // 拦截删除操作
    deleteProperty(target, key) {
      if (isReadonly) {
        console.warn(`属性${key}是只读的`)
        return true
      }
      const hadKey = Object.prototype.hasOwnProperty.call(target, key)
      const res = Reflect.deleteProperty(target, key)

      if (res && hadKey) {
        trigger(target, key, TriggerType.DELETE)
      }

      return res
    }
  })
}

function reactive(obj) {
  return createReactive(obj)
}

function shallowReactive(obj) {
  return createReactive(obj, true)
}

function readonly(obj) {
  return createReactive(obj, false, true/** 只读 */)
}

function shallowReadonly(obj) {
  return createReactive(obj, true /** shallow */, true/** 只读 */)
}

// 示例使用
// 值没发生变化，不需要触发副作用
const obj = readonly({
  foo: {
    bar: 1
  }
})


effect(() => {
  console.log(obj.foo.bar)
})

obj.foo.bar++
