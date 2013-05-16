$(function() {
	$(window).load(resizeMain);
	$(window).resize(resizeMain);


	//Launch
	$("#launch-program #btn").click(function(){
		scrollTo($("body"));
		return false;
	});

	//Scroll
	$(".more").click(function(){
		scrollTo($("#bottom"));
		return false;
	});

	$(".back").click(function(){
		scrollTo($("body"));
		return false;
	});
	
});


function resizeMain(){
	winW = $(window).width();
	winH = $(window).height();
	//Fix panel to bottom
	$('#launch-program').css({
		'height' : winH - $("#top").outerHeight() - 20 +"px"
	});

	//Fix height of bottom part
	var a = (winH - $("#content").outerHeight())/2;
	if(a>0){
		$('#bottom').css({
			'height' : winH - a + "px"
		});

		$('#content').css({
			'margin-top' : a + "px"
		});
	}

	videoH = $('video').height();
	launchH = $('#launch-program').outerHeight();
	//if(videoH >= launchH){
		var x = (videoH - launchH)/2;
		$('video').css({
			'width' : winW+"px",
			'marginTop' : - x +"px"
		});
	//}
} 

function scrollTo($elem){
	$('html, body').animate({  
        scrollTop:$elem.offset().top  
    }, 'slow');
}