/** Translate only the exact fragments explicitly marked by an example's author. */
export const codeMessages: Readonly<Record<string, string>> = {
  'aria-label="Article actions"': 'aria-label="文章操作"',
  ">Add to favorites<": ">加入收藏<",
  ">Like<": ">喜欢<",
  ">Save for later<": ">稍后再看<",
  "// Pass config to createIconConfig, then assign the scope as in Basic usage.":
    "// 将 config 传给 createIconConfig，再按基本用法中的方式设置 scope。",
  '// Pass config to <IconConfig v-bind="config">.':
    '// 将 config 传给 <IconConfig v-bind="config">。',
  "// Pass config to <IconConfig {...config}>.":
    "// 将 config 传给 <IconConfig {...config}>。",
  "// Run in your server request handler before rendering the page.":
    "// 在服务端请求处理函数中调用，并在完成后渲染页面。",
  "// Keep your existing framework plugin here.":
    "// 在这里保留现有的框架插件。",
  "// Assign the runtime name after initialization, outside HTML extraction.":
    "// 初始化后再设置运行时名称，避免由 HTML 静态提取。",
  "// Call once per client application, or once per SSR request.":
    "// 每个客户端应用调用一次；服务端则在每次 SSR 请求中单独调用。",
  "// Pass the returned store to <IconConfig store={store}>.":
    "// 将返回的 store 传给 <IconConfig store={store}>。",
  '// Pass the returned store to <IconConfig :store="store">.':
    '// 将返回的 store 传给 <IconConfig :store="store">。',
  "// Pass the returned store to createIconConfig({ store }).":
    "// 将返回的 store 传给 createIconConfig({ store })。",
  "// Do not pass sources or api alongside store; configure those on the store itself.":
    "// 不要在传入 store 的同时传 sources 或 api；请在创建 store 时配置它们。",
  "// Call icon.destroy() when the owner is removed.":
    "// 所属视图移除时，调用 icon.destroy() 清理。",
  '"Completed"': '"已完成"',
  '"Favorite"': '"收藏"',
}
