// When the document loads, we execute this code
$(document).ready(function(){ 
	console.log("DEBUG: Document Loaded")
})

// lil keypress handler for the escape key
$(document).keydown(function(e){
  if(e.keyCode == 27) {
      $('.popup').each(function() {
        $(this).removeClass('active');
      });
  }
});

// ** LOCALSTORAGE ***********************************************//
/*
// this function converts JSON into string to be entered into localStorage
function saveToLocalStorage(k,v) {
  if (typeof k != "string") {k = JSON.stringify(k)}
  if (typeof v != "string") {v = JSON.stringify(v);}
  localStorage.setItem(k, v);
}
// this function gets string from localStorage and converts it into JSON
function getFromLocalStorage(k) {
  if (typeof k != "string") {k = JSON.stringify(k)}
  return JSON.parse(localStorage.getItem(k));
}
*/


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

$(document).ready(function(){ 
  $('#schedule-week').click(openScheduleWeekPopup) 
})

function openScheduleWeekPopup() {
  // 1. Set From and To to "Today" and "End of Week"
  $('#schedule-week-from').val(moment().format("YYYY-MM-DD"));
  $('#schedule-week-to').val(moment().endOf('week').format("YYYY-MM-DD"));

  // 2. Populate Schedule Week List
  populateScheduleWeekList();
}

function populateScheduleWeekList() {
  var $list = $('#schedule-week-list')
  $list.empty()

  var scheduleStart = moment($('#schedule-week-from').val());
  var scheduleEnd   = moment($('#schedule-week-to').val()  );

  var allDueEvents = $('#calendar').fullCalendar('clientEvents', isDueFilter)

  allDueEvents.forEach(function(event){
    if ((event.start >= scheduleStart))
    {
      var $row     = $('<div/>', {class: 'popup-content-row'});
      $row.append($('<input/>', {type: 'checkbox',       id:  'cb-' + event.hash, 'data-id': event.hash}))
      $row.append($('<label/>', {text: event.shortTitle, for: 'cb-' + event.hash}))

      $row.appendTo($list)
    }
  })
}

