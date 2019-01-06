const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
//const passportLocalMongoose = require('passport-local-mongoose');
const session = require('express-session');

require('./db');
const Course = mongoose.model('Course');
const User = mongoose.model('User');

const app = express();
app.set('view engine', 'hbs');

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded());
app.use(session({secret: "shhhsecret", saveUninitialized: false, resave: false}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    if (req.session.passport) {
        User.findByUsername(req.session.passport.user, (err, user) => {
            if (err) {
                next();
            } else {
                res.locals.user = user;
                next();
            }
        });
    } else {
        next();
    }
});

class Assignment {
    constructor(title, details, due, color) {
        this.title = title;
        this.details = details;
        // due comes in from date form in YYYY-MM-DD format
        this.due = due;
        // color is changed when we know what course this is part of
        this.color = color;
        // assignments marked as complete will be grayed out, then gone on next page load
        this.done = false;
    }
}

app.get('/', (req, res) => {
    if (req.session.passport) {
        // will hold arrays of assignments, keyed by due date
        const upcoming = {};
        const overdue = {};

        // current date to determine what is upcoming vs. overdue
        const today = new Date();
        // get current date in same format as stored date (including padding with 0s, so string comparison works): YYYY-MM-DD
        const todayString = today.toISOString().substring(0, 10);

        User.findByUsername(req.session.passport.user, (err, user) => {
            for (let course of user.courses) {
                // skip courses that user did not check (only if they submitted the filter form)
                if (req.query.filter !== undefined && !req.query.filter.includes(course._id.toString())) {
                    continue;
                }
                // filter upcoming incomplete assignments
                const upcomingNotDone = course.assignments.filter(ele => {
                    return (!ele.done && ele.due >= todayString);
                });
                // filter overdue incomplete assignments
                const overdueNotDone = course.assignments.filter(ele => {
                    return (!ele.done && ele.due < todayString);
                });
                // group each set of assignments into objects (keyed by their due dates)
                for (let assignment of upcomingNotDone) {
                    if (upcoming[assignment.due] !== undefined) {
                        upcoming[assignment.due].push(assignment);
                    } else {
                        upcoming[assignment.due] = [assignment];
                    }
                }
                for (let assignment of overdueNotDone) {
                    if (overdue[assignment.due] !== undefined) {
                        overdue[assignment.due].push(assignment);
                    } else {
                        overdue[assignment.due] = [assignment];
                    }
                }
            }
            // convert both objects to arrays
            // 2D array with 1 element for each date, and in the subarray, first element is date while rest are assignments
            let upcomingArr = [];
            for (let date in upcoming) {
                const dateEntry = [];
                // human readable date string
                const dateString = (new Date(date)).toUTCString().substring(0, 16);
                dateEntry.push(dateString);
                dateEntry.push(...upcoming[date]);
                upcomingArr.push(dateEntry);
            }
            let overdueArr = [];
            for (let date in overdue) {
                const dateEntry = [];
                const dateString = (new Date(date)).toUTCString().substring(0, 16);
                dateEntry.push(dateString);
                dateEntry.push(...overdue[date]);
                overdueArr.push(dateEntry);
            }

            // sort both based on date  (so hbs can iterate over them in the right order)
            const dateSort = function(a, b) {
                const aD = new Date(a[0]);
                const bD = new Date(b[0]);
                if (aD < bD) {
                    return -1;
                } else if (aD > bD) {
                    return 1;
                } else {
                    return 0;
                }
            }
            upcomingArr.sort(dateSort);
            overdueArr.sort(dateSort);

            // if upcoming or overdue is empty, set them to null instead of empty array so hbs does not create empty date headers
            if (upcomingArr.length === 0) {
                upcomingArr = null;
            }
            if (overdueArr.length === 0) {
                overdueArr = null;
            }

            res.render('schedule', {upcoming: upcomingArr, overdue: overdueArr, courses: user.courses});
        });
    } else {
        res.redirect('/login');
    }
});

app.get('/login', (req, res) => {
    res.render('login');
});

// TODO how to put an "incorrect login" message on failure?
app.post('/login', passport.authenticate('local', {successRedirect: '/', failureRedirect: '/login'}));

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', (req, res) => {
    // check if passwords match
    if (req.body.password !== req.body.verify) {
        res.render('register', {message: "Passwords do not match"});
    } else {
        // add user if name is not taken (username collision checking is handled by passport-local-mongoose)
        User.register(new User({username: req.body.username}), req.body.password, err => {
            if (err) {
                res.render('register', {message: "Username taken"});
            } else {
                // TODO log user in before redirect?
                console.log(`${req.body.username} registered`);
                res.redirect('/login');
            }
        });
    }
});

app.get('/courses', (req, res) => {
    // if user is logged in, show courses
    if (req.session.passport) {
        User.findByUsername(req.session.passport.user, (err, user) => {
            if (err) {
                res.redirect('/login');
            } else {
                res.render('manage-courses', {courses: user.courses});
            }
        });
    } else {
        // if not logged in, redirect to login page
        res.redirect('/login');
    }
});

app.post('/courses', (req, res) => {
    if (req.session.passport) {
        // create new course. add it to current session's user [Course]
        const newCourse = new Course({
            name: req.body.name,
            color: req.body.color,
            assignments: []
        });
        User.findByUsername(req.session.passport.user, (err, user) => {
            if (err) {
                res.render('/courses', {message: "Error adding course"});
            } else {
                // add course to logged in user property and reload page to show new course
                user.courses.push(newCourse);
                user.save(err => {
                    if (err) {
                        res.render('/courses', {message: "Error adding course"});
                    } else {
                        console.log(`Course ${newCourse.name} added for ${user.username}`);
                        res.render('manage-courses', {message: `Course ${newCourse.name} added`, courses: user.courses});
                    }
                });
            }
        });
    }
});

app.get('/assignments', (req, res) => {
    if (req.session.passport) {
        User.findByUsername(req.session.passport.user, (err, user) => {
            res.render('manage-assignments', {courses: user.courses});
        });
    } else {
        res.redirect('/login');
    }
});

app.post('/assignments', (req, res) => {
    if (req.session.passport) {
        User.findByUsername(req.session.passport.user, (err, user) => {
            const course = user.courses.id(req.body.courseID);
            const newAssignment = new Assignment(req.body.title, req.body.details, req.body.date, course.color);
            course.assignments.push(newAssignment);
            user.save(err => {
                if (err) {
                    res.render('manage-assignments', {message: 'Error adding assignment', courses: user.courses});
                } else {
                    res.render('manage-assignments', {message: `"${newAssignment.title}" added to ${course.name}`,  courses: user.courses});
                }
            });
        });
    }
});

app.get('/logout', (req, res) => {
    if (req.session.passport) {
        req.logout();
        res.redirect('/login');
    } else {
        res.redirect('/login');
    }
});

app.listen(process.env.PORT || 3000);
