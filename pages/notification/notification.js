const util = require("../../utils/util");
Page({
    data:{
        activeTab: "like",
        action: "点赞",
        like:{
            likeUser:[],
            likeUserInfo:[]
        },
        favourite: {
            favoriteUser: [],
            favoriteUserInfo: []
        },
        comment:{
            commentUser: [],
            commentUserInfo: []
        }
    },

    async loadNotification(){
        try{
            var openId = "";
            try{
                const wxContext = await wx.cloud.callFunction({
                    name: "getOpenID"
                });
                openId = wxContext.result.openid;

                console.log("获取用户id", openId);
            }catch(err){
                console.log("获取用户id失败");
            }

        }catch(err){
            console.log("加载notification失败");
        }

        try{
            wx.cloud.database().collection("notification").doc(openId).get()
                .then(async res => {
                    for (let i = 0; i <res.data.posts.length; i++) {
                        for (let j = 0; j < res.data.posts[i].likeUser.length; j++) {
                            if(res.data.posts[i].likeUser[j]!=null) {
                                this.data.like.likeUser.push(res.data.posts[i].likeUser[j]);
                                this.setData({
                                    [`like.likeUser`]: this.data.like.likeUser
                                });
                            }
                        }
                    }
                    for (let i1 = 0; i1 <res.data.posts.length; i1++) {
                        for (let j1 = 0; j1 < res.data.posts[i1].favoriteUser.length; j1++) {
                            if(res.data.posts[i1].favoriteUser[j1]!=null) {
                                this.data.favourite.favoriteUser.push(res.data.posts[i1].favoriteUser[j1]);
                                this.setData({
                                    [`favourite.favoriteUser`]: this.data.favourite.favoriteUser
                                });
                            }
                        }
                    }
                    for (let i2 = 0; i2 <res.data.posts.length; i2++) {
                        for (let j2 = 0; j2 < res.data.posts[i2].comment.length; j2++) {
                            this.data.comment.commentUser.push(res.data.posts[i2].comment[j2]);
                            this.setData({
                                [`comment.commentUser`]: this.data.comment.commentUser
                            });
                        }
                    }

                    this.setData({
                        [`like.likeUser`]: this.data.like.likeUser.sort((a, b) => b.likeTime - a.likeTime),
                        [`favourite.favoriteUser`]: this.data.favourite.favoriteUser.sort((a, b) => b.favoriteTime - a.favoriteTime),
                        [`comment.commentUser`]: this.data.comment.commentUser.sort((a, b) => b.favoriteTime - a.favoriteTime)
                    });

                    console.log(this.data.like.likeUser);
                    console.log(this.data.favourite.favoriteUser);
                    console.log(this.data.comment.commentUser);

                    for (let i = 0; i < this.data.like.likeUser.length; i++) {
                        await wx.cloud.database().collection("users").where({
                            openid: this.data.like.likeUser[i].openid
                        }).get()
                            .then(result => {
                                const date = new Date(this.data.like.likeUser[i].likeTime);  // 参数需要毫秒数，所以这里将秒数乘于 1000
                                let info = {
                                    avatar: result.data[0].avatarUrl,
                                    name: result.data[0].nickName,
                                    time: util.formatRelativeTime(date),
                                    postTitle: this.data.like.likeUser[i].postTitle
                                };
                                this.data.like.likeUserInfo.push(info);
                                this.setData({
                                    [`like.likeUserInfo`]: this.data.like.likeUserInfo
                                });
                                console.log(this.data.like.likeUserInfo);
                            })
                    }

                    for (let i = 0; i < this.data.favourite.favoriteUser.length; i++) {
                        await wx.cloud.database().collection("users").where({
                            openid: this.data.favourite.favoriteUser[i].openid
                        }).get()
                            .then(result => {
                                const date = new Date(this.data.favourite.favoriteUser[i].favoriteTime);  // 参数需要毫秒数，所以这里将秒数乘于 1000
                                let info = {
                                    avatar: result.data[0].avatarUrl,
                                    name: result.data[0].nickName,
                                    time: util.formatRelativeTime(date),
                                    postTitle: this.data.favourite.favoriteUser[i].postTitle
                                };
                                this.data.favourite.favoriteUserInfo.push(info);
                                this.setData({
                                    [`favourite.favoriteUserInfo`]: this.data.favourite.favoriteUserInfo
                                });
                                console.log(this.data.favourite.favoriteUserInfo);
                            })
                    }

                    for (let i = 0; i < this.data.comment.commentUser.length; i++) {
                        await wx.cloud.database().collection("users").where({
                            openid: this.data.comment.commentUser[i].openid
                        }).get()
                            .then(result => {
                                const date = new Date(this.data.comment.commentUser[i].commentTime);  // 参数需要毫秒数，所以这里将秒数乘于 1000
                                let info = {
                                    avatar: result.data[0].avatarUrl,
                                    name: result.data[0].nickName,
                                    time: util.formatRelativeTime(date),
                                    postTitle: this.data.comment.commentUser[i].postTitle,
                                    content:this.data.comment.commentUser[i].commentContent.length>10 ? this.data.comment.commentUser[i].commentContent.slice(0,10) + "..." : this.data.comment.commentUser[i].commentContent
                                };
                                this.data.comment.commentUserInfo.push(info);
                                this.setData({
                                    [`comment.commentUserInfo`]: this.data.comment.commentUserInfo
                                });
                                console.log(this.data.comment.commentUserInfo);
                            })
                    }


                })
                .catch(err => {
                    console.log("拉取notification数据失败");
                })
        }catch (err){
            console.log("失败");
        }

    },

    onLoad() {
        console.log("加载notification")
        this.loadNotification();
    },

    async markAllRead(){
        let openId = "";
        try{
            const wxContext = await wx.cloud.callFunction({
                name: "getOpenID"
            });
            openId = wxContext.result.openid;

            console.log("获取用户id", openId);
        }catch(err){
            console.log("获取用户id失败");
        }
        wx.cloud.database().collection("notification").doc(openId).update({
            data: {
                isRead: true
            },
            success: function (res){
                console.log(res.data);
            }
        });
    },

    switchTab(event){
        if (event.target.dataset.tab==="like") {
            this.setData({
                action: "点赞",
                activeTab: event.target.dataset.tab
            });
        }
        else if (event.target.dataset.tab==="favourite") {
            this.setData({
                action: "收藏",
                activeTab: event.target.dataset.tab
            });
        }
        else if (event.target.dataset.tab==="comment") {
            this.setData({
                action: "评论",
                activeTab: event.target.dataset.tab
            });
        }
        else {
            this.setData({
                action: "",
                activeTab: ""
            })
        }
        console.log(this.data.activeTab)
    }

})