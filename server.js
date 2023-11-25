const express = require("express");
const cors = require("cors");
const mongoose = require('mongoose');
const dotenv = require("dotenv");
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const axios = require('axios');

const app = express();

dotenv.config({path: "./config.env"});

const corsOption = {
    origin : [process.env.frontEndHost],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}
app.use(cors(corsOption));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads/blogImage', express.static(path.join(__dirname, 'uploads/blogImage')));
app.use('/uploads/profilePhoto', express.static(path.join(__dirname, 'uploads/profilePhoto')));

const db = process.env.databaseURL;

mongoose.connect(db)
.then((result) => {
    console.log("Connected to DB");
}).catch((err) => {
    console.log("Unable to connect");
    console.log(err);
});

const jwtPrivateKey = process.env.jwtPrivateKey;


const port = process.env.port;

app.listen(port, function(){
    console.log("Connected to backend");
});


//Collection making code starts

const Schema = mongoose.Schema;

//Blog users collection
const blogUserSchema = new Schema({
    firstName:{
        type: String,
        required: true,
        maxLength: 50
    },
    middleName: {
        type: String,
        required: false,
        maxLength: 50
    },
    lastName: {
        type: String,
        required: true,
        maxLength: 50
    },
    fullName: {
        type: String,
        required: true,
        maxLength: 150
    },
    username:{
        type: String,
        required: true,
        maxLength: 50,
        unique: true
    },
    emailAddress:{
        type: String,
        required: true,
        maxLength: 50,
        unique: true
    },
    gender: {
        type: String,
        required: true,
        maxLength: 10
    },
    dateOfBirth: {
        type: Date,
        required: true
    },
    password: {
        type: String,
        required: true,
        maxLength: 50,
    },
    userProfilePhoto: {
        type: String,
        required: true,
        maxLength: 75,
    }
});

const BlogUser = mongoose.model('BLOGUSERS', blogUserSchema);


//Blog category collection
const blogCategorySchema =  new Schema({
    categoryID: {
        type: Number,
        required: true,
        unique: true
    },
    categoryName: {
        type: String,
        required: true,
        unique: true
    },
    categoryDescription: {
        type: String,
        required: true
    }
});

const BlogCategory = mongoose.model('BLOGCATEGORY', blogCategorySchema);


//Blog post collection
const blogPostSchema = new Schema({
    postTitle: {
        type: String,
        required: true
    },
    postDescription: {
        type: String,
        required: true
    },
    categoryID: {
        type: Number,
        required: true,
    },
    userID: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "BlogUser"
    },
    postImage: {
        type: String,
        required: true
    },
    postDateTime: {
        type: Date,
        required: true
    },
    postStatus: {
        type: String,
        required: true
    }
});

const BlogPost = mongoose.model('BLOGPOST', blogPostSchema);


//Blog post comment collection
const blogPostCommentSchema = new Schema({
    commentDescription: {
        type: String,
        required: true
    },
    commentDateTime: {
        type: Date,
        required: true
    },
    userID: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "BlogUser"
    },
    postID: {
        type: Schema.Types.ObjectId,
        required: true
    }
});

const BlogPostComment = mongoose.model('BLOGPOSTCOMMENT', blogPostCommentSchema);


//Blog post like collection
const blogPostLikeSchema = new Schema({
    userID: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "BlogUser"
    },
    postID: {
        type: Schema.Types.ObjectId,
        required: true
    }
});

const BlogPostLike = mongoose.model('BLOGPOSTLIKE', blogPostLikeSchema);

//Collection making code ends



