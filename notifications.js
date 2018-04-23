// request permission on page load
$(document).ready(function(){
  document.addEventListener('DOMContentLoaded', function () {
  if (!Notification) {
    alert('Desktop notifications not available in your browser. Try Chromium.'); 
    return;
  }

  if (Notification.permission !== "granted")
    Notification.requestPermission();
});})

function notify(title,body,url) {
  if (Notification.permission !== "granted")
    Notification.requestPermission();
  else {
    var notification = new Notification(title, {
      icon: './favicons/_src/TTmedium.png',
      body: body,
    });

    notification.onclick = function () {
      window.open(url);      
    };
  }
}

function scheduleWeek() {
  console.log('schedule week')
  var title = "Tic Talk: Schedule your Week!";
  var body  = "Spend 5 minutes planning your week.";
  var url   = "http://localhost:8000/Library/Mobile%20Documents/com~apple~CloudDocs/SS18/Senior%20Design%202/tic-talk/index.html";
  notify(title,body,url)
}

function reflectDay() {
  console.log('reflect day')
  var title = "Tic Talk: Reflect on your Day!";
  var body  = "How long did your work take today?";
  var url   = "http://localhost:8000/Library/Mobile%20Documents/com~apple~CloudDocs/SS18/Senior%20Design%202/tic-talk/index.html";
  notify(title,body,url)
}