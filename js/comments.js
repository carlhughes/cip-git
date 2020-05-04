$(document).ready(function () {
  require(["esri/Map", "esri/WebMap", "esri/layers/MapImageLayer", "esri/tasks/QueryTask", "esri/tasks/support/Query", "esri/core/watchUtils",
    "esri/layers/FeatureLayer",
    "esri/views/layers/support/FeatureFilter",
    "esri/Graphic"
  ], function (Map, WebMap, MapImageLayer, QueryTask, Query, watchUtils, FeatureLayer, FeatureFilter, Graphic) {

    categories = ["Airports", "Roadway or bridge maintenance", "Roadway safety", "Bike and pedestrian improvements", "MBTA buses", "MBTA commuter rail", "MBTA rapid transit", "Freight", "Planning/funding", "Rail", "Regional transit", "Registry of Motor Vehicles", "Other"];

    commentLayer = new FeatureLayer({
      url: "https://gis.massdot.state.ma.us/rh/rest/services/Projects/CIPCommentTool/FeatureServer/2",
      outFields: ["*"],
    });

    $("#commentForm").submit(function (event) {
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
          category = $("#catSelect").val()
          submitComment(formValue);
        }
      });
    })

    $("#generalCommentForm").submit(function (event) {
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
          category = $("#catSelect").val()
          submitComment(formValue);
        }
      });
    })

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
            $('#generalComment').modal('hide')
            $('#comment_success_modal').modal('show')
          } else {
            $('#comment_success_modal').modal('show')
      	    document.getElementById("commentForm").reset();
      	    document.getElementById("commentForm").classList.remove('was-validated');
            updateComments(projId);
          }
        } else {
          $('.general_comment_issue').show()
          $('.project_comment_failure').show()
        }
      });
    }

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
            results.append("This project currently has no comments.");
          }
          results.show();
          $('#commentForm').show();
          $('#projectList').show();
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

    $(categories).each(function () {
      $('#catSelectPrj').append(
        $('<option></option>').val(this).html(this)
      );
    });

    $('#generalComment').on('hidden.bs.modal', function (e) {
      document.getElementById("generalCommentForm").reset();
      document.getElementById("generalCommentForm").classList.remove('was-validated');
    })

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
