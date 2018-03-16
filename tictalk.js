// When the document loads, we execute this code
$(document).ready(function(){ 
	console.log("DEBUG: Document Loaded")
})

// ** LOCALSTORAGE ***********************************************//
// this function converts JSON into string to be entered into localStorage
function saveToLocalStorage(k,v) {
  if (typeof k != "string") {k = JSON.stringify(k)}
  if (typeof v != "string") {v = JSON.stringify(v);}
  localStorage.setItem(k, v);
}
// this function gets string from localStorage and converts it into JSON
function getFromLocalStorage(k) {
  return JSON.parse(localStorage.getItem(k));
}

$(document).ready(buildTaskTypesDropdown)
function buildTaskTypesDropdown() {
  // <select onchange="updateTaskTypeDropdown();">
  var $select = $('#task-type-field>select');
  $select.empty();
  //    <option value="no-selection">Select...</option>
  $('<option/>').attr('value',"no-selection").html("Select...").appendTo($select);

  //    <option>Type</option>
  var types = getFromLocalStorage('task-types');
  if (types != null) 
  {
    types.forEach(function(type){
      $('<option/>').html(type).appendTo($select)
    })
  }
  //    <option>Add New Task Type</option>
  $('<option/>').attr('value','new-task-type').html("Add New Task Type").appendTo($select);
}

// ** BUTTON BEHAVIOR ********************************************//
$(document).ready(buildTaskTypesDropdown);
$(document).ready(clearAddTaskDialogue);
$(document).ready(function(){
	$('.header-button').click(function(){
		var popup_id = $(this).attr('data-popup');
		$(popup_id).addClass('active')
	})
})

function closePopup() {
	$('.popup').each(function(){$(this).removeClass('active')})
}

function switchAddItemContent(){
  if ($('#task-due-radio').is(':checked')) 
  {
    $('#new-task-due-content').show();
    $('#new-scheduled-work-content').hide();
  }
  else
  {
    $('#new-task-due-content').hide();
    $('#new-scheduled-work-content').show();
  }
}

function updateTaskTypeDropdown() {
	if ($("#task-type-field>select").val() === "new-task-type") {
		$('#new-task-type-row').removeClass('hidden');
    $('#task-estimate-calc-row').addClass('textdisabled');
	}
	else 
  { 
    $('#new-task-type-row').addClass('hidden');
    $('#task-estimate-calc-row').removeClass('textdisabled'); 
  }
}

function updateWorkTargetDropdown() {
  if ($("#work-target-field>select").val() === "no-target") 
  {
    $('#no-target-work-row').removeClass('hidden');
    $('#work-estimate-calc-total-row').addClass('textdisabled');
    $('#work-estimate-given-total-row').addClass('textdisabled');
  }
  else 
  { 
    $('#no-target-work-row').addClass('hidden');
    $('#work-estimate-calc-total-row').removeClass('textdisabled');
    $('#work-estimate-given-total-row').removeClass('textdisabled'); 
  }

}


// TO DO: these two functions are extraordinarily laggy
function updateFromUntilToDuration() {
  var start    = $("#work-scheduled-for-field").val();
  var until    = $("#work-scheduled-until-field").val();

  console.log('From until to duration '+start+' '+until)

  if ((start !== "") && (until !== "")) 
  {
    start = moment(start);
    until = moment(until);

    var duration = moment.duration(until.diff(start)).asHours()
    $("#work-estimate-given-field").val(duration)
  }
}

function updateFromDurationToUntil(){
  var start    = $("#work-scheduled-for-field").val();
  var duration = $("#work-estimate-given-field").val();

  console.log('From duration to until '+start+' '+duration)

  if ((start !== "") && (duration !== "")) 
  {
    start    = moment(start);
    duration = parseFloat(duration);


    var until   = start.clone().add(duration,'hours').format("YYYY-MM-DDTHH:mm");
    $("#work-scheduled-until-field").val(until)
  } 
}

function buildTaskSelectionDropdown() {
  // <select onchange="updateWorkTargetDropdown();">
  var $select = $('#work-target-field>select');
  $select.empty();
  // <option value="no-selection">Select...</option>
  $('<option/>').attr('value',"no-selection").html("Select...").appendTo($select);
  //    <option>Type</option>
  var types = $('#calendar').fullCalendar( 'clientEvents',isDueFilter);
  if (types != null) 
  {
    types.forEach(function(type){
      $('<option/>').attr('value',type._id).html(type.title).appendTo($select)
    })
  }
  //    <option>Add New Task Type</option>
  $('<option/>').attr('value','no-target').html("Not Working on an Assignment").appendTo($select);
}

