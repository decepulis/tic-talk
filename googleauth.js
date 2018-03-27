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
var googleAuth;

// Var containing info about the Google user of the Google auth instance
// Used to call gapi.auth2.GoogleAuth.currentUser.get()'s (aka CurrentUser) methods
var googleUser;

// Var containing info about the basic profile info of the Google user
var basicProfile;

// The calendar object's summary that Tic Talk uses
var calSummary = "Tic Talk"

// The calendar object's description that Tic Talk uses
var calDescr = "Tic Talk is a web app for time management designed to help users get a better grasp on the work in their week. This calendar stores scheduled tasks and suggested work times with estimated durations." 

// Variable used to store the Tic Talk Calendar id
// Is set when either the calendar is created in the app or the calendar is found by the app to already exist
var calId;

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
// Calendar and Event Related Methods:
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
    for (var i = 0; i < calendarList.length; i++) {
      // Check the calendar's summary (and maybe description too) to see if it matches what we use for Tic Talk's calendar
      if (calendarList[i].summary === calSummary && calendarList[i].description === calDescr) {
        calId = calendarList[i].id;
        console.log("DEBUG: Tic Talk calendar found in list of user's calendars. Calendar ID = " + calId + ".");
        calFound = true;
        googleAuthCalFound();
        break;
      }
    }

    // 3) If it doesn't exist, ask to create it (pop up a modal)
    if (calFound !== true) {
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

/**
 * Creates an event in the Tic Talk calendar. 
 * @param newEvent - Object containing details about the calendar event to be added. 
 */
function createEvent(newEvent) {
  // Going to need event name, start time, duration, whether it's all day, and notes  
  console.log("DEBUG: Trying to create an event. newEvent: " + JSON.stringify(newEvent));
  var start;
  var end;
  // @todo: implement timeZone discovery in v2
  // var timeZone = "America/New_York";
  // Handling is the event is an all-day event
  if (newEvent.allDay === true) {
    // If it's all day, start and end need to be dates, not dateTimes
    start = {"date": newEvent.start.format("YYYY-MM-DD")};
    end  = {"date": newEvent.start.format("YYYY-MM-DD")};
    console.log("DEBUG: Event is all day. Start = " + JSON.stringify(start) + ". End = " + JSON.stringify(end));
  }
  else {
    // If it's all day, start and end need to be dateTimes, not dates
    start = {"dateTime": newEvent.start.format()};
    end  = {"dateTime": newEvent.end.format()};
    console.log("DEBUG: Event is not all day. Start = " + JSON.stringify(start) + ". End = " + JSON.stringify(end));
  }

  var eventToAdd = {
    'summary': newEvent.title,
    'id':newEvent.hash,
    // Where we have all the extra data that doesn't fit into a Google event object
    'description': JSON.stringify(newEvent),
    'start': start,
    'end': end,
    // Reminders is necessary?
    'reminders': {
      'useDefault': false
    }
  };

  var eventRequest = gapi.client.calendar.events.insert({
    "calendarId": calId,
    "resource": eventToAdd
  });

  eventRequest.execute(function(event) {
    console.log("DEBUG: Event added. Link: " + event.htmlLink);
  });
}

/**
 * Gets all the events in the Tic Talk calendar between a given start time and end time. 
 * @param minDateTime - A datetime denoting when to start getting events from.
 * @param maxDateTime - A datetime denoting when to stop getting events from.
 * @param handleResponse - A javascript function that will be called with the calendar response
 * @returns A lost of the user's events between the two specified times.
 */
function getEvents(minDateTime, maxDateTime, handleResponse) {
  console.log("DEBUG: Trying to get events from " + minDateTime + " to " + maxDateTime + ".");
  gapi.client.calendar.events.list({
    'calendarId': calId,
    'timeMax': maxDateTime,
    'timeMin': minDateTime,
    'showDeleted': false,
    'singleEvents': true,
    'orderBy': 'startTime'
  }).then(handleResponse);
}

/**
 * Deletes an event in the Tic Talk calendar, given an event id. 
 * @param eventId - The id of the event to be deleted.
 */
function deleteEvent(eventId) {
  console.log("DEBUG: Trying to delete events where eventId = " + eventId + ".");
  var delRequest = gapi.client.calendar.events.delete({
    "calendarId": calId,
    "eventId": eventId
  });

/**
 * Updates an event in the Tic Talk calendar. 
 * @param updatedEvent - Object containing details about the calendar event to be added. 
 */
function updateEvent(updatedEvent) {
  // Going to need event name, start time, duration, whether it's all day, and notes  
  console.log("DEBUG: Trying to update an event where eventId = " + updatedEvent.hash + ". updatedEvent: "+ JSON.stringify(updatedEvent));
  var start;
  var end;
  // @todo: implement timeZone discovery in v2
  // var timeZone = "America/New_York";
  // Handling is the event is an all-day event
  if (updatedEvent.allDay === true) {
    // If it's all day, start and end need to be dates, not dateTimes
    start = {"date": updatedEvent.start.format("YYYY-MM-DD")};
    end  = {"date": updatedEvent.start.format("YYYY-MM-DD")};
    console.log("DEBUG: Event is all day. Start = " + JSON.stringify(start) + ". End = " + JSON.stringify(end));
  }
  else {
    // If it's all day, start and end need to be dateTimes, not dates
    start = {"dateTime": updatedEvent.start.format()};
    end  = {"dateTime": updatedEvent.end.format()};
    console.log("DEBUG: Event is not all day. Start = " + JSON.stringify(start) + ". End = " + JSON.stringify(end));
  }

  var eventToUpdate = {
    'summary': updatedEvent.title,
    'id': updatedEvent.hash,
    // Where we have all the extra data that doesn't fit into a Google event object
    'description': JSON.stringify(updatedEvent),
    'start': start,
    'end': end,
    // Reminders is necessary?
    'reminders': {
      'useDefault': false
    }
  };

  var eventRequest = gapi.client.calendar.events.update({
    "calendarId": calId,
    "eventId": updatedEvent.hash,
    "resource": eventToUpdate
  });

  eventRequest.execute(function(event) {
    console.log("DEBUG: Event updated. Link: " + event.htmlLink);
  });
}


/**
 * Deletes an event in the Tic Talk calendar, given an event id. 
 * @param eventId - The id of the event to be deleted.
 */
function deleteEvent(eventId) {
  console.log("DEBUG: Trying to delete events where eventId = " + eventId + ".");
  var delRequest = gapi.client.calendar.events.delete({
    "calendarId": calId,
    "eventId": eventId
  });

>>>>>>> origin/stefan-dev
  delRequest.execute(function(event) {
    console.log("DEBUG: Event deleted where eventId = " + eventId + ".");
  });
}

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
 */
function handleCreateCalClick(event) {
  console.log("DEBUG: Button to create calendar clicked.");
  createCalendar();
  closePopup();
}


// --------------------------------
// Test Methods and Helper Methods:
// --------------------------------

/**
 *  Test function to create several events to ensure event creation is working.
 */
function createEventTest() {
  console.log("DEBUG: Testing event creation.");

  // Event 1: Not an all-day event
  var shortEvent = new event({
    "title": "Short Event",
    "start": moment(),
    "target": "uhhhhh",
    "actualDuration": 10
  });

  createEvent(shortEvent);

  // Event 2: An all-day event
  var allDayEvent = new event({
    "title": "An All Day Event",
    "start": moment(),
    "type": "Calculus HW",
    "givenEstimate": 2,
    "actualDuration": 10
  });

  createEvent(allDayEvent);
}

/**
 *  Test function to create several events to ensure event creation is working.
 *  Have to run createEvent first and then pass this event the ids from those
 *  created events.
 */
function updateEventTest(firstId, secondId) {
  console.log("DEBUG: Testing event creation.");

  // Short event to update
  var shortEventUpdate = new event({
    "title": "Short Event Updated",
    "start": moment(),
    "target": "uhhhhh",
    "actualDuration": 3
  });
  shortEventUpdate.hash = firstId;
  updateEvent(shortEventUpdate);

  // All-day event to update
  var allDayEventUpdate = new event({
    "title": "An All Day Event Updated",
    "start": moment(),
    "type": "Calculus HW",
    "givenEstimate": 2,
    "actualDuration": 3
  });
  allDayEventUpdate.hash = secondId;
  updateEvent(allDayEventUpdate);
}

/**
 *  Helper function used in testing event gets.
 */
function getEventsHandleResponse(response) {
  var events = response.result.items;
  if (events.length > 0) {
    console.log("DEBUG: Got events:");
    console.log(events);
  } else {
    console.log("DEBUG: Could not find any events in the gotten events.");
  }
}

/**
 *  Test function to get all events in a given week.
 *  You need to manually insert events into the calendar to test this event.
 */
function getEventsTest() {
  minDT = "2018-03-25T00:00:00Z";
  maxDT = "2018-04-01T00:00:00Z";
  console.log("DEBUG: Testing event getting from " + minDT + " to " + maxDT);
  getEvents(minDT, maxDT, getEventsHandleResponse);
}

/**
 *  Test function to get all events in a given week.
 *  This one is testing a week without events, so there's no need to create events.
 */
function getEventsTest2() {
  minDT = "2019-01-01T00:00:00Z";
  maxDT = "2010-01-08T00:00:00Z";
  console.log("DEBUG: Testing event getting from " + minDT + " to " + maxDT);
  getEvents(minDT, maxDT, getEventsHandleResponse);
}

/**
 *  Helper function used in testing event deletes.
 */
function deleteEventsHandleResponse(response) {
  var events = response.result.items;
  if (events.length > 0) {
    console.log("DEBUG: Got events:");
    console.log(events);
    deleteEvent(events[0].id);
    console.log("DEBUG: Deleted events with id = " + events[0].id + ".");
  } else {
    console.log("DEBUG: Could not find any events to delete.");
  }
}

/**
 *  Test function to delete an event. Needs event getting to work.
 *  Must manually create one event to be deleted in the given time span.
 */
function deleteEventTest(){
getEvents("2018-03-25T00:00:00Z","2018-04-01T00:00:00Z", deleteEventsHandleResponse);
}