//User Registration code starts
app.post("/api/authorization/register", function(req, res){
    const firstName = req.body.firstName;
    const middleName = req.body.middleName;
    const lastName = req.body.lastName;
    const username = req.body.username;
    const gender = req.body.gender;
    const dob = req.body.dob;
    const email = req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    let fullName;
    if(middleName === "" || middleName === null ||middleName === undefined){
        fullName = firstName + " " + lastName;
    }else{
        fullName = firstName + " " + middleName + " " + lastName;
    }
    let profilePhoto;
    if(gender === "Male"){
        profilePhoto = "Male.png";
    }
    else if(gender === "Female"){
        profilePhoto = "Female.jpg"
    }

    BlogUser.findOne({ $or: [{ emailAddress: email }, { username: username }] })
    .then((user) => {
        if(user){
            BlogUser.findOne({ username: username })
            .then((user) => {
                if(user){
                    res.status(409).json("Username already used. Please choose another username");
                }
                else{
                    BlogUser.findOne({ emailAddress: email })
                    .then((user) => {
                        if(user){
                            res.status(409).json("Email address already exist!");
                        }
                    }).catch((err) => {
                        console.log(err);
                    });
                }
            }).catch((err) => {
                console.log(err);
            });
        }
        else{
            if(password === confirmPassword){
                const newUser = new BlogUser({
                    firstName,
                    middleName,
                    lastName,
                    fullName,
                    username,
                    emailAddress: email,
                    gender,
                    dateOfBirth: dob,
                    password,
                    userProfilePhoto: profilePhoto
                });
                newUser.save()
                .then((result) => {
                    res.status(200).json("User has been created successfully");
                }).catch((err) => {
                    console.log(err);
                });
            }
            else{
                res.status(401).json("Password and Confirm Password does not match!");
            }
            
        }
    }).catch((err) => {
        console.log(err);
    });
});
//User Registration code ends


//User Login code starts
app.post("/api/authorization/login", function(req,res){
    const email = req.body.email;
    const loginPassword = req.body.password;
    BlogUser.findOne({ emailAddress: email })
    .then((user) => {
        if(user){
            BlogUser.findOne({ $and: [{ emailAddress: email }, { password: loginPassword }] })
            .then((user) => {
                if(user){
                    const token = jwt.sign({id: user._id}, jwtPrivateKey);
                    res.cookie("jwt_access_token", token, {httpOnly: true});
                    const publicData = {
                        firstName: user.firstName,
                        middleName: user.middleName,
                        lastName: user.lastName,
                        fullName: user.fullName,
                        userID: user._id,
                        username: user.username,
                        emailAddress: user.emailAddress,
                        gender: user.gender,
                        dob: user.dateOfBirth,
                        profilePhoto: user.userProfilePhoto, 
                        jwtToken: token
                    };
                    res.status(200).json(publicData);
                }
                else{
                    res.status(401).json("Incorrect Password");
                }
            }).catch((err) => {
                console.log(err);
            });
        }
        else{
            res.status(401).json("Incorrect Email Address");
        }
    }).catch((err) => {
        console.log(err);
    });
});
//User Login code ends


//Delete Account code starts
app.delete("/api/authorization/deleteAccount/:userID", function(req, res){
    const token = req.body.token || req.cookies.jwt_access_token;
    const userID = req.params.userID;
    if(!token){
        res.status(401).json("Not Authenticated");
    }
    jwt.verify(token, jwtPrivateKey, function(error, userInformation){
        if(userID != userInformation.id){
            res.status(401).json("Not Authenticated");   
        }
        BlogUser.findByIdAndDelete(userID)
        .then((result) => {
            BlogPost.deleteMany( {userID: userID} );
            BlogPostComment.deleteMany( {userID: userID} );
            BlogPostLike.deleteMany( {userID: userID} );
            res.clearCookie("jwt_access_token");
            res.status(200).json("Your account is deleted successfully.");
        }).catch((err) => {
            console.log(err);
        });
    });
});


//User Logout code starts
app.post("/api/authorization/logout", function(req, res){
    res.clearCookie("jwt_access_token");
    res.status(200).json("User has been logout successfully");
});
//User Logout code ends



