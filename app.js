const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8', '208.67.222.222']);

if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}
console.log("Loaded Mapbox Token:", process.env.MAPBOX_TOKEN);

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

const dbUrl = process.env.ATLASDB_URL || process.env.MONGODB_URI || process.env.MONGO_URL || "mongodb://127.0.0.1:27017/wanderlust";

// ✅ MongoDB Connection (TLS safe for Atlas) with retry logic
const MAX_RETRIES = 5;
let retries = 0;

async function main() {
  const connectWithRetry = async () => {
    try {
      await mongoose.connect(dbUrl, {
        serverSelectionTimeoutMS: 5000,
        tlsAllowInvalidCertificates: false,
      });
      console.log("✅ MongoDB connected successfully");
    } catch (err) {
      retries++;
      console.error(
        `❌ MongoDB connection error (Attempt ${retries}):`,
        err.message
      );
      if (retries < MAX_RETRIES) {
        console.log("🔄 Retrying in 5 seconds...");
        setTimeout(connectWithRetry, 5000);
      } else {
        console.error(
          "💥 Could not connect to MongoDB after multiple attempts."
        );
      }
    }
  };
  connectWithRetry();
}

main();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

// ✅ MongoStore Session (falls back to memory store if MongoDB is unavailable)
let store;

try {
  store = MongoStore.create({
    mongoUrl: dbUrl,
    touchAfter: 24 * 3600,
  });

  store.on("error", (err) => {
    console.log("❌ ERROR in MONGO SESSION STORE:", err);
  });
} catch (err) {
  console.warn("⚠️ Mongo session store could not be initialized:", err.message);
}

const sessionOptions = {
  secret: process.env.SECRET || "fallback-secret",
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

if (store) {
  sessionOptions.store = store;
}

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    username = username?.trim();
    if (!username || !password) {
      return done(null, false, { message: "Invalid username or password" });
    }
    const user = await User.findOne({ username });
    if (!user || !user.password) {
      return done(null, false, { message: "Invalid username or password" });
    }
    const validPassword = await user.validatePassword(password);
    if (!validPassword) {
      return done(null, false, { message: "Invalid username or password" });
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// ✅ Middleware: make variables available in all EJS views
app.use((req, res, next) => {
  res.locals.success = req.flash("success") || [];
  res.locals.error = req.flash("error") || [];
  res.locals.currUser = req.user || null;
  next();
});

// Routes
app.get("/", (req, res) => {
  res.redirect("/listings");
});
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

// Error handler
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  const { statusCode = 500, message = "Something went wrong!" } = err;
  res.status(statusCode).render("error.ejs", { message });
});

app.listen(8080, () => {
  console.log("🚀 Server is listening on port 8080");
});