function scheduleWeek() {
  // 1. scrape the scheduling window
  toSchedule = []
  $('#schedule-week-list').find('input').each(function () {
    var $checkbox = $(this);
    if ($checkbox.is(':checked'))
    {
      var eventID = $checkbox.attr('data-id')
      var event = getEventForHash(eventID)
      // calculate work completed
      var workCompleted = 0;
      Object.keys(event.workEvents).forEach(function(e) { workCompleted += event.workEvents[e]; })

      toSchedule.push({
        event: event,
        timeRemaining: event.givenEstimate - workCompleted,
      })
    }
  });

  // 2. Schedule!
  var schedulingWindows = [
    {dayStarts: '10', dayEnds: '18', weekday: true},  // 8 hour weekday
    {dayStarts: '8',  dayEnds: '10', weekday: true},  // weekday mornings
    {dayStarts: '18', dayEnds: '20', weekday: true},  // weekday evenings
    {dayStarts: '10', dayEnds: '18', weekday: false}, // 8 hour weekend
    {dayStarts: '8',  dayEnds: '10', weekday: false},  // weekend mornings
    {dayStarts: '18', dayEnds: '20', weekday: false},  // weekend evenings
  ]

  var scheduleBegins = moment($('#schedule-week-from').val()).startOf('day');
  var scheduleEnds   = moment($('#schedule-week-to').val()  ).endOf('day')  ;
  var days           = moment.duration(scheduleEnds.diff(scheduleBegins)).asDays();

  // Scheduling begins:
  // we go through each of the four scheduling windows, one-by-one
  // filling it to the top before moving to the next one
  for ( var w = 0; w < schedulingWindows.length; w++){
    // we fill each day up to the top before moving to the next one
    console.log("SCHEDULER: Filling Window " + w)
    for (var d = 0; d < days; d++) {
      var dayStarts  = schedulingWindows[w].dayStarts;
      var dayEnds    = schedulingWindows[w].dayEnds;
      var weekday    = schedulingWindows[w].weekday;

      var day   = scheduleBegins.clone().add(d,'days');
      var dayHasEvent = {};
      dayStarts = day.clone().add(dayStarts, 'hours');
      dayEnds   = day.clone().add(dayEnds  , 'hours');
      console.log("SCHEDULER: Filling Day " + day.format())

      var isWeekday = (day.isoWeekday() !== 6 && day.isoWeekday() !== 7)
      if (isWeekday !== weekday) // if we're scheduling weekdays and it's a weekend or vv, continue
      { 
        console.log('SCHEDULER: But it does not match our window so we move on!')
        continue 
      }

      var dayEvents = $('#calendar').fullCalendar('clientEvents',function(e) { return inDayNotAllDayFilter(e,day) } )
      console.log(dayEvents)

      // now we iterate through the day's gaps, filling them one-by-one
      var nextDayEvent = 0;

      var gapStart = dayStarts;
      if ( dayEvents.length > 0 )
        { var gapEnd = dayEvents[nextDayEvent].start.clone() }
      else
        { var gapEnd = dayEnds; }
      while (true) 
      {
        console.log("SCHEDULER: Assessing gap " + gapStart.format() + " - " + gapEnd.format())
        var gap = moment.duration(gapEnd.diff(gapStart)).asHours();
        if (gap > 0.5) // if the gap is big enough, fill it!
        {
          // find the first available incomplete event and schedule it in
          // TO DO: unless it's already been scheduled in the day.
          var e = 0
          var target = null;
          for (e = 0; e < toSchedule.length; e++)
          {
            target = toSchedule[e];
            var targetidx = e
            console.log("SCHEDULER: Assessing event " + target.event.shortTitle + ": " + target.timeRemaining)
            if (target.event.hash in dayHasEvent) { console.log("SCHEDULER: Day Has Event"); target = null; continue } // we already scheduled one of these here
            //if (target.event.start.startOf('day') < day.clone().add(1,'day').startOf('day') ) { console.log("SCHEDULER: Event Past-Due"); target = null; continue } // the event is past-due. 
            if (target.timeRemaining > 0)  { break } // found an event to schedule
          }

          var complete = true; 
          for (c = 0; c < toSchedule.length; c++) { if (toSchedule[c].timeRemaining > 0) { complete = false }}

          if (target !== null) 
          {
            console.log('SCHEDULER: Scheduling ' + target.event.shortTitle + ' in gap!');
            // but we did find an event to schedule so here we are
            var duration = Math.min(gap, 2); // we schedule max 2 hours
            duration = Math.min(duration, target.timeRemaining) // and no longer than the estimate
            var newEvent = new event({
              title:  target.event.shortTitle,
              start:  gapStart,
              finish: gapStart.clone().add(duration,'hours'),
              target: target.event.hash,
              isDue:  false
            })

            addNewEvent(newEvent);

            // prepare for next while iteration
            dayHasEvent[target.event.hash] = true
            toSchedule[targetidx].timeRemaining -= duration;
            gapStart = gapStart.clone().add(duration,'hours');
          }
          else // target == null
          { console.log("SCHEDULER: Breaking While Loop - target null"); break } // no events with time remaining!
        }
        else // gap isn't big enough
        {
          if ( dayEvents.length > nextDayEvent )
            { var gapStart = dayEvents[nextDayEvent].end }
          else
            { console.log("SCHEDULER: Breaking While Loop - end of window"); break } // out of events in the day. Break!

          nextDayEvent += 1;
          if ( dayEvents.length > nextDayEvent )
            { var gapEnd = dayEvents[nextDayEvent].start }
          else
            { var gapEnd = dayEnds } 

          if (gapEnd <= gapStart) 
            { console.log("SCHEDULER: Breaking While Loop - end of window"); break }

          if (gapEnd >= dayEnds) 
            { console.log("SCHEDULER: Breaking While Loop - end of window"); break }
        }
      }
      if (complete) 
      { console.log("SCHEDULER: Breaking Days For Loop - complete"); break } // no events with time remaining!
    }

    if (complete) 
    { console.log("SCHEDULER: Breaking Windows For Loop - complete"); break } // no events with time remaining!
  }

  alert('Scheduling Complete!');
  closePopup();
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

function updateTaskSchedulePopup() {
  // toggle input box based on user selection
	if ($("#task-type-field>select").val() === "new-task-type") {
		$('#new-task-type-row').removeClass('hidden');
    $('#task-estimate-calc-row').addClass('textdisabled');
	}
	else 
  { 
    $('#new-task-type-row').addClass('hidden');
    $('#task-estimate-calc-row').removeClass('textdisabled'); 
    // also update "usually takes" and stuff
    $("#task-estimate-calc-field").html(getCalcEstimate($("#task-type-field>select").val()))
  }

}

function updateWorkSchedulePopup() {
  // toggle input box based on user selection
  if ($("#work-target-field>select").val() === "no-target") 
  {
    $('#no-target-work-row').removeClass('hidden');
    $('#work-estimate-scheduled-total-row').addClass('textdisabled');
    $('#work-estimate-calc-total-row').addClass('textdisabled');
    $('#work-estimate-given-total-row').addClass('textdisabled');
  }
  else 
  { 
    $('#no-target-work-row').addClass('hidden');
    $('#work-estimate-scheduled-total-row').removeClass('textdisabled');
    $('#work-estimate-calc-total-row').removeClass('textdisabled');
    $('#work-estimate-given-total-row').removeClass('textdisabled'); 

    // and update estimates based off of the selected due assignment
    var targetHash = $("#work-target-field>select").val();
    var targetEvent = getEventForHash(targetHash);
    // cycle through all scheduled work and sum it all up
    var sum = parseFloat($('#work-estimate-given-field').val());
    Object.keys(targetEvent.workEvents).forEach(function(id) {
      sum += targetEvent.workEvents[id];
    })
    $('#work-estimate-scheduled-total-field').html(sum);
    $('#work-estimate-calc-total-field').html(targetEvent.calcEstimate);
    $('#work-estimate-given-total-field').html(targetEvent.givenEstimate);
  }
}


// TO DO: these two functions are extraordinarily laggy
function updateFromUntilToDuration() {
  var start    = $("#work-scheduled-for-field").val();
  var until    = $("#work-scheduled-until-field").val();

  if ((start !== "") && (until !== "")) 
  {
    start = moment(start);
    until = moment(until);

    var duration = moment.duration(until.diff(start)).asHours()
    $("#work-estimate-given-field").val(duration)
  }

  updateWorkSchedulePopup();
}

function updateFromDurationToUntil(){
  var start    = $("#work-scheduled-for-field").val();
  var duration = $("#work-estimate-given-field").val();

  if ((start !== "") && (duration !== "")) 
  {
    start    = moment(start);
    duration = parseFloat(duration);


    var until   = start.clone().add(duration,'hours').format("YYYY-MM-DDTHH:mm");
    $("#work-scheduled-until-field").val(until)
  }  

  updateWorkSchedulePopup();
}

function updateFromStartToUntil() {}

function buildTaskTypesDropdown() {
  // <select onchange="updateTaskTypeDropdown();">
  var $select = $('#task-type-field>select');
  $select.empty();
  //    <option value="no-selection">Select...</option>
  $('<option/>').attr('value',"no-selection").html("Select...").appendTo($select);

  //    <option>Type</option>
  var types = Object.keys(calcEstimates)
  if ( types.length != 0 ) 
  {
    types.forEach(function(type){
      $('<option/>').html(type).appendTo($select)
    })
  }
  //    <option>Add New Task Type</option>
  $('<option/>').attr('value','new-task-type').html("Add New Task Type").appendTo($select);
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
      if (type.actualDuration == null) { $('<option/>').attr('value',type.hash).html(type.title).appendTo($select) }
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
        var type = newType;
        // if type isn't already in array, add and save
        var types = Object.keys(calcEstimates)
        if (types.indexOf(type) == -1) {
          types.push(type);
          types.sort();
          calcEstimates[type] = {'givenHistory':[givenEstimate],'calcHistory':[null],'actualHistory':[null], 'estimate':givenEstimate}
          buildTaskTypesDropdown();
        }
      } 

      var newEvent = new event({title: title, type:type, start:dueDate, givenEstimate:givenEstimate,isDue:true})

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
        var targetEvent = getEventForHash(target)
        var title = targetEvent.shortTitle;
      }
      else
      {
        var title = $("#no-target-work-field").val(); 
      }

      var newEvent = new event({title:title, start:start, finish:finish, target:target, isDue:false});

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
  $('#task-estimate-calc-field').html("0")
  $('#task-due-date-field').val(moment().add(1,'week').format("YYYY-MM-DD"));
  $('#task-type-field>select').val("no-selection");
  $('#new-task-type-field').val("")
  $('#new-task-type-row').addClass('hidden'); 

  $('#work-target-field>select').val("no-selection");
  $("#work-scheduled-for-field").val(moment().startOf('hour').format("YYYY-MM-DDTHH:mm"));
  $("#work-scheduled-until-field").val(moment().add(1,'hour').startOf('hour').format("YYYY-MM-DDTHH:mm"));
  $("#work-estimate-given-field").val("1");
  $('#work-estimate-scheduled-total-field').html("0"); // sum of all stuff
  $('#work-estimate-given-total-field').html("0");     // given estimate for all stuff
  $('#work-estimate-calc-total-field').html("0");      // our estimate for all stuff
  $('#no-target-work-field').val("")
  $('#no-target-work-row').addClass('hidden')
}

