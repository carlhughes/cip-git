$(document).ready(function () {


  require(["esri/views/MapView", "esri/Map", "esri/WebMap", "esri/layers/MapImageLayer", "esri/tasks/QueryTask", "esri/tasks/support/Query", "esri/core/watchUtils",
    "esri/layers/FeatureLayer",
    "esri/layers/GraphicsLayer",
    "esri/tasks/Locator",
    "esri/views/layers/support/FeatureFilter",
    "esri/Graphic"
  ], function (MapView, Map, WebMap, MapImageLayer, QueryTask, Query, watchUtils, FeatureLayer, GraphicsLayer, Locator, FeatureFilter, Graphic) {

	      $("#aboutTool").click(function () {
      $('#commentForm').hide()
      $('#projectList').hide();
      $('#helpContents').show();
    });
	  
	  
    function updateComments(projId) {
          $.post("https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/FeatureServer/2/query", {
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
                  results.append("<div class='row w-100 container-fluid'><div class='col'><div class='card col'> <div class='card-body> <h6 class='card-subtitle mb-2 text-muted'>Name: " + this.attributes.Name + "</h6> <p class='card-text text-truncate' style='max-width: 190px'>Comment: " + this.attributes.Comments + "</p></div></div></div></div>");
                });
                results.show();
              } else {
                results.append("This project currently has no comments. PROJ ID: " + projId);
              }
              results.show();
              $('#commentForm').show();
              $('#projectList').show();
            });
    
        }

    $("#commentForm").submit(function (event) {
      event.preventDefault();
      formValue = $(this).serializeArray()
      submitComment(formValue);
    })
	  
    function submitComment(formValue) {
      theComment = {
        "Name": formValue[0].value,
        "Email ": formValue[1].value,
        "Organization ": formValue[2].value,
        "Comments": formValue[3].value,
        "Division_ID": projId
      }
      addFeature = new Graphic({
        attributes: theComment
      });
      commentLayer.applyEdits({
        addFeatures: [addFeature],
      }).then(function () {
        updateComments(projId);
      });
      $('#commentForm').trigger("reset");
    }

  });
});