function saveAddTaskDialogue() {
  if ($('#task-due-radio').is(':checked')) // if we're in new task due mode
  {
    var title = $('#task-title-field').val();
    var givenEstimate = $('#task-estimate-given-field').val();
    var dueDate = $('#task-due-date-field').val();
    var type  = $('#task-type-field>select').val();
    var newType = $('#new-task-type-field').val();

    if (
      title === "" ||
      type  === "no-selection" ||
      (type === "new-task-type" && newType === "") || 
      givenEstimate === "" ||
      dueDate === ""
      ) 
    {
      alert("Fill out all fields before saving task.")
    } 
    else 
    { 
      // create a new task type if we need to
      if ($('#task-type-field>select').val() === "new-task-type") {
        var types = getFromLocalStorage('task-types');
        if (types == null) { types = []; }

        var type = newType;
        // if type isn't already in array, add and save
        if (types.indexOf(type) == -1) {
          types.push(type);
          types.sort();
          saveToLocalStorage('task-types',types);
          buildTaskTypesDropdown();
        }
      } 

      var newEvent = new event({title: title, type:type, start:dueDate, duration:givenEstimate})
      addNewEvent(newEvent);
      buildTaskSelectionDropdown();

      closePopup();
      clearAddTaskDialogue();
    }
  }

  else // save new scheduled work
  {
    var target   = $('#work-target-field>select').val(); // gets ID from dropdown value
    var start    = $("#work-scheduled-for-field").val();
    var finish   = $("#work-scheduled-until-field").val();
    var duration = $("#work-estimate-given-field").val();
    var workName = $("#no-target-work-field").val();


    if (
      target   === "no-selection" ||
      (target  === "no-target" && workName === "") ||
      start    === "" ||
      finish   === "" ||
      duration === ""
      ) 
    {
      alert("Fill out all fields before saving task.")
    } 
    else if (parseFloat(duration) <= 0) 
    {
      alert("Duration must be longer than 0 hours")
    }
    else 
    { 
      if (target !== "no-target") // this indicates not "Not Working on a Task"
      {
        var title = 'Calc HW'; // TO DO: use ID stored in target to get target task name
      }
      else
      {
        var title = $("#no-target-work-field").val(); // TO DO: add work name box and read it here
      }

      var newEvent = new event({title:title, start:start, finish:finish});
      addNewEvent(newEvent);

      closePopup();
      clearAddTaskDialogue();
    }
  }
	
}

function discardAddTaskDialogue() {
	closePopup();
  clearAddTaskDialogue();
}

function clearAddTaskDialogue() {
  $("#task-due-radio").prop("checked", true);
  $("#work-scheduled-radio").prop("checked", false);
  switchAddItemContent()

  $('#task-title-field').val("");
  $('#task-estimate-given-field').val("");
  $('#task-estimate-calc-field').html("0 Hours")
  $('#task-due-date-field').val(moment().add(1,'week').format("YYYY-MM-DD"));
  $('#task-type-field>select').val("no-selection");
  $('#new-task-type-field').val("")
  $('#new-task-type-row').addClass('hidden'); 

  $('#work-target-field>select').val("no-selection");
  $("#work-scheduled-for-field").val(moment().format("YYYY-MM-DDTHH:mm"));
  $("#work-scheduled-until-field").val(moment().add(1,'hours').format("YYYY-MM-DDTHH:mm"));
  $("#work-estimate-given-field").val("1");
  $('#work-estimate-given-total-field').html("0 Hours");
  $('#work-estimate-calc-total-field').html("0 Hours");
  $('#no-target-work-field').val("")
  $('#no-target-work-row').addClass('hidden')
}

// ** SCHEDULING FUNCTIONS *************************************** //
// on ready function for populating calendar
// TO DO: update height when window height changes
$(document).ready(function(){
	$('#calendar').fullCalendar({
		navLinks: true, // can click day/week names to navigate views
      	editable: true,
      	droppable: true,
      	
      	height: ($(window).height()-80),

        eventClick: function(event, jsEvent, view) {
          console.log(event);
          console.log(jsEvent);
          console.log(view);
        },

        eventRender: function(event, element, view) {
          // TO DO: assign different color for each task type?
        },

        eventResize: function(event, delta, revertFunc) {
          // TO DO: change time estimate 
          console.log(event);
          console.log(delta);
          console.log(revertFunc);
        },

        dayClick: function(day, jsEvent, view) {
          // clicking on a day switches to that day
          // clicking on a time adds an event at that time
          if (day.hasTime())
          {
            console.log(day)
          }
          else 
          {
            if (view.name === "month")
            {
            $('#calendar').fullCalendar('changeView', 'agendaWeek');
            }
            else
            {
              $('#calendar').fullCalendar('changeView','agendaDay');
            }
            $('#calendar').fullCalendar('gotoDate',day);
          }
	      },

        defaultView: 'agendaWeek',

	    header: {
	        left:'title',
	        right: 'month,agendaWeek,agendaDay, prev,next'
	     } 
    })

  buildTaskSelectionDropdown(); // this needs to happen here becuase
                                // it can only run after calendar exists
})

// calcEstimate is how we provide users with our estimate for each task type
// This function is called on document ready (see Global Data Types and Storage)
// And builds the index of est`imate for every task type
function buildCalcEstimateIndex() {
}

// And here's a simple get function! Hey!
function getCalcEstimate(type) {
	var hours = -1; // placeholder functionality

	return hours;
}


function addNewEvent(eventToAdd) {
	// 1. Add Event to fullCalendar
	$('#calendar').fullCalendar('renderEvent', eventToAdd, true);
  $('#calendar').fullCalendar('render');

	// 2. Add Event to Google Calendar
	// TO DO
}

function isDueFilter(event) { return event.isDue }

// ** GLOBAL DATA TYPES AND STORAGE ******************************* //
calcEstimate = {};
$(document).ready(buildCalcEstimateIndex)

function event(newEvent) {

  console.log(newEvent)
  console.log(newEvent.duration)
  console.log(typeof newEvent.duration)

	this.title    = newEvent.title;
	this.start    = moment(newEvent.start); 
	this.editable = true;

	if (newEvent.duration !== undefined) // this is our flag indicating a due item or a work item
		{ 
      this.allDay = true; 
      this.isDue  = true;
      this.title  = "DUE: " + this.title;
      this.type   = newEvent.type;

      this.calcEstimate   = parseFloat(getCalcEstimate(newEvent.type));
      this.givenEstimate  = parseFloat(newEvent.givenEstimate);
      this.actualDuration = newEvent.actualDuration;
    }
	else
		{ 
      this.end   = moment(newEvent.finish);
      this.isDue = false;
      this.title = "WORK: " + this.title;
    }

  console.log("Created New Event:");
  console.log(this)
}