// When the document loads, we execute this code
$(document).ready(function(){ 
	$('.header-button').click(function(){
		var popup_id = $(this).attr('data-popup');
		$(popup_id).addClass('active')
	})

	$('.popup-footer-textbutton').click(function(){
		$(this).closest('.popup').removeClass('active')
	})

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