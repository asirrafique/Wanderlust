const bcrypt = require("bcrypt");
const User = require("../models/user");

module.exports.renderSignupForm = (req, res) => {
  res.render("users/signup.ejs");
};

module.exports.signup = async (req, res) => {
  try {
    let { username, email, password } = req.body;
    username = username?.trim();
    email = email?.trim();

    if (!username || !email || !password) {
      req.flash("error", "Username, email, and password are all required.");
      return res.redirect("/signup");
    }

    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (existingUser) {
      const errorMessage = existingUser.username === username
        ? "That username is already taken."
        : "That email is already registered.";
      req.flash("error", errorMessage);
      return res.redirect("/signup");
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({ email, username, password: hashedPassword });
    const registeredUser = await newUser.save();

    req.login(registeredUser, (err) => {
      if (err) {
        console.error("Login after signup error:", err);
        req.flash("success", "Welcome to Wanderlust!");
        return res.redirect("/listings");
      }
      req.flash("success", "Welcome to Wanderlust!");
      return res.redirect("/listings");
    });
  } catch (e) {
    console.error("Signup error:", e);
    let errorMessage = "Unable to create account. Please try again.";
    if (e.code === 11000) {
      if (e.keyPattern && e.keyPattern.username) {
        errorMessage = "That username is already taken.";
      } else if (e.keyPattern && e.keyPattern.email) {
        errorMessage = "That email is already registered.";
      }
    }
    req.flash("error", errorMessage);
    return res.redirect("/signup");
  }
};

module.exports.renderLoginForm = (req, res) => {
  res.render("users/login.ejs");
};

module.exports.login = async (req, res) => {
  req.flash("success", "Welcome back to Wanderlust!");
  let redirectUrl = res.locals.redirectUrl || "/listings";
  return res.redirect(redirectUrl);
};

module.exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.session.destroy(() => {
      req.flash("success", "you are logged out!");
      res.redirect("/listings");
    });
  });
};