function saveEventDetail(event){
  if ($('#event-detail-completed').is(':checked'))
  {
    var duration = $('#event-detail-completed-duration').val();
    event.actualDuration = parseFloat(duration);
    event.title = "DONE: " + event.shortTitle;
    event.color = "#708090"

    // mark all work events as completed here?
  } 
  else
  {
    event.actualDuration = null;
    event.title = "DUE: " + event.shortTitle;
    event.color = "#c1185b"
  }

  // update relevant views
  $("#calendar").fullCalendar('updateEvent', event);
  updateEvent(event); // update in Google Calendar
  buildTaskSelectionDropdown()
  buildCalcIndex()

  closePopup();
}

function saveWorkDetail(event){
  if ($('#work-detail-completed').is(':checked'))
  {
    var duration = $('#work-detail-completed-duration').val();
    event.actualDuration = parseFloat(duration);
    event.title = "DONE: " + event.shortTitle;
    event.color = "#778899"
  } 
  else
  {
    event.actualDuration = null;
    event.title = "DUE: " + event.shortTitle;
    delete event.color
  }

  console.log(event)
  $("#calendar").fullCalendar('updateEvent', event);
  updateEvent(event); // update in Google Calendar
  
  closePopup();
}

function eventDetailCheckbox() {
  if ($('#event-detail-completed').is(':checked')) 
    { $('#event-detail-completed-duration').prop( "disabled", false ); }
  else
    { $('#event-detail-completed-duration').prop( "disabled", true ); }
}
function workDetailCheckbox() {
  if ($('#work-detail-completed').is(':checked')) 
    { $('#work-detail-completed-duration').prop( "disabled", false ); }
  else
    { $('#work-detail-completed-duration').prop( "disabled", true ); }
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
          console.log(event)
          eventPopup(event,jsEvent,view);
        },

        eventRender: function(event, element, view) {
          linkWorkToDue(event,element,view);
        },

        eventResize: function(event, delta, revertFunc, jsEvent, ui, view ) {
          // 1. update self
          event.givenEstimate += delta.asHours()
          console.log('new event')
          console.log(event)
          $('#calendar').fullCalendar('updateEvent',event)
          // 2. update in target event
          var targetEvent = getEventForHash(event.target)
          targetEvent.workEvents[event.hash] = event.givenEstimate;
          // 3. update self and target in Google Calendar
          updateEvent(event);
          updateEvent(targetEvent);
        },

        eventDrop: function( event, delta, revertFunc, jsEvent, ui, view ) {
          // block dragging all-days to daily and vv.
          if (( 'type' in event ) && (event.allDay == false)) { revertFunc() }
          else if (!('type' in event) && (event.allDay)) { revertFunc() }
          else { updateEvent(event); }
        },

        dayClick: function(day, jsEvent, view) {
          // clicking on a day switches to that day
          // clicking on a time adds an event at that time
          if (day.hasTime())
          {
            if (!(day._ambigTime))
            {
              $("#add-task-popup").addClass('active');
              $('#schedule-work-radio').click();
              $("#work-scheduled-for-field").val(day.format());
              $("#work-scheduled-until-field").val(day.add(1,'hour').format());
            }
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
})

