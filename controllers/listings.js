console.log("Mapbox Token in Render:", process.env.MAPBOX_TOKEN);
const Listing = require("../models/listing");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapToken = process.env.MAPBOX_TOKEN || process.env.MAP_TOKEN;
const geocodingClient = mapToken ? mbxGeocoding({ accessToken: mapToken }) : null;

const escapeRegex = (text) => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const buildPhraseRegex = (text) => {
  const escaped = escapeRegex(text);
  return new RegExp(escaped.split(/\s+/).join(".*"), "i");
};

module.exports.index = async (req, res) => {
  try {
    const searchQuery = req.query.search?.trim();
    let filter = {};

    if (searchQuery) {
      const regex = buildPhraseRegex(searchQuery);
      filter = {
        $or: [
          { title: regex },
          { location: regex },
          { country: regex },
        ],
      };
    }

    const allListings = await Listing.find(filter);
    res.render("listings/index.ejs", { allListings, searchQuery });
  } catch (err) {
    console.error("Listing fetch failed:", err.message);
    res.render("listings/index.ejs", { allListings: [], searchQuery: req.query.search?.trim() || "" });
  }
};

module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
  let { id } = req.params;

  try {
    const listing = await Listing.findById(id)
      .populate({
        path: "reviews",
        populate: {
          path: "author",
        },
      })
      .populate("owner");

    if (!listing) {
      req.flash("error", "Listing you requested for does not exist!");
      return res.redirect("/listings");
    }

    const coords = listing.geometry?.coordinates;
    const hasAddress = Boolean(listing.address?.trim());
    const needsRegeo =
      !coords ||
      !Array.isArray(coords) ||
      coords.length !== 2 ||
      (coords[0] === 0 && coords[1] === 0);

    if (hasAddress && geocodingClient) {
      const geoResult = await getGeometryFromLocation(listing);
      if (geoResult?.geometry) {
        listing.geometry = geoResult.geometry;
        await listing.save();
        console.log("Updated geometry for listing:", listing.title, geoResult.place_name);
      }
    } else if (needsRegeo && geocodingClient) {
      const geoResult = await getGeometryFromLocation(listing);
      if (geoResult?.geometry) {
        listing.geometry = geoResult.geometry;
        await listing.save();
        console.log("Updated geometry for listing:", listing.title, geoResult.place_name);
      }
    }

    console.log(listing);
    return res.render("listings/show.ejs", { listing });
  } catch (err) {
    console.error("Listing detail fetch failed:", err.message);
    req.flash("error", "Unable to load listing right now.");
    return res.redirect("/listings");
  }
};

const getBestGeocodeQuery = (listingData) => {
  const locationParts = [listingData.address, listingData.title, listingData.location, listingData.country].filter(Boolean);
  return locationParts.join(", ");
};

const getGeometryFromLocation = async (listingData) => {
  const query = getBestGeocodeQuery(listingData);
  if (!geocodingClient || !query) return null;

  const response = await geocodingClient
    .forwardGeocode({
      query,
      limit: 1,
      types: ["poi", "address", "place", "locality", "region", "country"],
    })
    .send();

  return {
    geometry: response?.body?.features?.[0]?.geometry,
    place_name: response?.body?.features?.[0]?.place_name,
    query,
  };
};

module.exports.createListing = async (req, res, next) => {
  const listingData = req.body.listing;
  const geoResult = await getGeometryFromLocation(listingData);

  let url = req.file.path;
  let filename = req.file.filename;
  const newListing = new Listing(listingData);
  newListing.owner = req.user._id;
  newListing.image = { url, filename };

  newListing.geometry = geoResult?.geometry || { type: "Point", coordinates: [0, 0] };

  console.log("Geocode query:", geoResult?.query);
  console.log("Geocode response:", geoResult?.place_name);

  console.log("Form Data:", req.body);
  let savedListing = await newListing.save();
  console.log(savedListing);
  req.flash("success", "New Listing Created!");
  res.redirect("/listings");
};

module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    res.redirect("/listings");
  }

  let originalImageUrl = listing.image.url;
  originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");
  res.render("listings/edit.ejs", { listing, originalImageUrl });
};

module.exports.updateListing = async (req, res) => {
  let { id } = req.params;
  let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing }, { new: true, runValidators: true });

  if (!listing) {
    req.flash("error", "Could not find that listing.");
    return res.redirect("/listings");
  }

  const geoResult = await getGeometryFromLocation(req.body.listing);
  if (geoResult?.geometry) {
    listing.geometry = geoResult.geometry;
  }

  if (typeof req.file !== "undefined") {
    let url = req.file.path;
    let filename = req.file.filename;
    listing.image = { url, filename };
  }

  await listing.save();

  console.log("Updated geocode query:", geoResult?.query);
  console.log("Updated geocode response:", geoResult?.place_name);

  req.flash("success", "Listing Updated!");
  res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
  let { id } = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  console.log(deletedListing);
  req.flash("success", "Listing Deleted!");
  res.redirect("/listings");
};
