import commentLength from "./comment-length.mjs";
import noNarratingComments from "./no-narrating-comments.mjs";

/** Registered in eslint.config.mjs as `local`, so the rules read `local/<name>`. */
const local = {
  meta: { name: "local" },
  rules: {
    "comment-length": commentLength,
    "no-narrating-comments": noNarratingComments,
  },
};

export default local;
