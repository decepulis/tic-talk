// When the document loads, we execute this code
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
	     }
    })
})