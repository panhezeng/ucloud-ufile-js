/* eslint-disable */
import SparkMD5 from 'spark-md5'

export class UCloudUFile {

  /**
   *
   * @param bucketName  存储空间名称。既可以在这里配置，也可以在实例化时传参配置。 例如 bucketName = "example-name"，来自ucloud后台，
   * @param bucketUrl 存储空间域名。既可以在这里配置，也可以在实例化时传参配置。例如 bucketUrl = "https://example-name.cn-bj.ufileos.com/"，来自ucloud后台，
   * @param tokenServerUrl 签名服务器地址，来自使用此sdk的项目的后台，返回上传用的token
   * @param prefix 令牌配置的前缀，无前缀填空字符串，通常是文件存放在ucloud的路径，为空则是放在该空间的根目录
   */
  constructor (bucketName = '', bucketUrl = '', tokenServerUrl = '', prefix = '') {
    this.bucketName = bucketName

    this.bucketUrl = bucketUrl

    this.tokenServerUrl = tokenServerUrl

    this.PREFIX = prefix

    // 是否处于上传中状态
    this.uploading = false

    this.contentMd5 = '' // 文件的md5
    this.slice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice
    this.sliceSize = 4 * 1024 * 1024 // 分片大小为4M

  }

  createAjax (argument) {
    let xmlhttp = {}
    if (window.XMLHttpRequest) {
      xmlhttp = new XMLHttpRequest()
    } else {
      xmlhttp = new ActiveXObject('Microsoft.XMLHTTP')
    }

    // 发送二进制数据
    if (!XMLHttpRequest.prototype.sendAsBinary) {
      XMLHttpRequest.prototype.sendAsBinary = function (datastr) {
        function byteValue (x) {
          return x.charCodeAt(0) & 0xff
        }

        let ords = Array.prototype.map.call(datastr, byteValue)
        let ui8a = new Uint8Array(ords)
        this.send(ui8a.buffer)
      }
    }

    return xmlhttp
  }

  getBucketUrl () {
    let bucketUrl = this.bucketUrl

    // 如果不是以"/"结尾，则自动补上
    if (bucketUrl.charAt(bucketUrl.length - 1) !== '/') {
      bucketUrl += '/'
    }
    return bucketUrl
  }

  // 重命名文件

  getFileName (file, fileRename) {
    let fileName

    if (fileRename && (fileRename !== '')) {
      fileName = fileRename
    } else {
      fileName = file.name
    }

    return fileName
  }

  // 增加前缀

  addPrefix (filename) {
    return this.PREFIX ? this.PREFIX + '/' + filename : filename
  }

  check (data) {
    if (!((Object.prototype.toString.call(data) === '[object Object]' && Object.prototype.toString.call(data.file) === '[object File]') || Object.prototype.toString.call(data) === '[object File]')) {
      throw new Error('file参数必须为File数据类型')
    }
  }

