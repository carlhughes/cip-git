$(document).ready(function () {
  require(["esri/views/MapView", "esri/Map", "esri/WebMap", "esri/layers/MapImageLayer", "esri/tasks/QueryTask", "esri/tasks/support/Query", "esri/core/watchUtils",
    "esri/layers/FeatureLayer",
    "esri/layers/GraphicsLayer",
    "esri/tasks/Locator",
    "esri/views/layers/support/FeatureFilter",
    "esri/Graphic"
  ], function (MapView, Map, WebMap, MapImageLayer, QueryTask, Query, watchUtils, FeatureLayer, GraphicsLayer, Locator, FeatureFilter, Graphic) {

    commentLayer = new FeatureLayer({
      url: "https://gis.massdot.state.ma.us/rh/rest/services/Projects/CIPCommentTool/FeatureServer/2",
      outFields: ["*"],
    });

    function updateComments(projId) {
      $.post("https://gis.massdot.state.ma.us/rh/rest/services/Projects/CIPCommentTool/FeatureServer/2/query", {
          where: "Division_ID = '" + projId + "'",
          outFields: "*",
          f: "json",
          returnGeometry: "false",
          returnIdsOnly: "false"
        })
        .done(function (data) {
          var results = $('#results');
          results.hide();
          results.empty();
          if ($(data.features).length > 0) {
            $(data.features).each(function () {
              results.append("<div class='media'><div class='media-body'><h5 class='media-heading user_name'>" + this.attributes.Name + "</h5>" + this.attributes.Comments + "</div></div>");
            });
            results.show();
          } else {
            results.append("This project currently has no comments111. PROJ ID: " + projId);
          }
          results.show();
          $('#commentForm').show();
          $('#projectList').show();
        });

    }

    $("#commentForm").submit(function (event) {
	  console.log(event)
	  console.log(this)
      formValue = $(this).serializeArray()
      console.log(formValue);
      category = $("#catSelectPrj").val()
      var forms = document.getElementsByClassName('needs-validation');
      var validation = Array.prototype.filter.call(forms, function (form) {
        if (form.checkValidity() === false) {
          event.preventDefault();
          event.stopPropagation();
          formValid = false;
        }
        form.classList.add('was-validated');
        event.preventDefault();
        event.stopPropagation();
        if (form.checkValidity() === true) {
          formValid = true;
          console.log("Save clicked - form is valid");
          category = $("#catSelect").val()
          submitComment(formValue);
        }
      });
    })

    $("#generalCommentForm").submit(function (event) {
      event.preventDefault();
      formValue = $(this).serializeArray()
      var forms = document.getElementsByClassName('needs-validation');
      var validation = Array.prototype.filter.call(forms, function (form) {
        if (form.checkValidity() === false) {
          event.preventDefault();
          event.stopPropagation();
          formValid = false;
        }
        form.classList.add('was-validated');
        event.preventDefault();
        event.stopPropagation();
        if (form.checkValidity() === true) {
          formValid = true;
          console.log("Save clicked - form is valid");
          projId = '99999'
          console.log(formValue);
          category = $("#catSelect").val()
          submitComment(formValue);
        }
      });
    })

//    $("#commentForm").submit(function (event) {
//      event.preventDefault();
//      formValue = $(this).serializeArray()
//      console.log(formValue);
//      category = null
//      submitComment(formValue);
//    })
	  
    //    $("#generalCommentForm").submit(function (event) {
    //      event.preventDefault();
    //      formValue = $(this).serializeArray()
    //      projId = '99999'
    //      console.log(formValue);
    //	  category = $("#catSelect").val()
    //      submitComment(formValue);
    //    })

    function submitComment(formValue) {
      theComment = {
        "Name": formValue[0].value,
        "Last_Name": formValue[1].value,
        "Email": formValue[2].value,
        "Organization": formValue[4].value,
        "Zip": formValue[3].value,
        "Category": category,
        "Comments": formValue[5].value,
        "Division_ID": projId
      }
      addFeature = new Graphic({
        attributes: theComment
      });
      commentLayer.applyEdits({
        addFeatures: [addFeature],
      }).then(function (results) {
        $('#prjLikes').hide()
        if (results.addFeatureResults[0].error == null) {
          if (projId == '99999') {
            $('.comment_success').show()
            $('#generalCommentForm').trigger("reset");
            $('#generalCommentForm').hide();
          } else {
            $('.project_comment_success').show()
            updateComments(projId);
            $('#commentForm').trigger("reset");
          }
        } else {
          $('.general_comment_issue').show()
          $('.project_comment_failure').show()
        }
      });
    }


    $('#likeProject').on('click', function () {
      if (liked === false) {
        $(this).prop('disabled', true);
        liked = true;
        var query = new Query({
          outFields: ["*"],
          where: "ProjectID = '" + projId + "'"
        });
        queryProjectTask.execute(query).then(function (result) {
          var projectToLike = result.features[0];
          projectToLike.attributes.Votes = projectToLike.attributes.Votes + 1
          projectList.applyEdits({
            updateFeatures: [projectToLike],
          }).then(function (results) {
            $('#prjLikes').append(projectToLike.attributes.Votes + " people like this project.");
            $('#prjLikes').show()
          });
        });

      } else {
        console.log("Project already liked");
      }
    })

    categories = ["Airports", "Roadway or bridge maintenance", "Roadway safety", "Bike and pedestrian improvements", "MBTA buses", "MBTA commuter rail", "MBTA rapid transit", "Freight", "Planning/funding", "Rail", "Regional transit", "Registry of Motor Vehicles", "Other"];

      $(categories).each(function () {
        $('#catSelectPrj').append(
          $('<option></option>').val(this).html(this)
        );
      });
	  
    $('#generalComment').on('shown.bs.modal', function () {
      $('.comment_success').hide()
      $('.general_comment_issue').hide()
      $('#generalCommentForm').show();
      $(categories).each(function () {
        $('#catSelect').append(
          $('<option></option>').val(this).html(this)
        );
      });
    })

  });
});
