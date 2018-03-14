// Client ID and API key from the Developer Console
var CLIENT_ID = '808566611125-2l9q7j7ih5vuiis2qdpvloisc07d1mnk.apps.googleusercontent.com';
var API_KEY = 'AIzaSyAHZZV_38Reo2tNW4VSC5OdKVHZ06xsWkw';

// Array of API discovery doc URLs for APIs used by the quickstart
var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
// @todo - Need to add writing scope eventually
var SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

// Var containing info about the Google auth instance
// Used to call gapi.auth2.GoogleAuth's methods
// @todo - Might be bad to only do this once? I don't think so, but we'll find that out for sure later.
var googleAuth;

// Var containing info about the Google user of the Google auth instance
// Used to call gapi.auth2.GoogleAuth.currentUser.get()'s (aka CurrentUser) methods
var googleUser;

// Var containing info about the basic profile info of the Google user
var basicProfile;

/**
 *  On load, called to load the auth2 library and API client library.
 */
function handleClientLoad() {
  gapi.load('client:auth2', initClient);
}

/**
 *  Initializes the API client library and sets up sign-in state
 *  listeners.
 */
function initClient() {
  gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    discoveryDocs: DISCOVERY_DOCS,
    scope: SCOPES
  }).then(function () {
    // Getting information about the Google auth instance and defining the GoogleAuth var
    googleAuth = gapi.auth2.getAuthInstance();
    // Listen for sign-in state changes.
    googleAuth.isSignedIn.listen(updateSigninStatus);

    // Handle the initial sign-in state.
    // This pretty little line gets us the sign in-state
    updateSigninStatus(googleAuth.isSignedIn.get());
  });
}

/**
 *  Called when the signed in status changes, to update the UI
 *  appropriately. After a sign-in, the API is called.
 * 
 *  @param {boolean} isSignedIn - Whether or not the user is signed in yet
 */
function updateSigninStatus(isSignedIn) {
  if (isSignedIn) {    // If the user is signed in:
    console.log("DEBUG: User signed in.")
    // 1) Display user info in the user info section

    // 2) Display the sign-out button when you click on the user info
    $('#signout-button').click(handleSignoutClick);

    // 3) Get basic user info
    googleUser = googleAuth.currentUser.get();
    basicProfile = googleUser.getBasicProfile();
    console.log("DEBUG: Basic profile acquired")

    // 4) Display basic profile info
    $("#bp-image").attr("src", basicProfile.getImageUrl());
    $("#bp-name").text(basicProfile.getName());
    $("#bp-email").text(basicProfile.getEmail());

    // Legacy code below
    listUpcomingEvents();
  } else {    // If the user isn't signed in:
    console.log("DEBUG: User not signed in.")

    // 1) Bring up a login view 
    $('#authenticate-popup').addClass('active')
    // 2) Handle the sign in button
    $('#signin-button').click(handleSignInClick);
  }
} 

/**
 * Called when the current user changes 
 *
 * @param currentUser - The current Google user of the authenticated Google auth instance
 */
function updateCurrentUser(currentUser) {

}

// ---------------
// Button Handlers
// ---------------

/**
 *  Sign in the user upon button click.
 */
function handleSignInClick(event) {
  googleAuth.signIn();
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick(event) {
  googleAuth.signOut();
}


// --------------------------------
// Test Methods and Helper Methods:
// --------------------------------

