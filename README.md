# ucloud-ufile

## 示例

[点击预览](https://panhezeng.github.io/ucloud-ufile-js/)

示例代码目录 /example

示例用的是mock接口， 尽可能模拟了ucloud接口的Response，实际应用中这三个bucketName = '', bucketUrl = '', tokenServerUrl = ''参数，需要用户自己配置

## 说明

基于ucloud官方jssdk，在保证官方api命名，参数，返回结果一致的前提下，进行严重bug修复和代码优化精简等，并且提供npm使用方式。主要动了秒传和分片上传相关代码，其他api代码几乎和官方一样，有bug提issue，或者自己fork修改。

bug修复：
1.修复signatureServer逻辑会立即触发error回调问题

优化：
1.换成class写法
2.去掉了本地计算token的代码，从安全性来说，一般都是通过服务器获得token，从开发角度来说，也没必要把两个功能耦合到一起，一是代码冗余，二是容易产生bug，比上面修复的bug。
3.调整了每次都执行getContentMd5方法，后执行获得token方法的逻辑，通过阅读官方源码发现只需要Object.prototype.toString.call(file) === '[object File]'&& md5Required !== false条件下执行
4.增加check方法，检查API第一个必传参数
5.增加了hitSliceUpload方法，先秒传，如果秒传失败再分片上传，用文件的md5作为文件名，保证唯一性，否则同名文件会被覆盖

本模块已正式使用于多个生产项目

## 用法

`npm i @panhezeng/ucloud-ufile -S`

具体读本模块示例代码和ucloud官方官方文档(https://github.com/ufilesdk-dev/ufile-jssdk)

## 编译

``` bash
# install dependencies
npm install

# 运行插件使用示例
npm run dev:example

# 编译插件
npm run build

# 发版
npm version patch
npm publish --access public
```

