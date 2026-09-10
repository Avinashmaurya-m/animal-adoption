# RescueNest Firebase setup

The browser app is configured for the `rescunest2` Firebase project. Enable Email/Password under **Authentication** and create a Firestore database before first use.

From this directory, deploy the security rules and required query indexes. This is the no-cost path for posting and displaying public posts:

```sh
firebase use rescunest2
cd functions && npm install && cd ..
firebase deploy --only firestore:rules,firestore:indexes
```

Photos upload directly from the browser to Cloudinary and their public URLs are stored with the Firestore post. Ensure the `rescuenest` unsigned upload preset exists in your Cloudinary account and permits image uploads. Never put an Admin SDK key in this repository.

`onLikeCreated`, `onLikeDeleted`, and `onCommentCreated` maintain counts and notifications with Admin privileges. They are optional and require Firebase Cloud Functions, which may require a paid Firebase plan; do not deploy them for the free setup.