//Getting all blog category code starts
app.get("/api/blog/categoryList", function(req, res){
    BlogCategory.find()
    .then((result) => {        
        res.status(200).json(result);
    }).catch((err) => {
        console.log(err);
    });
});
//Getting all blog category code starts


//Uploading Image
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const storageLocation = "./uploads/" + file.fieldname;
        cb(null,storageLocation);
    },
    filename: function (req, file, cb) {
        const fileName = Date.now() + file.originalname;    
        cb(null, fileName);
    }
  });
  
const upload = multer({ storage: storage });


//Uploading blog image code starts
app.post("/api/blogImage", upload.single('blogImage'), function(req, res){
    res.status(200).json(req.file);
});
//Uploading blog image code ends


//Adding blog post code starts
app.post("/api/blogPost/newPost/post", function(req, res){
    const title = req.body.title;
    const postDescription = req.body.postDescription;
    const category = req.body.category;
    const imageDetail = req.body.imageDetail;
    if(imageDetail === ""){
        res.status(417).json("Please upload the image");
    }
    const token = req.body.token || req.cookies.jwt_access_token;
    if(!token){
        res.status(401).json("Not Authenticated");
    }
    jwt.verify(token, jwtPrivateKey, function(error, userInformation){
        const currentDate = new Date();
        const newPost = new BlogPost({
            postTitle: title,
            postDescription: postDescription,
            categoryID: category,
            userID: userInformation.id,
            postImage: imageDetail.filename,
            postDateTime: currentDate,
            postStatus: "posted"
        });
        newPost.save()
        .then((result) => {
            res.status(200).json("Blog Post has been added successfully");
        }).catch((err) => {
            console.log(err);
        });        
    });
});
//Adding blog post code ends


//Deleting particular post code starts
app.delete("/api/blogPost/deletePost/:postID", function(req, res){
    const token = req.body.token || req.cookies.jwt_access_token;
    if(!token){
        res.status(401).json("Not Authenticated");
    }
    jwt.verify(token, jwtPrivateKey, function(error, userInformation){
        const postID = req.params.postID;
        const userID = userInformation.id;
        BlogPost.findByIdAndDelete(postID)
        .then((result) => {
            BlogPostComment.deleteMany( {postID: postID} );
            BlogPostLike.deleteMany( {postID: postID} );
            res.status(200).json("Post has been deleted successfully");
        }).catch((err) => {
            console.log(err);
        });
    });
});
//Deleting particular post code ends


//Updating the particular post code starts
app.put("/api/blogPost/updatePost/:postID", function(req, res){
    const token = req.body.token || req.cookies.jwt_access_token;
    const title = req.body.title;
    const postDescription = req.body.postDescription;
    const category = req.body.category;
    const imageDetail = req.body.imageDetail;
    if(!token){
        res.status(401).json("Not Authenticated");
    }
    jwt.verify(token, jwtPrivateKey, function(error, userInformation){
        const postID = req.params.postID;
        const userID = userInformation.id;
        if(imageDetail == null){
            const updateInfo = {
                postTitle: title,
                postDescription: postDescription,
                categoryID: category
            };
            BlogPost.findByIdAndUpdate(postID, {$set: updateInfo })
            .then((result) => {
                res.status(200).json("Post has been successfully updated");
            }).catch((err) => {
                console.log(err);
            });
        }
        else{
            const updateInfo = {
                postTitle: title,
                postDescription: postDescription,
                categoryID: category,
                postImage: imageDetail.filename
            };
            BlogPost.findByIdAndUpdate(postID, {$set: updateInfo })
            .then((result) => {
                res.status(200).json("Post has been successfully updated");
            }).catch((err) => {
                console.log(err);
            });
        }
    });
});
//Updating the particular post code starts


//Updating user info code starts

//Uploading profile picture code starts
app.post("/api/profilePhoto", upload.single('profilePhoto'), function(req, res){
    res.status(200).json(req.file);
});
//Uploading profile picture code starts