// One call total
// performance testing indicates this is faster than one call per week
function googleAuthCalFound() {
  var start = moment().subtract(1,'year');
  var end   = moment().add(1,'year');
  getEvents(start.format(),end.format(),eventsReturned)
}

function eventsReturned(events) {
  var events = events.result.items
  if (events.length > 0) 
  {
    var renderEvents = [];
    events.forEach(function(e){
      try //try JSON parse; if it works, then it's a tictalk event
      {
        parsedEvent = JSON.parse(e.description)
        if ('end' in parsedEvent)
        {
          parsedEvent.start = moment(parsedEvent.start).local();
          parsedEvent.end   = moment(parsedEvent.end).local();
        }

        renderEvents.push(parsedEvent);
      }
      catch (err) // if JSON parse fails, it's not a tictalk event
      {
        var calEvent = {
          title: e.summary,
          start: moment(e.start.dateTime),
          end:   moment(e.end.dateTime),
          color: '#f95688',
          editable: false
        }
        renderEvents.push(calEvent);
      }
    })

    $('#calendar').fullCalendar('renderEvents', renderEvents, true);
    $('#loading').removeClass('active');

    buildCalcIndex();
    buildTaskSelectionDropdown();
    buildTaskTypesDropdown();
  }
  else
  {
  }
}

