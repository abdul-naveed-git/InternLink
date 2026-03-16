const mongoose = require("mongoose");

const opportunitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    company: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    category: {
      type: String,
      enum: ["job", "internship", "hackathon"],
      required: true,
    },

    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },

    deadline: {
      type: Date,
      required: true,
    },

    applyLink: {
      type: String,
      required: true,
      trim: true,
      match: /^https?:\/\/.+/i, // basic URL validation
    },

    targetGroups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
        required: true,
      },
    ],

    savedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    appliedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

/* --------------------------
   INDEXES (IMPORTANT)
---------------------------*/

// fast filtering
opportunitySchema.index({ deadline: 1 });
opportunitySchema.index({ category: 1 });
opportunitySchema.index({ createdBy: 1 });

// fast group filtering
opportunitySchema.index({ targetGroups: 1 });

// analytics queries
opportunitySchema.index({ company: 1 });

module.exports = mongoose.model("Opportunity", opportunitySchema);