//Updating profile picture path in database code starts
app.put("/api/blogUser/update/profilePhoto/:userID", function(req, res){
    const token = req.body.token || req.cookies.jwt_access_token;
    const userID = req.params.userID;
    const imageDetail  = req.body.imageDetail;
    if(!token){
        res.status(401).json("Not Authenticated");
    }
    jwt.verify(token, jwtPrivateKey, function(error, userInformation){
        if(userID != userInformation.id){
            res.status(403).json("Not Authenticated");
        }
        const updateInfo = {
            userProfilePhoto: imageDetail.filename
        };
        BlogUser.findByIdAndUpdate(userID, { $set: updateInfo })
        .then((result) => {
            res.status(200).json("Your Profile Photo is updated successfully");
        }).catch((err) => {
            console.log(err);
        });
    });

});
//Updating profile picture path in database code ends


//Updating basic information code starts
app.put("/api/blogUser/update/basicInfo/:userID", function(req, res){
    const token = req.body.token || req.cookies.jwt_access_token;
    const firstName = req.body.firstName;
    const middleName = req.body.middleName;
    const lastName = req.body.lastName;
    const gender = req.body.gender;
    const dob = req.body.dob;
    const userID = req.params.userID;
    let fullName;
    if(middleName === "" || middleName === null ||middleName === undefined){
        fullName = firstName + " " + lastName;
    }else{
        fullName = firstName + " " + middleName + " " + lastName;
    }
    if(!token){
        res.status(401).json("Not Authenticated");
    }
    jwt.verify(token, jwtPrivateKey, function(error, userInformation){
        if(userID != userInformation.id){
            res.status(403).json("Not Authenticated");
        }
        BlogUser.findOne({ $and: [
            { _id: userID }, 
            { firstName: firstName }, 
            { middleName: middleName },
            { lastName: lastName },
            { fullName: fullName },
            { gender: gender },
            { dateOfBirth: dob }
        ] })
        .then((user) => {
            if(user){
                res.status(417).json("You have not updated any information");
            }
            else{
                const updateInfo = {
                    firstName: firstName,
                    middleName: middleName,
                    lastName: lastName,
                    fullName, fullName,
                    gender: gender,
                    dateOfBirth: dob
                };
                BlogUser.findByIdAndUpdate(userID, { $set: updateInfo })
                .then((result) => {
                    res.status(200).json("Your Basic Information is updated successfully");
                }).catch((err) => {
                    console.log(err);
                });
            }
        }).catch((err) => {
            
        });
    });
});
//Updating basic information code ends


//Updating username and email address code starts
app.put("/api/blogUser/update/usernameEmail/:userID", function(req, res){
    const token = req.body.token || req.cookies.jwt_access_token;
    const username = req.body.username;
    const email = req.body.email;
    const userID = req.params.userID;
    if(!token){
        res.status(401).json("Not Authenticated");
    }
    jwt.verify(token, jwtPrivateKey, function(error, userInformation){
        if(userID != userInformation.id){
            res.status(403).json("Not Authenticated");
        }
        BlogUser.findOne({
            $and: [
                { _id: {$not: { $eq: userID}} },
                { $or: [ {username: username} , {emailAddress: email}]}
            ]
        })
        .then((result1) => {
            if(result1){
                BlogUser.findOne({
                    $and: [
                        { _id: {$not: { $eq: userID}} },
                        { username: username }
                    ]
                })
                .then((result2) => {
                    if(result2){
                        res.status(409).json("Username already used. Please choose another username");
                    }
                    else{
                        BlogUser.findOne({
                            $and: [
                                { _id: {$not: { $eq: userID}} },
                                { emailAddress: email }
                            ]
                        })
                        .then((result3) => {
                            res.status(409).json("Email address already exist!");
                        }).catch((err) => {
                            console.log(err);
                        });
                    }
                }).catch((err) => {
                    console.log(err);
                });
            }
            else{
                BlogUser.findOne({
                    $and: [
                        { _id: userID },
                        { emailAddress: email },
                        { username: username }
                    ]
                })
                .then((result4) => {
                    if (result4) {
                        res.status(417).json("You have not updated any information");
                    }
                    else{
                        const updateInfo = {
                            emailAddress: email,
                            username: username
                        };
                        BlogUser.findByIdAndUpdate(userID, { $set: updateInfo })
                        .then((result) => {
                            res.status(200).json("Your Email Address and Username is updated successfully");
                        }).catch((err) => {
                            console.log(err);
                        });
                    }
                }).catch((err) => {
                    console.log(err);
                });
            }
        }).catch((err) => {
            console.log(err);
        });
    });
});
//Updating username and email address code starts


