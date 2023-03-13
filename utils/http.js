var config = require("config.js");

//统一的网络请求方法
function request(params, isGetTonken) {
  // 全局变量
  var globalData = getApp().globalData;
  // 如果正在进行登陆，就将非登陆请求放在队列中等待登陆完毕后进行调用
  // if (!isGetTonken && globalData.isLanding) {
  //   globalData.requestQueue.push(params);
  //   return;
  // }
  wx.request({
    url: config.domain + params.url, //接口请求地址
    data: params.data,
    header: {
      // 'content-type': params.method == "GET" ? 'application/x-www-form-urlencoded' : 'application/json;charset=utf-8',
      'Authorization': params.login ? undefined : wx.getStorageSync('token')
    },
    method: params.method == undefined ? "POST" : params.method,
    dataType: 'json',
    responseType: params.responseType == undefined ? 'text' : params.responseType,
    success: function(res) {
			const responseData = res.data

      // 00000 请求成功
      if (responseData.code === '00000') {
        if (params.callBack) {
          params.callBack(responseData.data);
        }
        return
      }

      // A00004 未授权
      if (responseData.code === 'A00004') {
        wx.navigateTo({
          url: '/pages/login/login',
        })
				return
      }

      // A00005 服务器出了点小差
      if (responseData.code === 'A00005') {
        console.error('============== 请求异常 ==============')
        console.log('接口: ', params.url)
        console.log('异常信息: ', responseData)
        console.error('============== 请求异常 ==============')
        if (params.errCallBack) {
          params.errCallBack(responseData)
          return
        }
        wx.showToast({
          title: '服务器出了点小差~',
          icon: 'none'
        })
      }

      // A00001 用于直接显示提示用户的错误，内容由输入内容决定
      if (responseData.code === 'A00001') {
        if (params.errCallBack) {
          params.errCallBack(responseData)
          return
        }
        wx.showToast({
          title: responseData.msg || 'Error',
          icon: 'none'
        })
        return
      }

      // 其他异常
      if (responseData.code !== '00000') {
        // console.log('params', params)
      	wx.hideLoading();
        if (params.errCallBack) {
          params.errCallBack(responseData)
        } else {
          console.log(`接口: ${params.url}`)
          console.log(`返回信息： `, res)
        }
      }
      if (!globalData.isLanding) {
        wx.hideLoading();
      }
    },
    fail: function(err) {
      wx.hideLoading();
      wx.showToast({
        title: "服务器出了点小差",
        icon: "none"
      });
    }
  })
}

//通过code获取token,并保存到缓存
var getToken = function() {
  wx.login({
    success: res => {
      // 发送 res.code 到后台换取 openId, sessionKey, unionId
      request({
        login: true,
        url: '/login?grant_type=mini_app',
        data: {
          principal: res.code
        },
        callBack: result => {
          // 没有获取到用户昵称，说明服务器没有保存用户的昵称，也就是用户授权的信息并没有传到服务器
          if (!result.nickName) {
            updateUserInfo();
          }
          if (result.userStutas == 0) {
            wx.showModal({
              showCancel: false,
              title: '提示',
              content: '您已被禁用，不能购买，请联系客服'
            })
            wx.setStorageSync('token', '');
          } else {
            wx.setStorageSync('token', 'bearer' + result.access_token); //把token存入缓存，请求接口数据时要用
          }
          var globalData = getApp().globalData;
          globalData.isLanding = false;
          while (globalData.requestQueue.length) {
            request(globalData.requestQueue.pop());
          }
        }
      }, true)

    }
  })
}

// 更新用户头像昵称
function updateUserInfo() {
  wx.getUserInfo({
    success: (res) => {
      var userInfo = JSON.parse(res.rawData)
      request({
        url: "/p/user/setUserInfo",
        method: "PUT",
        data: {
          avatarUrl: userInfo.avatarUrl,
          nickName: userInfo.nickName
        }
      });
    }
  })
}

//获取购物车商品数量
function getCartCount() {
  var params = {
    url: "/p/shopCart/prodCount",
    method: "GET",
    data: {},
    callBack: function(res) {
      if (res > 0) {
        wx.setTabBarBadge({
          index: 2,
          text: res + "",
        })
        var app = getApp();
        app.globalData.totalCartCount = res;
      } else {
        wx.removeTabBarBadge({
          index: 2
        })
        var app = getApp();
        app.globalData.totalCartCount = 0;
      }
    }
  };
  request(params);
}


exports.getToken = getToken;
exports.request = request;
exports.getCartCount = getCartCount;
exports.updateUserInfo = updateUserInfo;