function eventPopup(event,jsEvent,view) {
  if (!('shortTitle' in event)) { return } // shortTitle operates as a flag for Tic Talk events
  if (event.isDue) // behavior for due events
  { 
    $('#event-detail-title').html(event.shortTitle);
    $('#event-detail-type').html("<i>"+event.type+"</i>");
    $('#event-detail-due').html(event.start.format());
    $('#event-detail-given-estimate').html(event.givenEstimate);
    $('#event-detail-calc-estimate').html(event.calcEstimate);
    $('#event-detail-work').empty();
    var sum = 0;
    Object.keys(event.workEvents).forEach(function(eventHash) {
      var workEvent = getEventForHash(eventHash)
      var duration  = event.workEvents[eventHash];

      $('#event-detail-work').append(
        $("<div>").html(duration + " hours on " + workEvent.start.format('ddd MM/DD'))
      )

      sum = sum + duration;
    })
    if (event.actualDuration !== null) // if the event is completed...
    {
      $('#event-detail-completed')
        .prop( "checked", true );
      $('#event-detail-completed-duration')
        .val(parseFloat(event.actualDuration))
        .prop( "disabled", false );
    }
    else // event incomplete
    {
      $('#event-detail-completed')
        .prop( "checked", false );
      $('#event-detail-completed-duration')
        .val(sum)
        .prop( "disabled", true );
    }

    $('#event-detail-savebutton').off("click").click(function(){saveEventDetail(event)});
    $('#event-detail-delete').off("click").click(function(){ deleteDueEvent(event) });
    $('#event-detail-popup').addClass('active')
  }


  else // behavior for work events
  {
    var target = getEventForHash(event.target)

    $('#work-detail-title').html(event.shortTitle);
    $('#work-detail-target').html(target.title)
    $('#work-detail-start').html(event.start.format('YYYY-MM-DD HH:mm'))
    $('#work-detail-end').html(event.end.format("YYYY-MM-DD HH:mm"))

  if (event.actualDuration !== null) // if the event is completed...
    {
      $('#work-detail-completed')
        .prop( "checked", true );
      $('#work-detail-completed-duration')
        .val(parseFloat(event.actualDuration))
        .prop( "disabled", false );
    }
    else // event incomplete
    {
      $('#work-detail-completed')
        .prop( "checked", false );
      $('#work-detail-completed-duration')
        .val(event.givenEstimate)
        .prop( "disabled", true );
    }

    $('#work-detail-savebutton').off("click").click(function(){saveWorkDetail(event)})
    $('#work-detail-delete').off("click").click(function(){ deleteWorkEvent(event) });
    $('#work-detail-popup').addClass('active')
  }
}