  // 获取文件的内容MD5签名
  getContentMd5 (file, success) {
    this.check(file)
    let that = this
    let fileReader = new FileReader()
    let spark = new SparkMD5.ArrayBuffer()
    let chunks = Math.ceil(file.size / this.sliceSize)
    let currentChunk = 0

    // 每块文件读取完毕之后的处理
    fileReader.onload = function (e) {
      // 每块交由sparkMD5进行计算

      spark.append(e.target.result)
      currentChunk++

      // 如果文件处理完成计算MD5，如果还有分片继续处理
      if (currentChunk < chunks) {
        loadNext()
      } else {
        that.contentMd5 = spark.end()
        success(that.contentMd5)
      }
    }

    // 处理单片文件的上传
    function loadNext () {
      let start = currentChunk * that.sliceSize
      let end = start + that.sliceSize >= file.size ? file.size : start + that.sliceSize

      fileReader.readAsArrayBuffer(that.slice.call(file, start, end))
    }

    loadNext()
  }

// 获取文件管理签名token
  getUFileToken (options, success, error) {
    let method = options.method || 'GET'
    let file = options.file || {}
    let fileName = options.fileName
    let md5Required = options.md5Required

    let keyName
    let contentType = options.contentType || file.type || ''
    let putPolicy = options.putPolicy || ''

    if (fileName) {
      keyName = fileName
    } else if (file.FileName) {
      keyName = file.FileName
    } else if (file.name) {
      keyName = this.addPrefix(file.name)
    } else {
      keyName = ''
    }

    let that = this

    // 服务端签名计算
    function getSignatureToken (tokenServerUrl, method, bucket, key, content_md5, content_type, date, put_policy) {
      let ajax = that.createAjax()
      let url = tokenServerUrl + '?method=' + method +
        '&bucket=' + bucket +
        '&key=' + key +
        '&content_md5=' + content_md5 +
        '&content_type=' + content_type +
        '&date=' + date +
        '&put_policy=' + put_policy
      ajax.open('GET', url, true)

      let onreadystatechange = function () {
        if (ajax.readyState === 4) {
          if (ajax.status === 200) {
            success(ajax.responseText.trim())
          } else {
            error(ajax.responseText)
          }
        }
      }

      ajax.onreadystatechange = onreadystatechange
      ajax.send()
    }

    if (Object.prototype.toString.call(file) === '[object File]' && md5Required !== false) {
      this.getContentMd5(file, function (md5) {
        getSignatureToken(that.tokenServerUrl, method, that.bucketName, encodeURIComponent(keyName), md5, contentType, '', putPolicy)
      })
    } else {
      getSignatureToken(that.tokenServerUrl, method, that.bucketName, encodeURIComponent(keyName), '', contentType, '', putPolicy)
    }

  }

// 查看文件信息
  getFileDetail (fileName, success, error) {

    let that = this
    let method = 'HEAD'
    let requestToken = {
      method: method,
      fileName: fileName
    }

    this.getUFileToken(requestToken, function (token) {

      let ajax = that.createAjax()
      let url = that.getBucketUrl() + encodeURIComponent(fileName)
      ajax.open(method, url, true)
      ajax.setRequestHeader('Authorization', token)

      let onreadystatechange = function () {
        if (ajax.readyState === 4) {
          if (ajax.status === 200) {
            let eTag = ajax.getResponseHeader('ETag')
            let successRes = {
              contentType: ajax.getResponseHeader('Content-Type'),
              eTag: eTag.substring(1, eTag.length - 1),
              status: ajax.status,
              response: ajax.response
            }
            success(successRes)

          } else {
            error(ajax.responseText)
          }
        }
      }

      ajax.onreadystatechange = onreadystatechange
      ajax.send()

    }, error)
  }

// 分片上传（外部调用）
  sliceUpload (options, success, error, progress) {
    this.check(options)
    let that = this
    let file = options.file || {}
    let fileRename = options.fileRename
    let fileName = this.addPrefix(this.getFileName(file, fileRename))

    let fileReader = new FileReader()
    let chunks = Math.ceil(file.size / this.sliceSize)
    let currentChunk = 0

    // 初始化分片
    this.initMultipartUpload(function (intResponse) {
      let keyName = intResponse.Key
      let uploadId = intResponse.UploadId
      let partNumber = 0
      let requestSuccess = 0 // 各分片请求成功数
      let eTags = ''

      // 每块文件读取完毕之后的处理
      fileReader.onload = function (e) {
        currentChunk++

        // 如果文件处理完，调用完成分片；否则还有分片则继续处理
        if (currentChunk < chunks) {
          loadNext()
        }
      }

      // 处理单片文件的上传
      function loadNext () {
        let start = currentChunk * that.sliceSize
        let end = start + that.sliceSize >= file.size ? file.size : start + that.sliceSize
        let currentFile = that.slice.call(file, start, end, file.type)
        currentFile.name = file.name

        // 上传各分片
        that.multipartUploading(function (multipartResponse) {
          requestSuccess++
          if (eTags === '') {
            eTags = multipartResponse.eTag
          } else {
            eTags = eTags + ',' + multipartResponse.eTag
          }

          let sliceCompleted = {
            status: 'uploading',
            value: requestSuccess / chunks
          }
          progress(sliceCompleted) // 上传各分片进度

          if (requestSuccess === chunks) {
            // 完成分片
            that.multipartUploaded(function (uploaded) {
              success(uploaded)
            }, error, progress, keyName, uploadId, file, eTags)
          }
        }, error, keyName, uploadId, partNumber, currentFile)

        partNumber++
        fileReader.readAsArrayBuffer(currentFile)
      }

      loadNext()
    }, error, progress, file, fileName)
  }

// 初始化上传（内部调用）
  initMultipartUpload (success, error, progress, file, fileName) {
    let that = this
    let method = 'POST'
    let contentType = file.type || '' // application/octet-stream
    let requestToken = {
      method: method,
      file: file,
      fileName: fileName,
      md5Required: false
    }

    this.getUFileToken(requestToken, function (token) {
      let ajax = that.createAjax()
      let url = that.getBucketUrl() + encodeURIComponent(fileName) + '?uploads'
      ajax.open(method, url, true)
      ajax.setRequestHeader('Authorization', token)
      ajax.setRequestHeader('Content-Type', contentType)

      let onreadystatechange = function () {
        if (ajax.readyState === 4) {
          if (ajax.status === 200) {
            success(JSON.parse(ajax.response))
          } else {
            error(ajax.responseText)
          }
        }
      }
      let onprogress = function (event) {
        if (event.lengthComputable) {
          let result = {
            status: 'init',
            value: event.loaded / event.total
          }
          progress(result)
        }
      }

      ajax.onreadystatechange = onreadystatechange
      ajax.upload.onprogress = onprogress
      ajax.send()
    }, error)
  }

// 上传分片（内部调用）
  multipartUploading (success, error, keyName, uploadId, partNumber, file) {
    let that = this
    let method = 'PUT'
    let requestToken = {
      method: method,
      file: file,
      fileName: keyName,
      md5Required: false
    }

    this.getUFileToken(requestToken, function (token) {
      let ajax = that.createAjax()
      let url = that.getBucketUrl() + encodeURIComponent(keyName) +
        '?uploadId=' + uploadId +
        '&partNumber=' + partNumber
      ajax.open(method, url, true)
      ajax.setRequestHeader('Authorization', token)
      ajax.setRequestHeader('Content-Type', file.type)

      let onreadystatechange = function () {
        if (ajax.readyState === 4) {
          if (ajax.status === 200) {
            let eTag = ajax.getResponseHeader('ETag')
            let result = {
              eTag: eTag.substring(1, eTag.length - 1),
              response: ajax.response
            }
            success(result)
          } else {
            error(ajax.responseText)
          }
        }
      }

      ajax.onreadystatechange = onreadystatechange
      ajax.send(file)
    }, error)
  }

// 完成分片（内部调用）
  multipartUploaded (success, error, progress, keyName, uploadId, file, eTags) {
    let that = this
    let method = 'POST'
    let contentType = file.type || 'application/octet-stream'
    let requestToken = {
      method: method,
      file: file,
      fileName: keyName,
      md5Required: false,
      contentType: contentType
    }

    this.getUFileToken(requestToken, function (token) {
      let ajax = that.createAjax()
      let url = that.getBucketUrl() + encodeURIComponent(keyName) + '?uploadId=' + uploadId

      ajax.open(method, url, true)
      ajax.setRequestHeader('Authorization', token)
      ajax.setRequestHeader('Content-Type', contentType)

      let onreadystatechange = function () {
        if (ajax.readyState === 4) {
          if (ajax.status === 200) {
            success(ajax.responseText)
          } else {
            error(ajax.responseText)
          }
        }
      }
      let onprogress = function (event) {
        if (event.lengthComputable) {
          let result = {
            status: 'uploaded',
            value: event.loaded / event.total
          }
          progress(result)
        }
      }

      ajax.onreadystatechange = onreadystatechange
      ajax.upload.onprogress = onprogress
      ajax.send(eTags)
    }, error)
  }

// 秒传文件
  hitUpload (file, success, error, fileRename) {
    this.check(file)
    let that = this
    let method = 'POST'
    let fileName = this.addPrefix(this.getFileName(file, fileRename))

    this.getFileDetail(fileName, function (fileDetail) {
      let requestToken = {
        method: method,
        file: file,
        fileName: fileName,
        md5Required: false
      }

      that.getUFileToken(requestToken, function (token) {

        let ajax = that.createAjax()
        let url = that.getBucketUrl() +
          'uploadhit?Hash=' + fileDetail.eTag +
          '&FileName=' + encodeURIComponent(fileName) +
          '&FileSize=' + file.size
        ajax.open(method, url, true)
        ajax.setRequestHeader('Authorization', token)
        ajax.setRequestHeader('Content-Type', file.type)

        let onreadystatechange = function () {
          if (ajax.readyState === 4) {
            if (ajax.status === 200) {
              success(ajax.responseText)
            } else {
              error(ajax.responseText)
            }
          }
        }

        ajax.onreadystatechange = onreadystatechange
        ajax.send(file)

      }, error)

    }, error)
  }

