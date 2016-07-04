/**
 * Created by lizude on 16/6/27.
 */
'use strict';

var Writable = require('stream').Writable;
var events = require('events');

module.exports = function(options, cb) {
  var oss = options.oss;              //阿里云对象
  var e = new events.EventEmitter();
  var ws = new Writable();
  var content = new Buffer('');    //缓存流内容
  var partSize = options.partSize || 5 * 1024 * 1024;  //每次上传包大小,默认为5MB
  var multipart = null;                               //初始化的mutipart
  var ended = false;                                  //标记流是否结束
  var errorEmited = false;                            //标记是否已经报错
  var maxTryNum = options.maxTryNum || 3;            //最多尝试上传次数
  var pendingNum = 0;                                 //正在上传的包个数
  var partNum = 0;                                  //第n个包
  var multipartMap = {          //保存上传成功后,服务返回的数据,用于最后完成提交验证
    Parts: []
  };
  var parts = [];               //缓存包
  var ready = 0;                //是否可以上传

  //缓存六数据
  var saveChunk = function(chunk) {
    content = Buffer.concat([content, chunk]);
  };

  //获取上传的包,每个大小为partSize,除了最后一个包
  var getChunk = function() {
    if(!ended && content.length < partSize) return null;
    var end = Math.min(content.length, partSize);
    var part = content.slice(0, end);
    content = content.slice(end);
    return part;
  };

  //触发错误,且只触发一次
  var emitError = function(err) {
    if(errorEmited) return;
    errorEmited = true;
    e.emit('error', err);
  };

  //完成上传
  var completeMultipartUpload = function(doneParams) {
    oss.completeMultipartUpload(doneParams, function (err, data) {
      if (err) {
        emitError(err);
      } else {
        cb(null, data);
      }
    });
  };

  //上传包
  var uploadPart = function(partParams, tryNum) {
    var tryNum = tryNum || 1;
    if(tryNum === 1) {
      pendingNum++;
    }
    oss.uploadPart(partParams, function (multiErr, mData) {
      if (multiErr) {
        if (tryNum < maxTryNum) {
          uploadPart(multipart, partParams, tryNum + 1);
        } else {
          pendingNum--;
        }
        return;
      }
      pendingNum--;
      multipartMap.Parts[this.request.params.PartNumber - 1] = {
        ETag: mData.ETag,
        PartNumber: Number(this.request.params.PartNumber)
      };
      //finished
      if(ended && !pendingNum && !parts.length) {
        completeMultipartUpload({
          Bucket: options.Bucket,
          Key: options.Key,
          CompleteMultipartUpload: multipartMap,
          UploadId: multipart.UploadId
        });
      }
    });
  };


  var uploadToOss = function() {
    var part = getChunk();
    if(part === null) {
      return;
    }
    parts.push(part);
    if(ready === 2) {
      for(var i = 0, len = parts.length; i < len; i++) {
        uploadPart({
          Body: parts[i],
          Bucket: options.Bucket,
          Key: options.Key,
          PartNumber: String(++partNum),
          UploadId: multipart.UploadId
        });
      }
      parts = [];
    } else if(ready === 0) {
      ready = 1;
      createMultipartUpload();
    }

  };

  //Create multiple upload
  var createMultipartUpload = function() {
    oss.createMultipartUpload({
      ACL: 'public-read',
      Bucket: options.Bucket,
      Key: options.Key
    }, function (err, mp) {
      if (err) {
        emitError(err);
        return;
      }
      multipart = mp;
      ready = 2;
      uploadToOss();
    });
  };

  e.once('error', function(err) {
    cb(err);
  });

  ws._write = function(chunk, encoding, next) {
    //console.log('Receive chunk:', chunk);
    saveChunk(chunk);
    uploadToOss();
    next();
  };

  ws.end = function() {
    //console.log('pipe end!');
    ended = true;
    uploadToOss();
  };

  options.stream.pipe(ws);
};

