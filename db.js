const mongoose = require('mongoose');
const passportLocal = require('passport-local');
const passportLocalMongoose = require('passport-local-mongoose');

// a single class/course
    // each course has a name and associated color used when viewing (chosen by user)
    // contains list of assignments created under that course
const CourseSchema = new mongoose.Schema({
    name: String,
    color: {type: String, enum: ['red', 'blue', 'green', 'purple', 'orange']},
    // this will hold embedded es6 assignment class objects
    assignments: [mongoose.Schema.Types.Mixed]
});

// user accounts
    // username and password provided by user
        // passwords are hashed before storing
    // list of courses that user has set up
        // there will be an unnamed class for every user by default, for uncategorized assignments
const UserSchema = new mongoose.Schema({
    // passport plugin automatically creates username, hash, and salt fields
    courses: [CourseSchema]
});

UserSchema.plugin(passportLocalMongoose);

mongoose.model('User', UserSchema);
mongoose.model('Course', CourseSchema);


let dbconf;
if (process.env.NODE_ENV === 'PRODUCTION') {
    const fs = require('fs');
    const path = require('path');
    const fn = path.join(__dirname, 'config.json');
    const data = fs.readFileSync(fn);
    const conf = JSON.parse(data);
    dbconf = conf.dbconf;
    console.log('Using PRODUCTION env with credentials.')
} else {
    dbconf = 'mongodb://localhost/study';
    console.log('Using local env with no credentials.')
}
mongoose.connect(dbconf);