//Updating users password code starts
app.put("/api/blogUser/update/password/:userID", function(req, res){
    const token = req.body.token || req.cookies.jwt_access_token;
    const oldPassword = req.body.oldPassword;
    const newPassword = req.body.newPassword;;
    const confirmNewPassword = req.body.confirmNewPassword;
    const userID = req.params.userID;
    if(!token){
        res.status(401).json("Not Authenticated");
    }
    jwt.verify(token, jwtPrivateKey, function(error, userInformation){
        if(userID != userInformation.id){
            res.status(403).json("Not Authenticated");
        }
        BlogUser.findOne({
            $and: [
                { _id: userID },
                { password: oldPassword }
            ]
        })
        .then((result) => {
            if(result){
                if(newPassword === confirmNewPassword){
                    BlogUser.findOne({
                        $and: [
                            { _id: userID },
                            { password: newPassword }
                        ]
                    })
                    .then((result2) => {
                        if(result2){
                            res.status(401).json("New Password cannot be same as Old Password");
                        }
                        else{
                            const updateInfo = {
                                password: newPassword
                            };
                            BlogUser.findByIdAndUpdate(userID, { $set: updateInfo})
                            .then((result3) => {
                                res.status(200).json("Password has been updated successfully");
                            }).catch((err) => {
                                console.log(err);
                            });
                        }
                    }).catch((err) => {
                        console.log(err);
                    });
                }
                else{
                    res.status(401).json("New Password and Confirm New Password does not match!");
                }
            }
            else{
                res.status(401).json("You have entered wrong old password");
            }
        }).catch((err) => {
            console.log(err);
        });
    });
});
//Updating users password code ends

//Updating user info code ends


//Adding new comment for particular post code starts
app.post("/api/blogPost/comment/newComment/:postID", function(req, res){
    const token = req.body.token || req.cookies.jwt_access_token;  
    if(!token){
        res.status(401).json("Not Authenticated");
    }
    const postID = req.params.postID;
    const currentDate = new Date(); 
    const newComment = req.body.newComment.trim();
    if(newComment === "" || newComment == null || newComment == undefined){
        res.status(406).json("Blank comment cannot be added.");
    }
    jwt.verify(token, jwtPrivateKey, function(error, userInformation){
        const userID = userInformation.id;
        const newCommentObject = new BlogPostComment({
            commentDescription: newComment,
            commentDateTime: currentDate,
            userID: userInformation.id,
            postID: postID
        });
        newCommentObject.save()
        .then((result) => {
            res.status(200).json("Commented on the post successfully");
        }).catch((err) => {
            console.log(err);
        });
    });
});
//Adding new comment for particular post code ends