  // 先秒传，如果秒传失败再分片上传，用文件名,文件时间,和文件大小作为文件名，在最大程度上实现同样文件秒传，但是同名不一样的文件不会误覆盖
  hitSliceUpload (file, success, error, progress) {
    const fileRename = `${file.name}-${file.lastModified}-${file.size}`.substr(0, 160) + file.name.replace(/.+(\..+)$/, '$1')
    //      const fileRename = file.name

    const successHit = (res) => {
      console.log('successHit', res)
      success({Key: this.addPrefix(fileRename)})
    }

    const errorHit = (res) => {
      console.log('errorHit', res)
      const sliceOptions = {
        file: file,
        fileRename: fileRename
      }

      const successSlice = (res) => {
        try {
          console.log('successSlice', res)
          success(JSON.parse(res))
        } catch (e) {
          error()
        }
      }
      const errorSlice = () => {
        console.log('errorSlice')
        error()
      }
      this.sliceUpload(sliceOptions, successSlice, errorSlice, progress)
    }
    progress()
    this.hitUpload(file, successHit, errorHit, fileRename)
  }

  // 普通上传
  uploadFile (options, success, error, progress) {
    this.check(options)
    let that = this
    let method = 'PUT'
    let file = options.file || {}
    let fileRename = options.fileRename
    let fileName = this.addPrefix(this.getFileName(file, fileRename))
    let putPolicy = options.putPolicy

    let requestToken = {
      method: method,
      file: file,
      fileName: fileName,
      putPolicy: putPolicy
    }

    this.getUFileToken(requestToken, function (token) {

      let ajax = that.createAjax()
      let url = that.getBucketUrl() + encodeURIComponent(fileName)
      ajax.open(method, url, true)
      ajax.setRequestHeader('Authorization', token)
      ajax.setRequestHeader('Content-MD5', that.contentMd5)
      ajax.setRequestHeader('Content-Type', file.type)

      let onreadystatechange = function () {
        if (ajax.readyState === 4) {
          if (ajax.status === 200) {
            success({
              msg: ajax.responseText,
              file: file
            })
          } else {
            error({
              msg: ajax.responseText,
              file: file
            })
          }
        }
      }
      let onprogress = function (event) {
        if (event.lengthComputable) {
          progress(event.loaded / event.total)
        }
      }

      ajax.onreadystatechange = onreadystatechange
      ajax.upload.onprogress = onprogress
      ajax.send(file)

    }, error)
  }

// 批量上传
  batchUpload (fileList, success, error, progress) {
    let self = this
    let successList = []
    let errorList = []
    let currentIndex = 0

    if (fileList.length == 0) {
      console.warn('批量上传列表为空')
      return
    }

    let successCallBack = function (res) {
      successList.push(res.file)
      progress(successList.length / fileList.length)

      if (successList.length == fileList.length) {
        success(successList)
      } else {
        currentIndex++
        self.hitSliceUpload(fileList[currentIndex], successCallBack, errorCallBack, progressCallBack)
      }
    }

    let errorCallBack = function (res) {
      errorList.push(res.file)

      if ((successList.length + errorList.length) == fileList.length) {
        if (successList.length) {
          success(successList)
        }
        error({
          errorList: errorList,
          successList: successList
        })
      }
    }
    let progressCallBack = function (res) {

    }

    progress(0)
    self.hitSliceUpload(fileList[currentIndex], successCallBack, errorCallBack, progressCallBack)
  }

// 表单上传
  formUpload (options, success, error) {
    this.check(options)
    let that = this
    let method = 'POST'
    let file = options.file || {}
    let fileRename = options.fileRename
    let fileName = this.addPrefix(this.getFileName(file, fileRename))
    let putPolicy = options.putPolicy

    let requestToken = {
      method: method,
      file: file,
      fileName: fileName,
      putPolicy: putPolicy
    }

    this.getUFileToken(requestToken, function (token) {

      let ajax = that.createAjax()
      let url = that.getBucketUrl()
      let reader = new FileReader()

      // FileReader API是异步的,我们需要把读取到的内容存储下来
      reader.addEventListener('load', function () {

        let byteArray = new Uint8Array(reader.result)
        let fileBinary = ''

        for (let i = 0; i < byteArray.length; i++) {
          fileBinary += String.fromCharCode(byteArray[i])
        }

        file.binary = fileBinary

        // 虚拟出Blob格式的fileName
        let blobFileName = new Blob([fileName])
        // Blob格式的fileName的FileReader
        let readerFileName = new FileReader()

        // 取得fileName的特定编码格式
        readerFileName.addEventListener('load', function () {
          let innerByteArray = new Uint8Array(readerFileName.result)
          let innerFileBinary = ''

          for (let i = 0; i < innerByteArray.length; i++) {
            innerFileBinary += String.fromCharCode(innerByteArray[i])
          }

          let reFileName = innerFileBinary

          let boundary = '----UCloudPOSTFormBoundary'
          let data = '--' + boundary + '\r\n' +
            'Content-Disposition: form-data; ' + 'name="FileName"' + '\r\n' + '\r\n' +
            reFileName + '\r\n' +
            '--' + boundary + '\r\n' +
            'Content-Disposition: form-data; ' + 'name="Authorization"' + '\r\n' + '\r\n' +
            token + '\r\n' +
            '--' + boundary + '\r\n' +
            'Content-Disposition: form-data; ' + 'name="file"; ' + 'filename="' + reFileName + '"' + '\r\n' +
            'Content-Type: ' + file.type + '\r\n' + '\r\n' +
            file.binary + '\r\n' +
            '--' + boundary + '--' + '\r\n'

          ajax.open(method, url, true)
          ajax.setRequestHeader('Content-MD5', that.contentMd5)
          ajax.setRequestHeader('Content-Type', 'multipart/form-data; boundary=' + boundary)

          let onreadystatechange = function () {
            if (ajax.readyState == 4) {
              if (ajax.status == 200) {
                success(ajax.response)
              } else {
                error(ajax.response)
              }
            }
          }
          ajax.onreadystatechange = onreadystatechange
          ajax.sendAsBinary(data)

        })

        // 读取Blob格式的fileName
        if (blobFileName) {
          readerFileName.readAsArrayBuffer(blobFileName)
        }
      })

      // 读取文件的二进制内容
      if (file) {
        reader.readAsArrayBuffer(file)
      }

    }, error)
  }

// 获取文件列表
  getFileList (options, success, error) {
    this.check(options)
    let that = this
    let method = 'GET'
    let prefix = options.prefix || that.PREFIX
    let marker = options.marker || ''
    let limit = options.limit || 20

    let requestToken = {
      method: method
    }

    this.getUFileToken(requestToken, function (token) {

      let ajax = that.createAjax()
      let url = that.getBucketUrl() + '?list' +
        '&prefix=' + prefix +
        '&marker=' + marker +
        '&limit=' + limit
      ajax.open(method, url, true)
      ajax.setRequestHeader('Authorization', token)

      let onreadystatechange = function () {
        if (ajax.readyState == 4) {
          if (ajax.status == 200) {
            success(JSON.parse(ajax.response))
          } else {
            error(ajax.responseText)
          }
        }
      }

      ajax.onreadystatechange = onreadystatechange
      ajax.send()

    }, error)
  }

// 删除文件
  deleteFile (fileName, success, error) {
    let that = this
    let method = 'DELETE'
    let requestToken = {
      method: method,
      fileName: fileName
    }

    this.getUFileToken(requestToken, function (token) {

      let ajax = that.createAjax()
      let url = that.getBucketUrl() + encodeURIComponent(fileName)
      ajax.open(method, url, true)
      ajax.setRequestHeader('Authorization', token)

      let onreadystatechange = function () {
        if (ajax.readyState == 4) {
          if (ajax.status == 204) {
            success({
              msg: ajax.responseText,
              file: fileName
            })
          } else {
            error({
              msg: ajax.responseText,
              file: fileName
            })
          }
        }
      }

      ajax.onreadystatechange = onreadystatechange
      ajax.send()

    }, error)
  }

// 批量删除
  batchDelete (fileList, success, error) {
    let self = this
    let successList = []
    let errorList = []

    if (fileList.length == 0) {
      console.warn('删除列表为空')
      return
    }

    for (let i = 0; i < fileList.length; i++) {
      let successCallBack = function (res) {
        successList.push(res.file)

        if (successList.length == fileList.length) {
          success(successList)
        }

      }

      let errorCallBack = function (res) {
        errorList.push(res.file)

        if ((successList.length + errorList.length) == fileList) {
          error({
            successList: successList,
            errorList: errorList
          })
        }
      }

      this.deleteFile(fileList[i], successCallBack, errorCallBack)
    }

  }

// 下载文件
  downloadFile (fileName, success, error, progress) {
    let that = this
    let method = 'GET'
    let requestToken = {
      method: method,
      fileName: fileName
    }

    this.getUFileToken(requestToken, function (token) {

      let ajax = that.createAjax()
      let url = that.getBucketUrl() + encodeURIComponent(fileName)
      ajax.open(method, url, true)
      ajax.responseType = 'blob'
      ajax.setRequestHeader('Authorization', token)

      let onreadystatechange = function () {
        if (ajax.readyState == 4) {
          if (ajax.status == 200) {
            let aTag = document.createElement('a')
            let blob = ajax.response

            aTag.download = fileName
            aTag.href = URL.createObjectURL(blob)
            aTag.click()
            URL.revokeObjectURL(blob)
            success(ajax.response)

          } else {
            error(ajax.response)
          }
        }
      }
      let onprogress = function (event) {
        if (event.lengthComputable) {
          progress(event.loaded / event.total)
        }
      }

      ajax.onreadystatechange = onreadystatechange
      ajax.onprogress = onprogress
      ajax.send()

    }, error)
  }

}



