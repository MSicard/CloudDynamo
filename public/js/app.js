let myResult = [];
let myPage = 1;

function createImg(tag, value) {
  $('#' + tag).html(`<img src=${value}" height="100" width="100">`)
}

function removeImg(tag) {
  $('#' + tag).html('');
}

function disabledPrevious() {
  let disabled = false;
  if (myPage == 1) {
    disabled = true;
  } 
  $("#previous").prop('disabled', disabled);
}

function disabledNext() {
  let disabled = true;
  if ((myPage * 4) < myResult.length) {
    disabled = false;
  }
  $("#next").prop('disabled', disabled);
}


$(document).ready(function() {
  
  $("#version").html("v0.14");
  
  $("#searchbutton").click( function (e) {
    displayModal();
  });
  
  $("#searchfield").keydown( function (e) {
    if(e.keyCode == 13) {
      displayModal();
    }	
  });
  
  function displayModal() {
    $(  "#myModal").modal('show');

    $("#status").html("Searching...");
    $("#dialogtitle").html("Search for: "+$("#searchfield").val());
    $("#previous").hide();
    $("#next").hide();
    $.getJSON('/search/' + $("#searchfield").val() , function(data) {
      renderQueryResults(data);
    });
  }
  
  $("#next").click( function(e) {
    let i = myPage * 4;
      
    for (let j = 0; j < 4; j++) {
      if (myResult[j + i]) 
        createImg(`photo${j}`, myResult[j + i] );
      else 
        removeImg(`photo${j}`);
    }
    myPage += 1;
    disabledNext();
    disabledPrevious();
  });

  $('.myClose').click( function (e) {
    console.log(e);
    for(let i = 0; i < 4; i++) {
      removeImg(`photo${i}`);
    }
  });
  
  $("#previous").click( function(e) {
    let i = (myPage * 4) - 8;
    for (let j = 0; j < 4; j++) {
      if (myResult[j + i]) 
        createImg(`photo${j}`, myResult[j + i] );
    }
    myPage -= 1;
    disabledNext();
    disabledPrevious();
  });

  function renderQueryResults(data) {
    
    if (data.error != undefined) {
      $("#status").html("Error: "+data.error);
    } else {
      $("#status").html(""+data.num_results+" result(s)");
      
      myResult = data.results;
      let maxNumber = myResult.length > 4 ? 4 : myResult.length;
      for (let i = 0; i < maxNumber; i++) {
        createImg(`photo${i}`, myResult[i] );
      }
      
      $("#next").show();
      $("#previous").show();
      disabledNext();
      disabledPrevious();
     }
   }

   
});
