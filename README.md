# ucloud-ufile

## 示例

[点击预览](https://panhezeng.github.io/ucloud-ufile-js/)

示例代码目录 /example

示例使用的 mock 接口模拟了 ucloud 接口的 Response，实际应用中这三个 bucketName = '', bucketUrl = '', tokenServerUrl = ''参数，需要用户自己配置

示例使用的 apiary mock 服务每次 Request 获得的 Response 都是不变的。免费服务可能会出现无响应等错误

## 说明

基于 ucloud 官方 jssdk，在保证官方 api 命名，参数，返回结果一致的前提下，进行严重 bug 修复和代码优化精简等，并且提供 npm 使用方式。主要动了秒传和分片上传相关代码，其他 api 代码几乎和官方一样，有 bug 提 issue，或者自己 fork 修改。

bug 修复： 1.修复 signatureServer 逻辑会立即触发 error 回调问题

优化： 1.换成 class 写法 2.去掉了本地计算 token 的代码，从安全性来说，一般都是通过服务器获得 token，从开发角度来说，也没必要把两个功能耦合到一起，一是代码冗余，二是容易产生 bug，比如上面修复的 bug。 3.调整了每次都执行 getContentMd5 方法，后执行获得 token 方法的逻辑，通过阅读官方源码发现只需要 Object.prototype.toString.call(file) === '[object File]'&& md5Required !== false 条件下执行 4.增加 check 方法，检查 API 第一个必传参数 5.增加了 hitSliceUpload 方法，先秒传，如果秒传失败再分片上传，用文件相关信息作为文件夹名称，保证唯一性，否则同名文件会被覆盖

本模块已正式使用于多个生产项目

## 用法

`npm i @panhezeng/ucloud-ufile -S`

```javascript
import UCloudUFile from "@panhezeng/ucloud-ufile";
```

or

```html
<script src="https://cdn.jsdelivr.net/npm/@panhezeng/ucloud-ufile@latest/dist/ucloud-ufile.min.js"></script>
```

具体读本模块示例代码和 ucloud 官方官方文档(https://github.com/ufilesdk-dev/ufile-jssdk)

## 编译

```bash
# install dependencies
npm install

# 运行插件使用示例
npm run dev:example

# 编译插件
npm run build

# 发版
npm version patch && npm publish --access public
```