//Updating the comment code starts
app.put("/api/blogPost/comment/updateComment/:commentID", function(req, res){
    const token = req.body.token || req.cookies.jwt_access_token;  
    if(!token){
        res.status(401).json("Not Authenticated");
    }
    const commentID = req.params.commentID;
    const currentDate = new Date(); 
    const updatedComment = req.body.updatedComment.trim();
    const userID = req.body.userID;
    if(updatedComment === "" || updatedComment == null || updatedComment == undefined){
        res.status(406).json("Blank comment cannot be added.");
    }
    jwt.verify(token, jwtPrivateKey, function(error, userInformation){
        if(userInformation.id != userID){
            res.status(401).json("Not Authenticated");
        }
        const updateInfo = {
            commentDescription: updatedComment,
            commentDateTime: currentDate
        }
        BlogPostComment.findByIdAndUpdate(commentID, { $set: updateInfo })
        .then((result) => {
            res.status(200).json("Comment on the post updated successfully");
        }).catch((err) => {
           console.log(err); 
        });
    });
});
//Updating the comment code ends


//Delete the comment code starts
app.delete("/api/blogPost/comment/deleteComment/:commentID", function(req, res){
    const token = req.body.token || req.cookies.jwt_access_token;  
    if(!token){
        res.status(401).json("Not Authenticated");
    }
    const commentID = req.params.commentID;
    const userID = req.body.userID;
    jwt.verify(token, jwtPrivateKey, function(error, userInformation){
        if(userInformation.id != userID){
            res.status(401).json("Not Authenticated");
        }
        BlogPostComment.findByIdAndDelete(commentID)
        .then((result) => {
            res.status(200).json("Comment on the post deleted successfully");
        }).catch((err) => {
            console.log(err);
        });
    });
});
//Delete the comment code starts


//Liking the post code starts
app.post("/api/blogPost/like/newLike/:postID", function(req, res){
    const token = req.body.token || req.cookies.jwt_access_token;  
    if(!token){
        res.status(401).json("Not Authenticated");
    }
    const postID = req.params.postID;
    jwt.verify(token, jwtPrivateKey, function(error, userInformation){
        const userID = userInformation.id;
        const newBlogLike = new BlogPostLike({
            userID: userID,
            postID: postID
        });
        newBlogLike.save()
        .then((result) => {
            res.status(200).json("Liked the post successfully");
        }).catch((err) => {
            console.log(err);
        });
    });
});
//Liking the post code ends


//Unliking the post code starts
app.delete("/api/blogPost/unlikePost/:postID", function(req, res){
    const token = req.body.token || req.cookies.jwt_access_token;  
    if(!token){
        res.status(401).json("Not Authenticated");
    }
    const postID = req.params.postID;
    jwt.verify(token, jwtPrivateKey, function(error, userInformation){
        const userID = userInformation.id;
        BlogPostLike.findByIdAndDelete(postID)
        .then((result) => {
            res.status(200).json("Unliked the post successfully");
        }).catch((err) => {
            console.log(err);
        });
    });
});
//Unliking the post code ends


//Making API with blog post information along with user and category code starts

//API with blog info only
app.get("/api/blogPost/postWithUserInfo", function(req, res){
    BlogPost.aggregate([{
        $lookup: {
            from: "blogusers",
            localField: "userID",
            foreignField: "_id",
            as: "userDetails"
        }
    }])
    .then((result) => {
        res.status(200).json(result);
    }).catch((err) => {
        console.log(err);
    });
});


//API with blog info and particular user info
app.get("/api/blogPost/onlyPostInformation", async function(req, res){
    var host = req.get('host');
    var fullHost = "http://" + host;
    const response1 = await axios.get(`${fullHost}/api/blogPost/postWithUserInfo`);
    const postAPI = await response1.data;
    const result = postAPI.map(function(element){
        element.userFullName = element.userDetails[0].fullName;
        element.username = element.userDetails[0].username;
        element.userProfilePhoto = element.userDetails[0].userProfilePhoto;
        return element;
    });
    res.status(200).json(result);
});


