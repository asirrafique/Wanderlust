const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
});

userSchema.methods.validatePassword = async function (password) {
  if (!password || !this.password) {
    return false;
  }
  const bcrypt = require("bcrypt");
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);
