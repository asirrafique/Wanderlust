const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const listingSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  image: {
    filename: String,
    url: {
      type: String,
      default: "https://unsplash.com/photos/waves-of-body-of-water-splashing-on-sand-mBQIfKlvowM",
      set: (v) =>
        v === ""
          ? "https://unsplash.com/photos/waves-of-body-of-water-splashing-on-sand-mBQIfKlvowM"
          : v,
    },
  },
  price: Number,
  location: String,
  country: String,
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;
