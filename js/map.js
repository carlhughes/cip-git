$(document).ready(function () {

  require(["esri/views/MapView", "esri/Map", "esri/WebMap", "esri/layers/MapImageLayer", "esri/tasks/QueryTask", "esri/tasks/support/Query", "esri/core/watchUtils",
    "esri/layers/FeatureLayer",
    "esri/layers/GraphicsLayer",
    "esri/tasks/Locator",
    "esri/views/layers/support/FeatureFilter",
    "esri/Graphic"
  ], function (MapView, Map, WebMap, MapImageLayer, QueryTask, Query, watchUtils, FeatureLayer, GraphicsLayer, Locator, FeatureFilter, Graphic, comments) {
    var reset;
    var extentForRegionOfInterest = false;

    var map = new Map({
      basemap: "topo"
    });

    projectLocations = new FeatureLayer({
      url: "https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/MapServer/1",
      outFields: ["*"],
      visible: true,
      popupEnabled: true,
      popupTemplate: {
        title: "{Project_Description}",
        content: popupFunction
      }
    });

    projectLocationsPoints = new FeatureLayer({
      url: "https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/MapServer/3",
      outFields: ["*"],
      visible: true,
      popupEnabled: true,
      popupTemplate: {
        title: "{Project_Description}",
        content: popupFunction
      }
    });

    projectLocationsPolygons = new FeatureLayer({
      url: "https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/MapServer/4",
      outFields: ["Project_Description"],
      visible: false,
      popupEnabled: true,
      popupTemplate: {
        title: "{Project_Description}",
        content: popupFunction
      }
    });

    townLayer = new FeatureLayer({
      url: "https://gis.massdot.state.ma.us/arcgis/rest/services/Boundaries/Towns/MapServer/0",
    });

    mpoLayer = new FeatureLayer({
      url: "https://gis.massdot.state.ma.us/arcgis/rest/services/Boundaries/MPOs/MapServer/0",
    });

    commentLayer = new FeatureLayer({
      url: "https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/FeatureServer/2",
      outFields: ["*"],
    });

    var view = new MapView({
      map: map,
      container: "viewDiv",
      zoom: 9, // Sets zoom level based on level of detail (LOD)
      center: [-71.8, 42] // Sets center point of view using longitude,latitude
    });


    var g = document.createElement('input');
    g.setAttribute("id", "projectSearch2");
    g.className = 'form-control mr-sm-2 input w-100';


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
        return "<p id='popupFeatureSelected' val='" + attributes.ProjectID + "'>" + attributes.ProjectID + "</br><a href='https://hwy.massdot.state.ma.us/projectinfo/projectinfo.asp?num=" + attributes.ProjectID + "' target=blank id='pinfoLink'>Project Info Link</a></br>MassDOT Division: " + attributes.Division + "</br> Location: " + attributes.Location + "</br> Program: " + attributes.Program + "</br> Total Cost: " + attributes.Total__M + "</p> This is a " + attributes.Division + " project programmed as " + attributes.Program + ". It is located in " + attributes.Location + " and has a total cost of " + numeral(attributes.TotalCost).format('$0,0[.]00') + ".</br></br> It also lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
      });
    }

    var queryProjectTask = new QueryTask({
      url: "https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/MapServer/0"
    });

    /*    var searchWidget = new Search({
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
            searchFields: ["Project_Description", "Program", "ProjectID"],
            displayField: "Project_Description",
            exactMatch: false,
            outFields: ["*"],
            name: "CIP Projects (Lines)",
            placeholder: "example: Red-Blue Connector",
            maxResults: 60,
            maxSuggestions: 6,
            suggestionsEnabled: true,
            minSuggestCharacters: 2,
            popupEnabled: true,
            autoNavigate: true
          }, {
            layer: new FeatureLayer({
              url: "https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/FeatureServer/3",
              outFields: ["*"],
              popupTemplate: {
                title: "{Project_Description}",
                content: popupFunction
              }
            }),
            searchFields: ["Project_Description", "Program", "ProjectID"],
            displayField: "Project_Description",
            exactMatch: false,
            outFields: ["*"],
            name: "CIP Projects (Points)",
            placeholder: "example: Red-Blue Connector",
            maxResults: 60,
            maxSuggestions: 6,
            suggestionsEnabled: true,
            minSuggestCharacters: 2,
            popupEnabled: true,
            autoNavigate: true
          }, {
            layer: new FeatureLayer({
              url: "https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/FeatureServer/4",
              outFields: ["*"],
              popupTemplate: {
                title: "{Project_Description}",
                content: popupFunction
              }
            }),
            searchFields: ["Project_Description", "Program", "ProjectID"],
            displayField: "Project_Description",
            exactMatch: false,
            outFields: ["*"],
            name: "CIP Projects (Polygons)",
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
        });*/


    /*	  var searchTable =new FeatureLayer({
              url: "https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/FeatureServer/0",
              outFields: ["Project_Description", "Program", "ProjectID"],
            })
    	  
    	  
        var searchWidget = new Search({
          view: view,
          allPlaceholder: "Search location or project (ex. Red-Blue Connector)",
          locationEnabled: false,
          container: "searchPlace",
          includeDefaultSources: false,
          sources: [{
            layer: searchTable,
            searchFields: ["Project_Description", "Program", "ProjectID"],
            displayField: "Project_Description",
            exactMatch: false,
            outFields: ["ProjectID"],
            name: "CIP Projects (table)",
            placeholder: "example: Red-Blue Connector",
            maxResults: 60,
            maxSuggestions: 6,
            suggestionsEnabled: true,
            minSuggestCharacters: 2,
            popupEnabled: false,
            autoNavigate: false
          }]
        });
    	  
    	  searchWidget.on("select-result", function(event){
      console.log("The selected search result: ", event);
    });
    	*/

    view.on('click', function (event) {
      $('#helpContents').hide();
      $('#commentForm').hide()
      $('#projectList').hide();
      //searchWidget.clear();
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
      $("#mpoSelect").val("");
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
            filterMap();
          });
      } else {
        view.goTo({
          zoom: 9, // Sets zoom level based on level of detail (LOD)
          center: [-71.8, 42]
        });
        extentForRegionOfInterest = false;
        filterMap();
      }
    });

    $("#mpoSelect").change(function () {
      $("#townSelect").val("");
      var selectedMPO = $(this).children("option:selected").val();
      var query = mpoLayer.createQuery();
      if (selectedMPO != "All") {
        query.where = "MPO = '" + selectedMPO + "'";
        query.returnGeometry = true;
        query.outFields = ["MPO"];
        query.outSpatialReference = view.spatialReference;
        mpoLayer.queryFeatures(query)
          .then(function (response) {
            extentForRegionOfInterest = response.features[0].geometry
            view.goTo({
              target: response.features[0].geometry,
            });
            filterMap();
          });
      } else {
        view.goTo({
          zoom: 9, // Sets zoom level based on level of detail (LOD)
          center: [-71.8, 42]
        });
        extentForRegionOfInterest = false;
        filterMap();
      }
    });

    function filterMap() {
      view.map.removeAll();
      var sql = "1=1"
      divisionsSQL = "(1=1)";
      programsSQL = "(1=1)";
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
      sql = sql + " AND (" + divisionsSQL + ") AND (" + programsSQL + ") AND ( TotalCost  >= " + minCost + " AND TotalCost  <= " + maxCost + ")"

      var pointLayerResults = new FeatureLayer({
        popupTemplate: {
          title: "{Project_Description}",
          content: popupFunction
        },
        title: "Point Projects",
        geometryType: "point",
        spatialReference: {
          wkid: 3857
        },
        renderer: { // overrides the layer's default renderer
          type: "simple",
          symbol: {
            type: "simple-marker", // autocasts as new SimpleMarkerSymbol()
            color: "blue",
            size: 8,
            outline: { // autocasts as new SimpleLineSymbol()
              width: 0.5,
              color: "darkblue"
            }
          }
        }
      });

      var lineLayerResults = new FeatureLayer({
        popupTemplate: {
          title: "{Project_Description}",
          content: popupFunction
        },
        title: "Line Projects",
        geometryType: "polyline",
        spatialReference: {
          wkid: 3857
        },
        renderer: { // overrides the layer's default renderer
          type: "simple",
          symbol: {
            type: "simple-line", // autocasts as SimpleLineSymbol()
            color: [226, 119, 40],
            width: 4
          }
        }
      });


      var queryProjects = projectLocationsPoints.createQuery();
      if (extentForRegionOfInterest != false) {
        queryProjects.geometry = extentForRegionOfInterest;
        queryProjects.spatialRelationship = "intersects";
      }
      queryProjects.where = sql;
      queryProjects.returnGeometry = true;
      queryProjects.outFields = ["OBJECTID, Project_Description, ProjectID"];
      queryProjects.outSpatialReference = view.spatialReference;

      projectLocationsPoints.queryFeatures(queryProjects).then(function (response) {
        pointLayerResults.source = response.features;
        pointLayerResults.fields = response.fields;
        view.map.add(pointLayerResults);
      });

      projectLocations.queryFeatures(queryProjects).then(function (response) {
        lineLayerResults.source = response.features;
        lineLayerResults.fields = response.fields;
        //view.map.add(lineLayerResults);
      });
    }

    $("#cost-range").slider({
      range: true,
      min: 0,
      max: 100000000,
      values: [0, 100000000],
      slide: function (event, ui) {
        $("#minCost").val(numeral(ui.values[0]).format('0,0[.]00'));
        $("#maxCost").val(numeral(ui.values[1]).format('0,0[.]00'));
        filterMap();
      }
    });

    $(".costInput").change(function () {
      minValue = numeral($("#minCost").val()).value();
      maxValue = numeral($("#maxCost").val()).value();
      if (minValue > maxValue) {
        maxValue = minValue
      };
      $("#minCost").val(numeral(minValue).format('0,0[.]00'));
      $("#maxCost").val(numeral(maxValue).format('0,0[.]00'));
      $("#cost-range").slider("values", [minValue, maxValue]);
      filterMap();
    });

    $(".filter").change(function () {
      filterMap();
    });
    $("#projectSearch").autocomplete("option", "select", function (event, ui) {
      selectProject(ui.item.id);
    });

    function selectProject(id) {
		projId = id;
		showComments(projId);
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

  });
});
