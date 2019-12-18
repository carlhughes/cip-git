$(document).ready(function () {

  require(["esri/views/MapView", "esri/Map", "esri/WebMap", "esri/layers/MapImageLayer", "esri/tasks/QueryTask", "esri/tasks/support/Query", "esri/core/watchUtils",
    "esri/layers/FeatureLayer",
    "esri/layers/GraphicsLayer",
    "esri/tasks/Locator",
    "esri/widgets/Search",
    "esri/widgets/Popup",
    "esri/views/layers/support/FeatureFilter",
    "esri/Graphic"
  ], function (MapView, Map, WebMap, MapImageLayer, QueryTask, Query, watchUtils, FeatureLayer, GraphicsLayer, Locator, Search, Popup, FeatureFilter, Graphic, comments) {
    var reset;
    var extentForRegionOfInterest = false;
    MBTALine = false;

    function googleTranslateElementInit() {
      new google.translate.TranslateElement({
          pageLanguage: 'en'
        },
        'google_translate_element'
      );
    }

    var map = new Map({
      basemap: "dark-gray",
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

    projectLocationsMBTA = new FeatureLayer({
      url: "https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/MapServer/7",
      popupTemplate: {
        title: "MBTA Line: {MBTA_Location}",
        content: popupFunctionMbta
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

    projectList = new FeatureLayer({
      url: "https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/MapServer/3",
      outFields: ["*"],
      visible: true,
      popupEnabled: true,
      popupTemplate: {
        title: "{Project_Description}",
        content: popupFunction
      }
    });

    map.addMany([projectLocations, projectLocationsPoints, projectLocationsMBTA]);

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
      MBTALine = false
      var query = new Query({
        outFields: ["*"],
        where: "ProjectID = '" + target.graphic.attributes.ProjectID + "'"
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


    function popupFunctionMbta(target) {
      listofFeatures = [];
      var query = new Query({
        outFields: ["*"],
        where: "MBTA_Location = '" + target.graphic.attributes.MBTA_Location + "'"
      });
      return queryProjectTask.execute(query).then(function (result) {
        var attributes = result.features[0].attributes;
        firstFeature = result.features[0];
        var table = ""
        $(result.features).each(function () {
          thisProject = "<p> <button class='btn info projList' id=" + this.attributes.ProjectID + ">" + this.attributes.Project_Description + " (" + this.attributes.ProjectID + ")</button></p>";
          table = table.concat(thisProject);
          var thisProject = new Graphic({
            geometry: view.popup.selectedFeature.geometry,
            attributes: this.attributes,
            symbol: {
              type: "simple-line", // autocasts as SimpleLineSymbol()
              color: [226, 119, 40],
              width: 10
            },
            popupTemplate: {
              title: "{Project_Description}",
              content: popupFunction
            }
          });
          listofFeatures.push(thisProject);
        });
        return "<p id='popupFeatureSelected' class='projList' val='" + attributes.MBTA_Location + "'><button class='btn btn-info'>View " + attributes.MBTA_Location + " projects</button>";
      });
    }

    $(document).on("click", ".projList", function (e) {
      view.popup.open({
        features: listofFeatures, // array of graphics
        featureMenuOpen: true,
        highlightEnabled: true // selected features initially display in a list
      });
      MBTALine = true
    });


    var queryProjectTask = new QueryTask({
      url: "https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/FeatureServer/6"
    });

    var searchWidget = new Search({
      view: view,
      allPlaceholder: "Search location or project (ex. Red-Blue Connector)",
      locationEnabled: false,
      popupEnabled: true,
      container: "searchPlace",
      includeDefaultSources: false,
      sources: [{
        locator: new Locator({
          url: "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer"
        }),
        singleLineFieldName: "SingleLine",
        outFields: ["Addr_type"],
        name: "Address Search"
      }]
    });

    view.ui.add(searchWidget, {
      position: "top-left",
      index: 0
    });

    view.on('click', function (event) {
      $('#helpContents').hide();
      $('#commentForm').hide()
      $('#projectList').hide();
      console.log(event)
    })

    watchUtils.watch(view.popup, "visible", function () {
      $(".esri-popup__navigation").on("click", function (e) {
        projId = false;
        showComments(projId);
      });
    });

    watchUtils.watch(view.popup, "selectedFeature", function (feature) {
      projId = false;
      if (MBTALine == true) {
        showComments(feature.attributes.ProjectID);
      }
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
      filterMBTA = false;
      var sql = "1=1"
      divisionsSQL = "(1=1)";
      programsSQL = "(1=1)";
      if ($("#division").val() !== "All") {
        divisionsSQL = "Division = '" + $("#division").val() + "'";
      }
      if ($("#division").val() == "All" || $("#division").val() == "MBTA") {
        filterMBTA = true;
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
      projectLocations.definitionExpression = sql;
      projectLocationsPoints.definitionExpression = sql;
      queryFeatureLayerView(sql)
    }


    function queryFeatureLayerView(sqlExpression) {
      if (extentForRegionOfInterest != false) {
        var query = {
          geometry: extentForRegionOfInterest,
          spatialRelationship: "intersects",
          outFields: ["*"],
          returnGeometry: true,
          //where: sqlExpression
        };

        view.whenLayerView(projectLocations).then(function (featureLayerView) {
          if (featureLayerView.updating) {
            var handle = featureLayerView.watch("updating", function (isUpdating) {
              if (!isUpdating) {
                featureLayerView.queryObjectIds(query).then(function (result) {
                  theOids = "OBJECTID in (" + result + ")";
                  if (result.length > 0) {
                    projectLocations.definitionExpression = theOids;
                  }
                });
                handle.remove();
              }
            });
          } else {
            featureLayerView.queryObjectIds(query).then(function (result) {
              theOids = "OBJECTID in (" + result + ")";
              if (result.length > 0) {
                projectLocations.definitionExpression = theOids;
              }
            });
          }
        });

        view.whenLayerView(projectLocationsPoints).then(function (featureLayerView) {
          if (featureLayerView.updating) {
            var handle = featureLayerView.watch("updating", function (isUpdating) {
              if (!isUpdating) {
                featureLayerView.queryObjectIds(query).then(function (result) {
                  theOids = "OBJECTID in (" + result + ")";
                  if (result.length > 0) {
                    projectLocationsPoints.definitionExpression = theOids;
                  } else {
                    projectLocationsPoints.definitionExpression = "1=2";
                  }
                });
                handle.remove();
              }
            });
          } else {
            featureLayerView.queryObjectIds(query).then(function (result) {
              theOids = "OBJECTID in (" + result + ")";
              if (result.length > 0) {
                projectLocationsPoints.definitionExpression = theOids;
              } else {
                projectLocationsPoints.definitionExpression = "1=2";
              }
            });
          }
        });

      } else {

      }
      if (filterMBTA == true) {
        getMBTA(sqlExpression)
      } else {
        projectLocationsMBTA.definitionExpression = '1=2';
      }
    }


    function getMBTA(sql) {
      var newSql = sql.replace("TotalCost", "Total");
      var newNewSql = newSql.replace("TotalCost", "Total");
      $.post("https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/FeatureServer/6/query", {
          where: newNewSql,
          outFields: "MBTA_Location",
          returnGeometry: false,
          orderByFields: 'MBTA_Location',
          returnDistinctValues: true,
          f: 'pjson'
        })
        .done(function (data) {
          var projLocations = $.parseJSON(data);
          locationList = [];
          $(projLocations.features).each(function () {
            if (this.attributes.MBTA_Location != null) {
              locationList.push("'" + this.attributes.MBTA_Location + "'");
            }
          });
          if (projLocations.features.length > 0) {
            if (locationList.join().indexOf("System") >= 0) {
              theLocations = "MBTA_Location in (" + locationList.join() + ") or route_desc in (" + locationList.join() + ") or 1=1";
            } else {
              theLocations = "MBTA_Location in (" + locationList.join() + ") or route_desc in (" + locationList.join() + ")";
            }
            projectLocationsMBTA.definitionExpression = theLocations;
          } else {
            projectLocationsMBTA.definitionExpression = '1=2';
          }
        });
    }

    $("#cost-range").slider({
      range: true,
      min: 0,
      max: 5000000000,
      values: [0, 5000000000],
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
      $.post("https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/MapServer/2/query", {
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
