import React from "react";
import ReactDOM from "react-dom";

import UCloudUFile from "../dist/ucloud-ufile.min.js";

//import { UCloudUFile } from '../src'

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { file: "", name: "" };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.fileInput = React.createRef();
    this.ufile = new UCloudUFile(
      "example-ucloud",
      "https://private-87040-publicexample.apiary-mock.com/upload",
      "https://private-87040-publicexample.apiary-mock.com/upload/token"
    );
  }

  upload(file) {
    if (Object.prototype.toString.call(file) !== "[object File]") {
      throw new Error("file参数必须为File数据类型");
    }

    return new Promise((resolve, reject) => {
      this.ufile.PREFIX = `example/${file.type}`;

      const success = res => {
        if (Object.prototype.toString.call(res) !== "[object Object]") {
          res = { Key: file.name };
        }
        res.url = `http://dummyimage.com/200x100/50B347/FFF&text=${res.Key}`;
        console.log("success", res);
        this.setState({ file: res.url });
        resolve({ data: res });
      };

      const error = res => {
        reject(new Error("上传失败"));
      };

      const progress = res => {
        if (Object.prototype.toString.call(res) !== "[object Object]") {
          res = { value: 0 };
        }
        console.log("progress", res);
        //          var tips = ''
        //          if (res.status == 'init') {
        //            tips = '初始化分片：'
        //          } else if (res.status == 'uploading') {
        //            tips = '分片上传中：'
        //          } else if (res.status == 'uploaded') {
        //            tips = '完成分片：'
        //          }
        //          var percentComplete = (res.value * 100) + '%'
        res.percent = res.value * 100;
      };

      this.ufile.hitSliceUpload(file, success, error, progress);
    });
  }

  handleChange(event) {
    const file = this.fileInput.current.files[0];
    if (file) {
      this.setState({ name: file.name });
    } else {
      this.setState({ name: "" });
    }
  }

  handleSubmit(event) {
    event.preventDefault();
    const file = this.fileInput.current.files[0];
    if (file) {
      this.upload(file);
    }
  }

  render() {
    return (
      <div>
        <form onSubmit={this.handleSubmit}>
          <label>
            Upload file:
            <input
              type="file"
              ref={this.fileInput}
              onChange={this.handleChange}
            />
          </label>
          <br />
          <button type="submit">Submit</button>
        </form>
        <div>fileName: {this.state.name}</div>
        {this.state.file && (
          <img
            style={{ width: "100px", height: "100px" }}
            src={this.state.file}
          />
        )}
      </div>
    );
  }
}

ReactDOM.render(<App />, document.getElementById("app"));
