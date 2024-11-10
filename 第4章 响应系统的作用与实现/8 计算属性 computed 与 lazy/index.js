// 原有代码在分支切换的情况下存在部分副作用已经不需要, 但仍然会在副作用列表里面
const bucket = new WeakMap()

let activeEffect = null
const effectStack = []

/** 注册副作用 在执行传入函数之前对activeEffect进行赋值为当前副作用函数 */
function effect(fn, options = {}) {
  const effectFn = () => {
    cleanup(effectFn)
    // 核心代码 将当前副作用函数添加到activeEffect
    // 当读取数据时，会触发getter，从而将副作用函数收集到响应性数据的依赖集合中
    // 当数据发生变化时，会触发setter，从而执行副作用函数
    // 从而实现数据变化时，自动执行副作用函数的目的
    activeEffect = effectFn
    effectStack.push(effectFn)
    // 执行副作用函数, 在执行过程中会自动被注册了响应性的数据进行副作用依赖收集
    const res = fn()
    effectStack.pop()
    activeEffect = effectStack[effectStack.length - 1]
    return res
  }
  // 将options挂载到effectFn上
  effectFn.options = options
  // 初始化deps数组，用于存储所有与该副作用函数相关联的依赖集合
  effectFn.deps = []
  // 如果lazy为true，那么不会立即执行副作用函数
  if (!options.lazy) {
    effectFn()
  }
  return effectFn
}

/** 清理副作用函数与响应性数据的依赖关系 */
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


/** 将当前activeEffect添加到target的key的依赖集合中 */
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

/** 触发target对象的key属性的依赖 */
function trigger(target, key) {
  const depsMap = bucket.get(target)
  if (!depsMap) return
  const effects = depsMap.get(key)

  const effectsToRun = new Set()
  effects && effects.forEach(effectFn => {
    // 如果trigger触发执行的副作用函数与当前正在执行的副作用函数相同，则不触发执行
    // 确保调用一次副作用函数，只触发一次
    // 避免无限递归
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

// 用于调度到微任务队列中执行副作用
// 用一个Set代替数组，避免多次执行相同的副作用函数
const jobQueue = new Set()
// 使用Promise.resolve()创建一个微任务队列
const p = Promise.resolve()
// 使用一个标志位，标识当前是否正在刷新微任务队列
let isFlushing = false
// 将任务队列的任务取出并放在微任务队列中执行
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

// coumputed 计算属性功能
function computed(getter) {
  // value用来缓存上一次计算的值
  let value
  // dirty用来标记是否需要重新计算
  let dirty = true

  // 在计算属性依赖的响应式数据上添加一个副作用
  const effectFn = effect(() => {
    return getter()
  }, {
    lazy: true,
    // 调度器会在修改计算属性依赖的响应式数据时触发
    scheduler: () => {
      // 当计算属性依赖的响应式数据变化时，将dirty设置为true，
      // 这样当读取value时，就会重新计算
      if (!dirty) {
        dirty = true
        // 计算属性变为脏数据, 依赖于计算属性的副作用也应该被重新触发
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

// 给对象obj设置响应性
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

const bar = computed(() => {
  return obj.foo * 2
})

effect(() => {
  // 在副作用中使用了计算属性bar
  console.log(bar.value)
})

obj.foo = 2

