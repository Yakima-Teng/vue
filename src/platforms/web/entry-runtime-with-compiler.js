/* @flow */

import config from 'core/config'
import { warn, cached } from 'core/util/index'
import { mark, measure } from 'core/util/perf'

import Vue from './runtime/index'
import { query } from './util/index'
import { compileToFunctions } from './compiler/index'
import { shouldDecodeNewlines, shouldDecodeNewlinesForHref } from './util/compat'

const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})

const mount = Vue.prototype.$mount
// 返回类型是Component，这个类型下文具体讲，就直译为返回一个组件即可
Vue.prototype.$mount = function (
  // el是可选参数，值是字符串（css选择符）或dom元素（Element）
  el?: string | Element,
  // hydrating也是可选参数，布尔类型，以前用过redux-persist这个库，那里这种名词的意思是是否恢复之前的数据
  hydrating?: boolean
): Component {
  // 如果el是元素则值维持不变，如果el是字符串则赋值为通过document.querySelector(el)匹配到的元素
  el = el && query(el)

  // 下面注释里的istanbul指的是一个叫istanbul的代码覆盖率工具
  /* istanbul ignore if */
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      // 如果元素是body/document.documentElement，且非针对生产环境打包的话，则提示用户不要将Vue绑定到html或body元素上
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    // 返回this
    return this
  }

  // 一个$options属性
  const options = this.$options
  // 如果没有定义render函数，则Vue会按下面这样去定义一个render函数
  // resolve template/el and convert to render function
  if (!options.render) {
    let template = options.template
    if (template) {
      // 如果有模版
      if (typeof template === 'string') {
        if (template.charAt(0) === '#') {
          // 如果template是一个id选择器（以#开头），则将template重新赋值为对应元素的innerHTML
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !template) {
            // 如果id关联到的innerHTML为空或不存在，则在非生产版本下提示用户
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {
        // 如果template不是字符串，但是有nodeType属性，则判断template为dom，取其innerHTML作为模版
        template = template.innerHTML
      } else {
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        // 返回this
        return this
      }
    } else if (el) {
      // 如果没有模板但是有元素，就取元素的outerHtml或近似等价的东西
      template = getOuterHTML(el)
    }
    if (template) {
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        // 通过window.performance.mark来标记性能监测点'compile'
        mark('compile')
      }

      // 获得render和staticRenderFns函数，并挂到Vue.property.$options对象上
      const { render, staticRenderFns } = compileToFunctions(template, {
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,
        delimiters: options.delimiters,
        comments: options.comments
      }, this)
      options.render = render
      options.staticRenderFns = staticRenderFns

      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        // 通过window.performance.mark标记性能监测点'compile end'
        mark('compile end')
        // 通过window.erformance.measure来测量compile和compile end这两个性能监测点间的用时
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }
  // 再次调用mount方法
  return mount.call(this, el, hydrating)
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
function getOuterHTML (el: Element): string {
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    const container = document.createElement('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}

Vue.compile = compileToFunctions

export default Vue
