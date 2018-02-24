// When the document loads, we execute this code
$(document).ready(function(){ 
	console.log("DEBUG: Document Loaded")
})

// ** BUTTON BEHAVIOR ********************************************//
$(document).ready(function(){
	$('.header-button').click(function(){
		var popup_id = $(this).attr('data-popup');
		$(popup_id).addClass('active')
	})
})

function closePopup() {
	$('.popup').each(function(){$(this).removeClass('active')})
}

function updateTaskTypeDropdown() {
	if ($("#task-type-field>select")[0].value === "Add New Task Type") {
		$('#new-task-type-row').removeClass('hidden');
	}
	else { $('#new-task-type-row').addClass('hidden'); }
}

function saveAddEventDialogue() {
	var title = $('#task-title-field')[0].value;
	var givenEstimate = $('#task-estimate-given-field')[0].value;
	var dueDate = $('#task-due-date-field')[0].value;
	var type  = $('#task-type-field>select')[0].value;

	if ($('#task-type-field>select')[0].value === "Add New Task Type") {
		var type = $('#new-task-type-field')[0].value;
	} 

	if (
		title === "" ||
		type  === "no-selection" ||
		givenEstimate === "" ||
		dueDate === ""
		) {
		alert("Fill out all fields before saving event.")
	} else { 
		var newEvent = new event(title, type, dueDate, givenEstimate)
		addNewEvent(newEvent);
		clearAddEventDialogue();
		closePopup(); }
}
function discardAddEventDialogue() {
	closePopup();
}
function clearAddEventDialogue() {
}

// ** SCHEDULING FUNCTIONS *************************************** //
// on ready function for populating calendar
$(document).ready(function(){
	$('#calendar').fullCalendar({
		navLinks: true, // can click day/week names to navigate views
      	editable: true,
      	droppable: true,
      	
      	height: ($(window).height()-80),

        dayClick: function() {
	        alert('a day has been clicked!');
	    },

	    header: {
	        left:'title',
	        right: 'agendaDay,agendaWeek,month, prev,next'
	     },

	     events: [
        {
          title: 'All Day Event',
          start: '2018-02-01'
        },
        {
          title: 'Long Event',
          start: '2018-02-07',
          end: '2018-02-10'
        },
        {
          id: 999,
          title: 'Repeating Event',
          start: '2018-02-09T16:00:00'
        },
        {
          id: 999,
          title: 'Repeating Event',
          start: '2018-02-16T16:00:00'
        },
        {
          title: 'Conference',
          start: '2018-02-11',
          end: '2018-02-13'
        },
        {
          title: 'Meeting',
          start: '2018-02-12T10:30:00',
          end: '2018-02-12T12:30:00'
        },
        {
          title: 'Lunch',
          start: '2018-02-12T12:00:00'
        },
        {
          title: 'Meeting',
          start: '2018-02-12T14:30:00'
        },
        {
          title: 'Happy Hour',
          start: '2018-02-12T17:30:00'
        },
        {
          title: 'Dinner',
          start: '2018-02-12T20:00:00'
        },
        {
          title: 'Birthday Party',
          start: '2018-02-13T07:00:00'
        },
        {
          title: 'Click for Google',
          url: 'http://google.com/',
          start: '2018-02-28'
        }
      ]
    })
})

// calcEstimate is how we provide users with our estimate for each task type
// This function is called on document ready (see Global Data Types and Storage)
// And builds the index of estimate for every task type
function buildCalcEstimateIndex() {
}

// And here's a simple get function! Hey!
function getCalcEstimate(type) {
	var hours = -1; // placeholder functionality

	return hours;
}

function addNewEvent(eventToAdd) {
	// 1. Add Event to fullCalendar
	$('#calendar').fullCalendar( 'renderEvent', eventToAdd)

	// 2. Add Event to Google Calendar
	// TO DO
}

// ** GLOBAL DATA TYPES AND STORAGE ******************************* //
calcEstimate = {};
$(document).ready(buildCalcEstimateIndex)

function event(title, type, start, givenEstimate, actualDuration = null) {
	// fullcalendar attributes
	this.title    = title;
	this.start    = moment(start); 
	this.editable = true;

	if (this.actualDuration == null) 
		{ this.allDay = true }
	else
		{ this.end = this.start.clone().add(actualDuration, 'hours')}

	
	//custom attributes
	this.type           = type;
	this.calcEstimate   = getCalcEstimate(type);
	this.givenEstimate  = givenEstimate;
	this.actualDuration = actualDuration;
}