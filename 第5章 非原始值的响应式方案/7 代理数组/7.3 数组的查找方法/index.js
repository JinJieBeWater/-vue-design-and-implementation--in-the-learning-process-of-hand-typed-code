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
function trigger(target, key, type, newVal) {
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

  // 当操作type 是 ADD 并且目标是数组时触发与length相关的副作用函数
  if (type === 'ADD' && Array.isArray(target)) {
    const lengthDeps = depsMap.get('length')
    lengthDeps && lengthDeps.forEach(effectFn => {
      if (effectFn !== activeEffect) {
        effectsToRun.add(effectFn)
      }
    })
  }

  // 如果操作目标是数组 并且操作了length 则需要触发大于新长度的副作用函数
  if (Array.isArray(target) && key === 'length') {
    depsMap.forEach((deps, key) => {

      if (key >= newVal) {
        deps.forEach(effectFn => {
          if (effectFn !== activeEffect) {
            effectsToRun.add(effectFn)
          }
        })
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

// 重写代理对象的includes indexof lastIndexof方法
const arrayInstrumentations = {}

const methodsNeedToRewrite = ['includes', 'indexOf', 'lastIndexOf']

methodsNeedToRewrite.forEach(method => {
  const originMethod = Array.prototype[method]
  arrayInstrumentations[method] = function (...args) {
    // 先在代理对象上查找
    let res = originMethod.apply(this, args)

    // 如果没有找到 则在原始对象上查找
    if (res === false || res === -1) {
      res = originMethod.apply(this.raw, args)
    }

    return res
  }
})

function createReactive(obj, isShallow = false, isReadonly = false) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      console.log('get: ', key)

      if (key === 'raw') {
        return target
      }

      if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
        return Reflect.get(arrayInstrumentations, key, target)
      }

      if (!isReadonly && typeof target !== 'symbol') {
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
        return isReadonly ? readonly(res) : reactive(res)
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
      // 遍历数组与对象需要区分
      // 当对象的属性新增或者删除时 则需要触发副作用函数
      // 当数组的长度发生变化时 则需要触发副作用函数
      //  此处将当前副作用跟踪到length上, 只要length发生变化 则触发副作用函数
      track(target, Array.isArray(target) ? 'length' : ITERATE_KEY)
      // 返回属性值
      return Reflect.ownKeys(target)
    },
    // 拦截设置操作
    set(target, key, newVal, receiver) {
      if (isReadonly) {
        console.warn(`属性${key}是只读的`)
        return true
      }

      const oldVal = target[key]

      const type = Array.isArray ?
        (Number(key) < target.length
          ? TriggerType.SET : TriggerType.ADD) :
        Object.prototype.hasOwnProperty.call(target, key)
          ? TriggerType.SET : TriggerType.ADD

      const res = Reflect.set(target, key, newVal, receiver)

      //  判断是否target === receiver.raw 说明 receiver 就是target 的代理对象
      if (target == receiver.raw) {
        if (oldVal !== newVal && (oldVal === oldVal || newVal === newVal)) {
          trigger(target, key, type, newVal)
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

// 定义map实例 存储原始对象到代理对象的映射
const reactiveMap = new Map()

function reactive(obj) {
  const existionProxy = reactiveMap.get(obj)
  if (existionProxy) return existionProxy
  const proxy = createReactive(obj)

  reactiveMap.set(obj, proxy)
  return proxy
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
// 对数组元素或属性的“读取”操作: 
// 通过索引
// 通过arr.length
// for in
// for of
// 数组的原型方法 以及其他所有不改变原数组的原型方法

// 设置操作:
// 通过索引 arr[0] = '你好'
// 吸怪数组长度 arr.length = 1
// 数组的栈方法 push/pop/shift/unshift
// 修改原数组的原型方法 concat/splice等

const obj = { name: '张三' }
const arr = reactive([obj])

// 添加一个副作用
effect(() => {
  // arr.includes 会通过索引读取元素的值
  // 触发代理的get get检测到key是obj 会创建obj的代理对象并返回
  // 而arr[0] 同样会触发get 从而创建obj的代理对象并返回
  // includes内部进行比对 两个不同的代理对象当然不同
  // 因此返回false
  // console.log(arr.includes(arr[0]), '我是副作用')

  // 这种情况也是符合直觉的
  // 但由于includes内部会会使用代理对象进行比对 而obj是原生对象 哪怕代理的目标其实就是这个obj
  // 也返回false 
  // 需要通过重写includes方法来解决
  console.log(arr.includes(obj), 'includes')
  console.log(arr.indexOf(obj), 'indexOf')
  console.log(arr.lastIndexOf(obj), 'lastIndexOf')
})
