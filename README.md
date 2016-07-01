#aliyun-oss-stream
***
##背景说明：
由于项目需要往阿里云上传大文件，并且是用户通过web上传的，因而无法使用通常省事的putObject方式，<br>
期间查找了一个stream包，也是官方推荐的包：[aliyun-oss-upload-stream](https://github.com/berwin/aliyun-oss-upload-stream/blob/master/README.md),但是发现使用的过程中，报了各种链接错误、上传包太小等错误。给作者反馈没得到及时修补，因而，自己参照了[aliyun-sdk](https://github.com/aliyun-UED/aliyun-sdk-js/blob/master/samples/oss/multipartUpload.js) 中的例子写了这个module。算是抛砖引玉吧~
##使用方法：
`
var ALY = require('aliyun-sdk');
var oss = new ALY.OSS({
  "accessKeyId": '阿里云accessKeyId',
  "secretAccessKey": '阿里云secretAccessKey',
  "endpoint": '阿里云endpoint',
  // 这是 oss sdk 目前支持最新的 api 版本, 不需要修改
  "apiVersion": '2013-10-15'
});
var upload = require('aliyun-oss-stream');
upload({
	oss: oss,
	Bucket: '阿里云Bucket',
	Key: '保存的文件路径',
	partSize: 5 * 1024 * 1024,  //每次上传包的大小，byte，可选，默认5MB(5*1024*1024)
	maxTryNum: 3		//包最多尝试上传次数,可选，默认为3次
}, function(err, result) {
	if(err) return console.log(err);
	console.log('success:', result);
});
	
`