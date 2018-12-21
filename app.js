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
            for (course of user.courses) {
                // skip courses that user did not check (only if they submitted the filter form)
                if (req.query.filter !== undefined && !req.query.filter.includes(course.name)) {
                    continue;
                }
                // filter assignment array to only incomplete ones (as of now there isnt actually a way to mark them done, but that will come one day i swear)
                const notDoneAssignments = course.assignments.filter((ele) => {
                    return !ele.done;
                });
                // filter incomplete assignments into those that are past due vs. those that are still coming up
                const upcomingNotDone = notDoneAssignments.filter((ele) => {
                    return (ele.due >= todayString);
                });
                const overdueNotDone = notDoneAssignments.filter((ele) => {
                    return (ele.due < todayString);
                });
                // group each set of assignments into objects (keyed by their due dates)
                for (assignment of upcomingNotDone) {
                    if (upcoming[assignment.due] !== undefined) {
                        upcoming[assignment.due].push(assignment);
                    } else {
                        upcoming[assignment.due] = [assignment];
                    }
                }
                for (assignment of overdueNotDone) {
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
            for (date in upcoming) {
                const dateEntry = [];
                const dateString = (new Date(date)).toUTCString().substring(0, 16);
                dateEntry.push(dateString);
                dateEntry.push(...upcoming[date]);
                upcomingArr.push(dateEntry);
            }
            let overdueArr = [];
            for (date in overdue) {
                const dateEntry = [];
                // human readable date string
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

            // if either is empty, set them to null instead of empty array so hbs knows not to even create headers
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
        // add user if name is not taken (username checking is handled by passport-local-mongoose)
        User.register(new User({username: req.body.username}), req.body.password, (err) => {
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
    // create new course. add it to user in session's courses property
    const newCourse = new Course({
        name: req.body.name,
        color: req.body.color,
        assignments: []
    });
    newCourse.save((err) => {
        if (err) {
            res.render('/courses', {message: "Error adding course"});
        } else {
            // find currently logged in user
            User.findByUsername(req.session.passport.user, (err, user) => {
                if (err) {
                    res.render('/courses', {message: "Error adding course"});
                } else {
                    // add course to logged in user property and reload page to show new course
                    user.courses.push(newCourse);
                    user.save((err) => {
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
    User.findByUsername(req.session.passport.user, (err, user) => {
        for (current of user.courses) {
            // there should never be a case where it doesnt find a match
            if (current.name === req.body.course) {
                const newAssignment = new Assignment(req.body.title, req.body.details, req.body.date, current.color);
                current.assignments.push(newAssignment);
                user.save((err) => {
                    if (err) {
                        res.render('manage-assignments', {message: 'Error saving user', courses: user.courses});
                    } else {
                        Course.findById(current._id, (err, course) => {
                            course.assignments.push(newAssignment);
                            course.save((err) => {
                                if (err) {
                                    res.render('manage-assignments', {message: 'Error saving course', courses: user.courses});
                                } else {
                                    res.render('manage-assignments', {message: `"${newAssignment.title}" added to ${course.name}`,  courses: user.courses});
                                }
                            });
                        });
                    }
                });
            }
        }
    });
});

app.get('/logout', (req, res) => {
    if (req.session.passport) {
        req.logout();
        res.redirect('/login');
    } else {
        res.redirect('/login');
    }
});

// TODO have function that deals with redirecting and printing errors in case of problem?

app.listen(process.env.PORT || 3000);