//API with blog info, particular user info and particular category info
app.get("/api/blogPost/postWithCategoryInfo", async function(req, res){
    var host = req.get('host');
    var fullHost = "http://" + host;
    const response1 = await axios.get(`${fullHost}/api/blogPost/onlyPostInformation`);
    const postAPI = await response1.data;
    const response2 = await axios.get(`${fullHost}/api/blog/categoryList`);
    const category = await response2.data;
    const postAPIwithCategory = postAPI.map(function(element1){
        category.forEach(function(element2){
            if(element2.categoryID == element1.categoryID){
                element1.categoryName = element2.categoryName;
            }
        });
        delete element1.userDetails;
        delete element1._v;
        return element1;
    });
    res.status(200).json(postAPIwithCategory);
});
//Making API with blog post information only code starts


//Making API with blog post comment with user info code starts
app.get("/api/blogPost/commentWithUserInfo", function(req, res){
    BlogPostComment.aggregate([{
        $lookup: {
            from: "blogusers",
            localField: "userID",
            foreignField: "_id",
            as: "userDetails"
        }
    }])
    .then((result) => {
        res.status(200).json(result);
    }).catch((err) => {
        console.log(err);
    });
});


app.get("/api/blogPost/postWithCommentUserInfo", async function(req, res){
    var host = req.get('host');
    var fullHost = "http://" + host;
    const response1 = await axios.get(`${fullHost}/api/blogPost/commentWithUserInfo`);
    const postAPI = await response1.data;
    const result = postAPI.map(function(element){
        element.userFullName = element.userDetails[0].fullName;
        element.username = element.userDetails[0].username;
        element.userProfilePhoto = element.userDetails[0].userProfilePhoto;
        delete element.userDetails;
        return element;
    });
    res.status(200).json(result);
});
//Making API with blog post comment with user info code ends


//Making API with blog post like with user info code starts
app.get("/api/blogPost/likeWithUserInfo", function(req, res){
    BlogPostLike.aggregate([{
        $lookup: {
            from: "blogusers",
            localField: "userID",
            foreignField: "_id",
            as: "userDetails"
        }
    }])
    .then((result) => {
        res.status(200).json(result);
    }).catch((err) => {
        console.log(err);
    });
});


app.get("/api/blogPost/postWithLikeUserInfo", async function(req, res){
    var host = req.get('host');
    var fullHost = "http://" + host;
    const response1 = await axios.get(`${fullHost}/api/blogPost/likeWithUserInfo`);
    const postAPI = await response1.data;
    const result = postAPI.map(function(element){
        element.userFullName = element.userDetails[0].fullName;
        element.username = element.userDetails[0].username;
        element.userProfilePhoto = element.userDetails[0].userProfilePhoto;
        delete element.userDetails;
        return element;
    });
    res.status(200).json(result);
});
//Making API with blog post like with user info code starts


//Making final API with all info code starts
app.get("/api/blogPost/allPost", async function(req, res){
    var host = req.get('host');
    var fullHost = "http://" + host;
    const response1 = await axios.get(`${fullHost}/api/blogPost/postWithCategoryInfo`);
    const response2 = await axios.get(`${fullHost}/api/blogPost/postWithCommentUserInfo`);
    const response3 = await axios.get(`${fullHost}/api/blogPost/postWithLikeUserInfo`);
    const postsDetailAPI = await response1.data;
    const postsCommentAPI = await response2.data;
    const postsLikeAPI = await response3.data;
    const allPostWithcomments = postsDetailAPI.map(function(postDetail){
        postComment = postsCommentAPI.filter(function(postComment){
            return (postComment.postID === postDetail._id)
        });
        postDetail.postComments = postComment;
        return postDetail;
    });
    const allPostWithcommentsAndLike = allPostWithcomments.map(function(postDetail){
        postLike = postsLikeAPI.filter(function(postLike){
            return (postLike.postID === postDetail._id)
        });
        postDetail.postLike = postLike;
        return postDetail;
    });
    const allPostFull = allPostWithcommentsAndLike.map(function(postDetail){
        postDetail.postID = postDetail._id;
        return postDetail;
    });
    res.status(200).json(allPostFull);
});
//Making final API with all info code starts