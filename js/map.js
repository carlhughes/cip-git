$(document).ready(function () {

  require(["esri/views/MapView", "esri/Map", "esri/WebMap", "esri/layers/MapImageLayer", "esri/tasks/QueryTask", "esri/tasks/support/Query", "esri/core/watchUtils",
    "esri/widgets/Search",
    "esri/layers/FeatureLayer",
    "esri/tasks/Locator",
    "esri/Graphic"
  ], function (MapView, Map, WebMap, MapImageLayer, QueryTask, Query, watchUtils, Search, FeatureLayer, Locator, Graphic) {
    var projId;
    var reset;

    var map = new Map({
      basemap: "topo"
    });

    var projectLocations = new MapImageLayer({
      url: "https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/MapServer",
      sublayers: [{
        id: 1,
        outFields: ["*"],
        visible: true,
        popupEnabled: true,
        popupTemplate: {
          title: "{Project_Description}",
          content: popupFunction
        }
      }]
    });

    var queryProjectTask = new QueryTask({
      url: "https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/MapServer/0"
    });

    var commentLayer = new FeatureLayer({
      url: "https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/FeatureServer/2",
      outFields: ["*"],
    });

    function popupFunction(target) {
      var query = new Query({
        outFields: ["*"],
        where: "Project_Description = '" + target.graphic.attributes.Project_Description + "'"
      });
      return queryProjectTask.execute(query).then(function (result) {
        var attributes = result.features[0].attributes;
        if (view.popup.selectedFeature.attributes.Project_Description == attributes.Project_Description) {
          projId = attributes.ProjectID;
          console.log("FIRST POPUP PROJ ID SET", projId);
          showComments(projId);
        }
        return "<p id='popupFeatureSelected' val='" + attributes.ProjectID + "'>" + attributes.ProjectID + "</br>MassDOT Division: " + attributes.Division + "</br> Location: " + attributes.Location + "</br> Program: " + attributes.Program + "</br> Total Cost: " + attributes.Total__M + "</p>";
      });
    }

    var view = new MapView({
      map: map,
      container: "viewDiv",
      zoom: 9, // Sets zoom level based on level of detail (LOD)
      center: [-71.8, 42] // Sets center point of view using longitude,latitude
    });


    var searchWidget = new Search({
      view: view,
      allPlaceholder: "Search location or project (ex. Red-Blue Connector)",
      locationEnabled: false,
      popupEnabled: true,
      container: "searchPlace",
      includeDefaultSources: false,
      sources: [{
        layer: new FeatureLayer({
          url: "https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/FeatureServer/1",
          outFields: ["*"],
          popupTemplate: {
            title: "{Project_Description}",
            content: popupFunction
          }
        }),
        searchFields: ["Project_Description", "Program"],
        displayField: "Project_Description",
        exactMatch: false,
        outFields: ["*"],
        name: "CIP Projects",
        placeholder: "example: Red-Blue Connector",
        maxResults: 60,
        maxSuggestions: 6,
        suggestionsEnabled: true,
        minSuggestCharacters: 2,
        popupEnabled: true,
        autoNavigate: true
      }, {
        locator: new Locator({
          url: "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer"
        }),
        singleLineFieldName: "SingleLine",
        outFields: ["Addr_type"],
        name: "Address Search"
      }]
    });

    map.add(projectLocations); // adds the layer to the map

    view.on('click', function (event) {
      projId;
      $('#helpContents').hide();
      $('#commentForm').hide()
      $('#projectList').hide();
      searchWidget.clear();
    })

    watchUtils.watch(view.popup, "visible", function () {
      $(".esri-popup__navigation").on("click", function (e) {
        projId = false;
        console.log("BUTTON PRESSED", projId);
        showComments(projId);
      });
    });

    watchUtils.watch(view.popup, "selectedFeature", function () {
      projId = false;
      console.log("SELECTED FEATURE CHANGED", projId)
    });

    $(".filter").change(function () {
      filterMap();
    });

    $("#aboutTool").click(function () {
      $('#commentForm').hide()
      $('#projectList').hide();
      $('#helpContents').show();
      console.log("SHOW HELP");

    });


    function filterMap() {
      sql = "1=1"
      var divisions = "(1=1)";
      if ($("#division").val() !== "All") {
        divisions = "Division = '" + $("#division").val() + "'";
      } else {
        divisions = "1=1"
      }

      programs = "(1=1)"
      if ($("#programs").val()[0] == 'All') {
        programs = "(1=1)"
      } else {
        $($("#programs").val()).each(function () {
          if (this == $("#programs").val()[0]) {
            programs = "Program = '" + this + "'"
          } else {
            programs = programs + " OR Program = '" + this + "'"
          }
        });
      }

      $("#minValue").html("Minimum project cost: $" + parseInt($("#min").val().replace(/\D/g, '')).toLocaleString())
      $("#maxValue").html("Maximum project cost: $" + parseInt($("#max").val().replace(/\D/g, '')).toLocaleString())
      sql = sql + " AND (" + divisions + ") AND (" + programs + ") AND ( Total__M >= " + $("#min").val() + " AND Total__M <= " + $("#max").val() + ")"
      projectLocations.findSublayerById(1).definitionExpression = sql;
    }

    function showComments(projId) {
      $('#helpContents').hide();
      if (projId == false) {
        html = $.parseHTML(view.popup.content.viewModel.content)
        projId = $(html).attr('val');
      }
      $.post("https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/FeatureServer/2/query", {
          where: "Division_ID = '" + projId + "'",
          outFields: "*",
          f: "json",
          returnGeometry: "false",
          returnIdsOnly: "false"
        })
        .done(function (data) {
          data = JSON.parse(data);
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
        "Comments": formValue[1].value,
        "Division_ID": projId
      }
      addFeature = new Graphic({
        attributes: theComment
      });
      commentLayer.applyEdits({
        addFeatures: [addFeature],
      }).then(function () {
        showComments(projId);
      });
      $('#commentForm').trigger("reset");

    }

  });
});