function deleteWorkEvent(event,deleteDueEventMode = false) {
  userConfirmed = false;
  if (!(deleteDueEventMode)) { userConfirmed = confirm("Are you sure you want to delete this work event?") }

  if (deleteDueEventMode || userConfirmed) 
  { 
    // if we're just deleting this work event, we take it out of it's parent DUE event index
    if (!deleteDueEventMode) 
    {
      var targetEvent = getEventForHash(event.target)
      delete targetEvent.workEvents[event.hash]; buildCalcIndex();
    }

    // here, we delete the work event
    deleteEvent(event.hash)
    $('#calendar').fullCalendar('removeEvents',event._id)
    closePopup()
  }
}

function deleteDueEvent(event) {
  if (confirm("Are you sure you want to delete this assignment?\nThis will delete all related work events!")) 
  {
    // deleting children work events
    Object.keys(event.workEvents).forEach(function(workEventHash){
      deleteWorkEvent(getEventForHash(workEventHash),true);
    })

    // deleting parent
    deleteEvent(event.hash)
    $('#calendar').fullCalendar('removeEvents',event._id) 
    closePopup()
  }
}

function linkWorkToDue(event,element,view) {
  // if event is a WORK event, link it to its DUE event
  if ('target' in event) {
    var targetEvent = getEventForHash(event.target)
    if (!(event.hash in targetEvent.workEvents)) { targetEvent.workEvents[event.hash] = event.givenEstimate; } //push if does not exist

    // Update DUE event to represent hours put forth

  }
}

// And here's a simple get function! Hey!
function getCalcEstimate(type) {
  if (type in calcEstimates) 
  {
    return calcEstimates[type].estimate;
  } 
  else 
  {
    return -1
  }
}

function buildCalcIndex() {
  calcEstimates = {}
  var allEvents = $('#calendar').fullCalendar('clientEvents',isDueFilter);
  allEvents.forEach(function(e) { 
    addToIndex(e);
  })
  
  Object.keys(calcEstimates).forEach(function(type) {
    calculateEstimatesFor(type);
  })
}

