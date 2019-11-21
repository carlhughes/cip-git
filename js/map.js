$(document).ready(function () {

  require(["esri/views/MapView", "esri/Map", "esri/WebMap", "esri/layers/MapImageLayer", "esri/tasks/QueryTask", "esri/tasks/support/Query", "esri/core/watchUtils",
    "esri/widgets/Search",
    "esri/layers/FeatureLayer",
    "esri/layers/GraphicsLayer",
    "esri/tasks/Locator",
    "esri/Graphic"
  ], function (MapView, Map, WebMap, MapImageLayer, QueryTask, Query, watchUtils, Search, FeatureLayer, GraphicsLayer, Locator, Graphic) {
    var projId;
    var reset;
    var extentForRegionOfInterest = false;

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

    var townLayer = new FeatureLayer({
      url: "https://gis.massdot.state.ma.us/arcgis/rest/services/Boundaries/Towns/MapServer/0",
    });

    var commentLayer = new FeatureLayer({
      url: "https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/FeatureServer/2",
      outFields: ["*"],
    });

    var resultsLayer = new GraphicsLayer();

    var view = new MapView({
      map: map,
      container: "viewDiv",
      zoom: 9, // Sets zoom level based on level of detail (LOD)
      center: [-71.8, 42] // Sets center point of view using longitude,latitude
    });

    map.addMany([resultsLayer, projectLocations]);


    function popupFunction(target) {
      var query = new Query({
        outFields: ["*"],
        where: "Project_Description = '" + target.graphic.attributes.Project_Description + "'"
      });
      return queryProjectTask.execute(query).then(function (result) {
        var attributes = result.features[0].attributes;
        if (view.popup.selectedFeature.attributes.Project_Description == attributes.Project_Description) {
          projId = attributes.ProjectID;
          showComments(projId);
        }
        return "<p id='popupFeatureSelected' val='" + attributes.ProjectID + "'>" + attributes.ProjectID + "</br>MassDOT Division: " + attributes.Division + "</br> Location: " + attributes.Location + "</br> Program: " + attributes.Program + "</br> Total Cost: " + attributes.Total__M + "</p>";
      });
    }

    var queryProjectTask = new QueryTask({
      url: "https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/MapServer/0"
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
        showComments(projId);
      });
    });

    watchUtils.watch(view.popup, "selectedFeature", function () {
      projId = false;
    });


    $("#townSelect").change(function () {
      var query = townLayer.createQuery();
      if ($("#townSelect").val() > 0) {
        query.where = "TOWN_ID = " + $("#townSelect").val();
        query.returnGeometry = true;
        query.outFields = ["TOWN_ID", "TOWN"];
        query.outSpatialReference = view.spatialReference;
        townLayer.queryFeatures(query)
          .then(function (response) {
            extentForRegionOfInterest = response.features[0].geometry
            view.goTo({
              target: response.features[0].geometry,
            });
            //filterMap();
          });
      } else {
        extentForRegionOfInterest = false;
        filterMap();
      }
    });


    function filterMap() {
      resultsLayer.removeAll();
      sql = "1=1"
      divisionsSQL = "(1=1)";
      programsSQL = "(1=1)";
      minCost = 0;
      maxCost = 100000000000;

      if ($("#division").val() !== "All") {
        divisionsSQL = "Division = '" + $("#division").val() + "'";
      }
      if ($("#programs").val()[0] !== 'All') {
        $($("#programs").val()).each(function () {
          if (this == $("#programs").val()[0]) {
            programsSQL = "Program = '" + this + "'"
          } else {
            programsSQL = programsSQL + " OR Program = '" + this + "'"
          }
        });
      }
      minCost = $("#cost-range").slider("values", 0)
      maxCost = $("#cost-range").slider("values", 1)

      sql = sql + " AND (" + divisionsSQL + ") AND (" + programsSQL + ") AND ( Total__M >= " + minCost + " AND Total__M <= " + maxCost + ")"
      projectLocations.findSublayerById(1).definitionExpression = sql;

      queryParams = projectLocations.findSublayerById(1).createQuery();
      if (extentForRegionOfInterest == false) {} else {
        queryParams.geometry = extentForRegionOfInterest;
      }
      queryParams.where = sql;
      /*
            projectLocations.findSublayerById(1).queryFeatures(queryParams).then(function (results) {
              view.goTo(extentForRegionOfInterest);
              var features = results.features.map(function (graphic) {
                graphic.symbol = {
                  type: "simple-line",
                  cap: "round",
                  width: 4,
                  color: [255, 0, 197, 0.51]
                };
                return graphic;
              });
              resultsLayer.addMany(features).then(function (results) {
              });
            });
      */
    }

    $("#cost-range").slider({
      range: true,
      min: 0,
      max: 100000000,
      values: [0, 100000000],
      slide: function (event, ui) {
        $("#rangeSliderValues").html("$" + ui.values[0] + " - $" + ui.values[1]);
        filterMap();
      }
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
