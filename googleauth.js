// Client ID and API key from the Developer Console
var CLIENT_ID = '808566611125-2l9q7j7ih5vuiis2qdpvloisc07d1mnk.apps.googleusercontent.com';
var API_KEY = 'AIzaSyAHZZV_38Reo2tNW4VSC5OdKVHZ06xsWkw';

// Array of API discovery doc URLs for APIs used by the quickstart
var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
var SCOPES = "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar";

// Var containing info about the Google auth instance
// Used to call gapi.auth2.GoogleAuth's methods
// @todo - Might be bad to only do this once? I don't think so, but we'll find that out for sure later.
var googleAuth;

// Var containing info about the Google user of the Google auth instance
// Used to call gapi.auth2.GoogleAuth.currentUser.get()'s (aka CurrentUser) methods
var googleUser;

// Var containing info about the basic profile info of the Google user
var basicProfile;

// The calendar object's summary that Tic Talk uses
var calSummary = "Tic Talk"

// Variable used to store the Tic Talk Calendar id
// Is set when either the calendar is created in the app or the calendar is found by the app to already exist
var calId;

// The calendar object's description that Tic Talk uses
var calDescr = "Tic Talk is a web app for time management designed to help users get a better grasp on the work in their week. This calendar stores scheduled tasks and suggested work times with estimated durations." 

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
    console.log("DEBUG: User is currently signed in.");

    // 1) Display the sign-out button when you click on the user info
    $('#signout-button').click(handleSignoutClick);

    // 2) Get basic user info
    googleUser = googleAuth.currentUser.get();
    basicProfile = googleUser.getBasicProfile();
    console.log("DEBUG: Basic profile acquired.");

    // 3) Display basic profile info
    $("#bp-image").attr("src", basicProfile.getImageUrl());
    $("#bp-name").text(basicProfile.getName());
    $("#bp-email").text(basicProfile.getEmail());

    // 4) Check is a Tic Talk calendar exists yet. If not, it creates one.
    tictalkCalendarChecker();
  } else {    // If the user isn't signed in:
    console.log("DEBUG: User is not currently signed in.");

    // 1) Bring up a login view 
    $('#authenticate-popup').addClass('active');
    // 2) Handle the sign in button
    $('#signin-button').click(handleSignInClick);
  }
} 

// --------------------------------
// Calendar Related Methods:
// --------------------------------

/**
 * Checks if a Tic Talk-specific calendar exists. If not, it creates one. 
 */
function tictalkCalendarChecker() {
  // 1) Get list of all calendars of user
  var calendarListRequest = gapi.client.calendar.calendarList.list();
  calendarListRequest.execute(function(resp){
    var calendarList = resp.items; // object that's an array of calendar objects
    console.log("DEBUG: List of user's calendars acquired.");

    // 2) Check if a Tic Talk-specific calendar exists yet
    var calFound = false; // Flag for if we find the user has a Tic Talk calendar
    // Iterate through each of the calendar objects
    for (var i = 0; i < calendarList.length; i++)
    {
      // Check the calendar's summary (and maybe description too) to see if it matches what we use for Tic Talk's calendar
      if (calendarList[i].summary === calSummary && calendarList[i].description === calDescr)
      {
        calId = calendarList[i].id;
        console.log("DEBUG: Tic Talk calendar found in list of user's calendars. Calendar ID = " + calId + ".");
        calFound = true;
        break;
      }
    }

    // 3) If it doesn't exist, ask to create it (pop up a modal)
    if (calFound !== true)
    {
      // display that popup and give them a button! 
      $('#create-calendar-popup').addClass('active');
      $('#create-calendar-button').click(handleCreateCalClick);
    }
  });
}

/**
 * Creates the Tic Talk calendar. 
 */
function createCalendar() {
  console.log("DEBUG: Attempting to create the Tic Talk calendar.");
  createCalBody = {
    "summary": calSummary,
    "description": calDescr
  };
  gapi.client.calendar.calendars.insert(createCalBody).execute(function(resp){
    // Have to set calId for later uses
    calId = resp.id;
    console.log("DEBUG: Calendar created with id = " + calId + ".");
  }); // Returns 200 on success
};

/**
 * Deletes the Tic Talk calendar. For testing purposes. 
 */
function deleteCalendar() {
  console.log("DEBUG: Deleting the Tic Talk calendar, where calId =" + calId + ".");
  try {
    gapi.client.calendar.calendars.delete({"calendarId": calId}).execute();    // Returns 204 on success
    console.log("DEBUG: Successfully deleted calendar where calId = " + calId + ".")
  }
  catch(err) {
    console.error("ERROR: Failed to delete the calendar because: " + err)
  }
  calId = null;
};


// ---------------
// Button Handlers
// ---------------

/**
 *  Sign in the user upon button click.
 */
function handleSignInClick(event) {
  googleAuth.signIn();
  console.log("DEBUG: User has signed in.");
  closePopup();
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick(event) {
  googleAuth.signOut();
  console.log("DEBUG: User has signed out.");
  closePopup();
}

/**
 *  Create the Tic Talk calendar upon button click.
 *  @todo - Fill this out!
 */
function handleCreateCalClick(event) {
  console.log("DEBUG: Button to create calendar clicked.");
  // Call the calendar creation method here
  createCalendar();
  closePopup();
}


// --------------------------------
// Test Methods and Helper Methods:
// --------------------------------