function addToIndex(event) {
  var type = event.type
  if (!(type in calcEstimates)) {
      calcEstimates[type] = {'givenHistory': [], 'calcHistory':[], 'actualHistory':[], 'estimate': -1}
    }
    if ('givenEstimate'  in event) { calcEstimates[type].givenHistory.push(event.givenEstimate);   }
    else                           { calcEstimates[type].givenHistory.push(null);                  }
    if ('calcEstimate'   in event) { calcEstimates[type].calcHistory.push(event.calcEstimate);     }
    else                           { calcEstimates[type].calcHistory.push(null);                   }
    if ('actualDuration' in event) { calcEstimates[type].actualHistory.push(event.actualDuration); }
    else                           { calcEstimates[type].actualHistory.push(null);                 }
}

// this algorithm is bogus. Please rewrite soon.
function calculateEstimatesFor(type) {
  var givenSum  = calcEstimates[type].givenHistory.sum();
  var calcSum   = calcEstimates[type].calcHistory.sum();
  var actualSum = calcEstimates[type].actualHistory.sum();

  var length = calcEstimates[type].givenHistory.length;

  calcEstimates[type].estimate = (givenSum + calcSum + actualSum)/(length*3)
}

Array.prototype.sum = function() {
    return this.reduce(function(a,b){return a+b;});
};


function addNewEvent(eventToAdd) {
	// 1. Add Event to fullCalendar
	$('#calendar').fullCalendar('renderEvent', eventToAdd, true);
	// 2. Add Event to Google Calendar
  createEvent(eventToAdd);
}

function isDueFilter(event) { return event.isDue }
function hasIDFilter(event, id) { return (event.target === id) }
function isTypeFilter(event, type) { return (event.type === type)}
function isTicTalkFilter(event) { return ('shortTitle' in event)}
function thisWeekFilter(event) { return moment().week() === event.start.week() }
function isTicTalkInFuture(event) { return (('shortTitle' in event) && (event.start >= moment().startOf('day'))) }
function eventHasHash(event,hash) { return event.hash == hash }
function inDayNotAllDayFilter(event,day) { return (event.start.isSame(day, 'day') && !(event.allDay))}

function getEventForHash(hash) {
  return $('#calendar').fullCalendar('clientEvents',function(e){return eventHasHash(e,hash)})[0]
}

function hash(s) {
    /* Simple hash function. */
    var a = 1, c = 0, h, o;
    if (s) {
        a = 0;
        /*jshint plusplus:false bitwise:false*/
        for (h = s.length - 1; h >= 0; h--) {
            o = s.charCodeAt(h);
            a = (a<<6&268435455) + o + (o<<14);
            c = a & 266338304;
            a = c!==0?a^c>>21:a;
        }
    }
    return String(a + moment().unix());
};

// ** GLOBAL DATA TYPES AND STORAGE ******************************* //
calcEstimates = {}; // {type:estimateinfo}

function event(newEvent) {
	this.title    = newEvent.title;
	this.start    = moment(newEvent.start); 
	this.editable = true;

	if (newEvent.isDue) // this is our flag indicating a due item or a work item
		{ 
      this.allDay = true; 
      this.class  = 'assignment';
      this.isDue  = true;
      this.shortTitle = this.title;
      this.title  = "DUE: " + this.title;
      this.type   = newEvent.type;

      this.calcEstimate   = parseFloat(getCalcEstimate(newEvent.type));
      this.givenEstimate  = parseFloat(newEvent.givenEstimate);

      this.workEvents = {};

      this.color = "#c1185b";
    }
	else
		{ 
      this.class  = 'work';
      this.end   = moment(newEvent.finish);
      this.givenEstimate = moment.duration(this.end.diff(this.start)).asHours();
      this.isDue = false;
      this.shortTitle = this.title;
      this.title = this.title;
      this.target = newEvent.target;
    }

  if ( 'actualDuration' in newEvent) { this.actualDuration = newEvent.actualDuration; }
  else { this.actualDuration = null; } // incomplete events don't yet have a duration

  // this.hash = hash(JSON.stringify(this))
  this.hash = moment().format('x') // forget hashing. Let's just use UNIX time! Max 1 event/ms
}
