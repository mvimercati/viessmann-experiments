// This is a manifest file that'll be compiled into application.js, which will include all the files
// listed below.
//
// Any JavaScript/Coffee file within this directory, lib/assets/javascripts, vendor/assets/javascripts,
// or any plugin's vendor/assets/javascripts directory can be referenced here using a relative path.
//
// It's not advisable to add code directly here, but if you do, it'll appear at the bottom of the
// compiled file. JavaScript code in this file should be added after the last require_* statement.
//
// Read Sprockets README (https://github.com/rails/sprockets#sprockets-directives) for details
// about supported directives.
//
//= require jquery
//= require jquery_ujs
//= require turbolinks
//= require_tree .

window.onload=function() {

    var a = document.getElementById("casa");
    
    var svgDoc = a.contentDocument;    
    var svgItem; 
    var interval;
    var textItem;
    
    interval = setInterval(function() {

	var getOutputParams = {  };
	
	$.getJSON('/main.json', getOutputParams, function(data) {
	    
	    $.each(data, function(key, val) {

		svgItem = svgDoc.getElementById(key);

		if (svgItem != null) {
		

		    if (svgItem.firstChild) {
		
			if (svgItem.firstChild.firstChild) {
			
			    svgItem.firstChild.firstChild.textContent = val;


			    if (svgItem.firstChild.firstChild.firstChild) {
			    
				svgItem.firstChild.firstChild.firstChild.textContent = val;

				if (svgItem.firstChild.firstChild.firstChild.firstChild) {
				
				    svgItem.firstChild.firstChild.firstChild.firstChild.textContent = val;
				}
			    }
			}
		    }
		    
		}
		
	    });
	    
	});

    }, 5000);
    

}





