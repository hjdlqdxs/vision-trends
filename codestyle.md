# 代码规范

来源：[Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html)、[Node.js 官方 API 文档](https://nodejs.org/docs/latest-v22.x/api/)、[MDN Web 开发文档](https://developer.mozilla.org/en-US/docs/Web/JavaScript)。本项目按教学规模做以下裁剪，并非声称通过完整 Google lint 检查。

- ES modules；2 空格缩进；单引号；语句分号；UTF-8 / LF。
- 常量优先 `const`，可变局部使用 `let`，不使用 `var`。
- 函数和变量 camelCase，类 PascalCase，模块职责单一；避免不必要依赖。
- HTTP 输入先校验再执行；SQL 必须使用绑定参数；不能拼接用户 SQL。
- 所有外部请求设超时和体积限制；只访问经过校验的官方域名；禁止任意 URL 代理和静默重定向。
- 使用 `textContent` 或 HTML 转义；来源链接仅接受 HTTPS；导出 CSV 防止公式注入。
- 无数据使用 `null` 而不是误填 0；抽样分析必须明确样本范围。
- 对解析、去重、统计、权限、CRUD 和外部站点异常写行为测试；测试不依赖公网。
- 每个实际功能阶段通过语法检查后提交；禁止伪造 commit 时间、人工贡献、测试结果。
- 使用 `npm run check` 和 `npm test`；保持主分支可运行。
