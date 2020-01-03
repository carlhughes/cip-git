$(document).ready(function () {
  $.getJSON("config/strings.json")
    .done(function (json) {
      strings = json.strings;
      populateStrings();
    })
    .fail(function (jqxhr, textStatus, error) {
      var err = textStatus + ", " + error;
    });


  function populateStrings() {
    $("#generalComment").html("<div class='modal-dialog modal-dialog-centered asdfasdfasdf' role='document'>    <div class='modal-content'>      <div class='modal-header'>        <h3 class='modal-title' id='exampleModalCenterTitle'>Leave a General Comment!</h3>        <button type='button' class='close' data-dismiss='modal' aria-label='Close'> <span aria-hidden='true'>&times;</span> </button>      </div>      <div class='modal-body'>        <form id='generalCommentForm' class= 'w-100 h-20 sideContents'>          <div class='form-group'>            <label for='nameFieldgen'>Name</label>            <input type='text' class='form-control' id='nameFieldgen' placeholder='Optional' name='nameField'>            <label for='emailFieldgen'>Email (Optional)</label>            <input type='text' class='form-control' id='emailFieldgen' placeholder='Optional' name='emailField'>            <label for='townFieldgen'>Town/Organization (Optional)</label>            <input type='text' class='form-control' id='townFieldgen' placeholder='Optional' name='townField'>          </div>          <div class='form-group'>            <label for='commentFieldgen'>Comments</label>            <textarea class='form-control' id='commentFieldgen' placeholder='Enter your comments here' name='commentField' required></textarea>            <div class='invalid-feedback'> Please enter a comment in the textarea. </div>          </div>          <button class='btn btn-primary btn-block' id='submitCommentgen' type='submit'>Submit Comment</button>          <div class='alert alert-warning string general_comment_issue' role='alert' style='display: none'> </div>        </form>      </div>      <div class='alert alert-success string comment_success' role='alert' style='display: none' > </div>      <div class='modal-footer'>        <button type='button' class='btn btn-secondary' data-dismiss='modal'>Close</button>      </div>    </div>  </div>")	  
    $("#aboutTool").html(  "<div class='modal-dialog modal-dialog-centered' role='document'>    <div class='modal-content'>      <div class='modal-header'>        <h3 class='modal-title' id='aboutToolTitle'>Welcome to the CIP Comment Tool and Interactive Map!</h3>        <button type='button' class='close' data-dismiss='modal' aria-label='Close'> <span aria-hidden='true'>&times;</span> </button>      </div>      <div class='modal-body'>        <p class='string page_help'></p>      </div>      <div class='modal-footer'>        <button type='button' class='btn btn-secondary' data-dismiss='modal'>Close</button>      </div>    </div>  </div>")
    $("#loading").html(  "<div class='modal-dialog' role='document'>    <div class='modal-content'>      <div class='modal-body'>        <h5 class='modal-title text-center'>Finding projects...</h5>        <div class='text-center'>          <div class='spinner-border' role='status'> <span class='sr-only'>Loading...</span> </div>        </div>      </div>    </div>  </div>")
	  
	  
	  
    $(".page_help").text(strings.help_message);
    $(".comment_issue").text(strings.comment_failed);
    $(".comment_success").text(strings.comment_confirmed);
    $(".project_comment_failure").text(strings.comment_failed);
    $(".project_comment_success").text(strings.comment_confirmed);
  }


});
