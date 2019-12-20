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
    var spatialFilter = false;
    var sql = "1=1"
    var extentForRegionOfInterest = false;
    var mbtaSql = '1=1'
    var map = new Map({
      basemap: "dark-gray",
    });

    //The following feature layers represent the projects and their locations  
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

    projectLocations = new FeatureLayer({
      url: "https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/MapServer/1",
      outFields: ["Project_Description", "ProjectID", "OBJECTID"],
      visible: true,
      popupEnabled: true,
      popupTemplate: {
        title: "{Project_Description} - ({ProjectID})",
        content: popupFunction
      }
    });

    projectLocationsPoints = new FeatureLayer({
      url: "https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/MapServer/3",
      outFields: ["*"],
      visible: true,
      popupEnabled: true,
      popupTemplate: {
        title: "{Project_Description} - ({ProjectID})",
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

    projectLocationsMBTA = new FeatureLayer({
      url: "https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/MapServer/7",
      outFields: ["MBTA_Location", "route_desc", "route_long_name"],
      popupTemplate: {
        title: "MBTA Projects: {MBTA_Location}",
        content: popupFunctionMbtaAsset
      }
    });

    //This function creates the content for the popups for the project location layers
    function popupFunction(feature) {
      var query = new Query({
        outFields: ["*"],
        where: "ProjectID = '" + feature.graphic.attributes.ProjectID + "'"
      });
      return queryProjectTask.execute(query).then(function (result) {
        var attributes = result.features[0].attributes;
        return "<p id='popupFeatureSelected' val='" + attributes.ProjectID + "'><a href='https://hwy.massdot.state.ma.us/projectinfo/projectinfo.asp?num=" + attributes.ProjectID + "' target=blank id='pinfoLink'>Project Info Link</a></br>MassDOT Division: " + attributes.Division + "</br> Location: " + attributes.Location + "</br> Program: " + attributes.Program + "</br> Total Cost: " + numeral(attributes.Total).format('$0,0[.]00') + "</p> This is a <b>" + attributes.Division + "</b> project programmed as <b>" + attributes.Program + "</b>. It is located in <b>" + attributes.Location + "</b> and has a total cost of <b>" + numeral(attributes.Total).format('$0,0[.]00') + "</b>."
      });
    }

    //This function creates the content for the popups for the MBTA lines 
    function popupFunctionMbtaAsset(target) {
      thisFeatureTarget = target;
      lineProjects = [];
      modeProjects = [];
      systemProjects = [];
      var query = new Query({
        outFields: ["*"],
        where: "(MBTA_Location = '" + target.graphic.attributes.MBTA_Location + "' or MBTA_Location = '" + target.graphic.attributes.route_desc + "' or MBTA_Location = 'System') AND " + mbtaSql
      });
      return queryProjectTask.execute(query).then(function (result) {
        if (result.features.length > 0) {
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
                content: popupFunctionMbtaProject,
                actions: [{
                  id: "back",
                  title: "Go back"
                }]
              }
            });
            switch (this.attributes.MBTA_Location) {
              case target.graphic.attributes.MBTA_Location:
                lineProjects.push(thisProject);
                break;
              case target.graphic.attributes.route_desc:
                modeProjects.push(thisProject);
                break;
              default:
                systemProjects.push(thisProject);
            }
          });
          if (lineProjects.length > 0) {
            line = "<button class='btn btn-info'>View " + target.graphic.attributes.MBTA_Location + " projects</button>";
          } else {
            line = "No " + target.graphic.attributes.MBTA_Location + " projects meet your search criteria";
          }
          if (modeProjects.length > 0) {
            mode = "<button class='btn btn-info'>View  " + target.graphic.attributes.route_desc + " projects</button>";
          } else {
            mode = "No " + target.graphic.attributes.route_desc + " projects meet your search criteria";
          }
          if (systemProjects.length > 0) {
            mbta = "<button class='btn btn-info'>View MBTA Systemwide projects</button>";
          } else {
            mbta = "No MBTA Systemwide projects meet your search criteria"
          }

          return "<p id='popupFeatureSelected' class='projList line' modeType='line' val='" + target.graphic.attributes.MBTA_Location + "'>" + line
            + "<p id='popupFeatureSelected' class='projList mode' modeType='mode' val='System'>" + mode
            + "<p id='popupFeatureSelected' class='projList system' modeType='system' val='System'>" + mbta;
        } else {
          return "<p id='popupFeatureSelected' class='projList' val=''>No projects on this line";
        }

      });
    }

    //This function creates the content for the popups for the project location layers
    function popupFunctionMbtaProject(feature) {
      var query = new Query({
        outFields: ["*"],
        where: "ProjectID = '" + feature.graphic.attributes.ProjectID + "'"
      });
      return queryProjectTask.execute(query).then(function (result) {
        var attributes = result.features[0].attributes;
        return "<p id='popupFeatureSelected' val='" + attributes.ProjectID + "'><a href='https://hwy.massdot.state.ma.us/projectinfo/projectinfo.asp?num=" + attributes.ProjectID + "' target=blank id='pinfoLink'>Project Info Link</a></br>MassDOT Division: " + attributes.Division + "</br> Location: " + attributes.Location + "</br> Program: " + attributes.Program + "</br> Total Cost: " + numeral(attributes.Total).format('$0,0[.]00') + "</p> This is a <b>" + attributes.Division + "</b> project programmed as <b>" + attributes.Program + "</b>. It is located in <b>" + attributes.Location + "</b> and has a total cost of <b>" + numeral(attributes.Total).format('$0,0[.]00') + "</b>."
      });
    }


    map.addMany([projectLocations, projectLocationsPoints, projectLocationsMBTA]);

    //These are periphery layers used for added functionality, including spatial querying and commenting
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


    $(document).on("click", ".projList", function (e) {
      switch ($(this).attr('modeType')) {
        case 'line':
          popupFeatures = lineProjects;
          break;
        case 'mode':
          popupFeatures = modeProjects;
          break;
        default:
          popupFeatures = systemProjects;
      }
      view.popup.open({
        features: popupFeatures, // array of graphics
        featureMenuOpen: true,
        highlightEnabled: true // selected features initially display in a list
      });
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

    watchUtils.watch(view.popup, "selectedFeature", function (feature) {
      $('#helpContents').show();
      $('#commentForm').hide();
      $('#projectList').hide();
      if (feature) {
        //        if (feature.attributes.ProjectID) {
        //          projId = feature.attributes.ProjectID;
        //          showComments(projId);
        //        }
      }
    });


    view.popup.on("trigger-action", function (event) {
      if (event.action.id === "back") {
        var thisLine = new Graphic({
          geometry: view.popup.selectedFeature.geometry,
          attributes: thisFeatureTarget.graphic.attributes,
          symbol: {
            type: "simple-line", // autocasts as SimpleLineSymbol()
            color: [226, 119, 40],
            width: 10
          },
          popupTemplate: {
            title: "MBTA Projects: {MBTA_Location}",
            content: popupFunctionMbtaAsset,
          }
        });
        view.popup.open({
          features: [thisLine],
        });
      }
    });


    //The following event handlers listen for changes in the filter form inputs
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
            spatialFilter = true;
            extentForRegionOfInterest = response.features[0].geometry
            view.goTo({
              target: response.features[0].geometry,
            });
            applyFeatureViewFilters();
          });
      } else {
        view.goTo({
          zoom: 9, // Sets zoom level based on level of detail (LOD)
          center: [-71.8, 42]
        });
        spatialFilter = false;
        applyFeatureViewFilters();
      }
    });

    $("#mpoSelect").change(function () {
      $("#townSelect").val("");
      var selectedMPO = $(this).children("option:selected").val();
      var query = mpoLayer.createQuery();
      if (selectedMPO != "All") {
        query.where = "MPO like '%" + selectedMPO + "%'";
        query.returnGeometry = true;
        query.outFields = ["MPO"];
        query.outSpatialReference = view.spatialReference;
        query.returnExtentOnly = true;
        mpoLayer.queryFeatures(query)
          .then(function (response) {
            spatialFilter = true;
            extentForRegionOfInterest = response.features[0].geometry
            view.goTo({
              target: response.features[0].geometry,
            });
            applyFeatureViewFilters();
          });
      } else {
        view.goTo({
          zoom: 9, // Sets zoom level based on level of detail (LOD)
          center: [-71.8, 42]
        });
        spatialFilter = false;
        applyFeatureViewFilters();
      }
    });

    $("#cost-range").slider({
      range: true,
      min: 0,
      max: 5000000000,
      values: [0, 5000000000],
      slide: function (event, ui) {
        $("#minCost").val(numeral(ui.values[0]).format('0,0[.]00'));
        $("#maxCost").val(numeral(ui.values[1]).format('0,0[.]00'));
        applyAttributeFilter();
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
      applyAttributeFilter();
    });

    $(".filter").change(function () {
      applyFeatureViewFilters();
    });

    //These are the feature layer views of the project locations
    view.whenLayerView(projectLocations)
      .then(function (layerView) {
        prjLocationLines = layerView
      })
      .catch(function (error) {});

    view.whenLayerView(projectLocationsPoints)
      .then(function (layerView) {
        prjLocationPoints = layerView
      })
      .catch(function (error) {});

    view.whenLayerView(projectLocationsMBTA)
      .then(function (layerView) {
        mbtaLines = layerView
      })
      .catch(function (error) {});


    //This function applies FeatureFilters to the layers in the map
    function applyFeatureViewFilters() {
      view.popup.close();
      sql = "1=1"
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
      sql = sql + " AND (" + divisionsSQL + ") AND (" + programsSQL + ") AND ( TotalCost  >= " + parseFloat($("#minCost").val().replace(/,/g, '')) + " AND TotalCost  <= " + parseFloat($("#maxCost").val().replace(/,/g, '')) + ")"

      if ($("#division").val() == "All" || $("#division").val() == "MBTA") {
        mbtaLines.visible = true;
        mbtaSql = sql.replace("TotalCost", "Total").replace("TotalCost", "Total")
      } else {
        mbtaLines.visible = false;
      }

      if (spatialFilter === true) {
        queryFilter = new FeatureFilter({
          where: sql,
          geometry: extentForRegionOfInterest,
          spatialRelationship: "intersects"
        });
      } else {
        queryFilter = new FeatureFilter({
          where: sql,
        });
      }

      prjLocationLines.filter = queryFilter
      prjLocationPoints.filter = queryFilter
      checkLayersUpdated()
    }

    function checkLayersUpdated() {
      prjLocationLines.visible = true;
      prjLocationPoints.visible = true;
    }


    //These functions are used to filter features on the map. The first filters features by attributes alone. applySpatialFilter() applies a spatial filter. applyMBTAAttributeFilter() and applyMBTASpatialFilter() filters MBTA lines  
    //    function applyAttributeFilter() {
    //      sql = "1=1"
    //      divisionsSQL = "(1=1)";
    //      programsSQL = "(1=1)";
    //      if ($("#division").val() !== "All") {
    //        divisionsSQL = "Division = '" + $("#division").val() + "'";
    //      }
    //      if ($("#programs").val()[0] !== 'All') {
    //        $($("#programs").val()).each(function () {
    //          if (this == $("#programs").val()[0]) {
    //            programsSQL = "Program = '" + this + "'"
    //          } else {
    //            programsSQL = programsSQL + " OR Program = '" + this + "'"
    //          }
    //        });
    //      }
    //      sql = sql + " AND (" + divisionsSQL + ") AND (" + programsSQL + ") AND ( TotalCost  >= " + parseFloat($("#minCost").val().replace(/,/g, '')) + " AND TotalCost  <= " + parseFloat($("#maxCost").val().replace(/,/g, '')) + ")"
    //      projectLocations.definitionExpression = sql;
    //      projectLocationsPoints.definitionExpression = sql;
    //
    //      if (spatialFilter === true) {
    //        applySpatialFilter(spatialFilterGeom)
    //      } else {
    //        projectLocations.visible = true;
    //        projectLocationsPoints.visible = true;
    //      }
    //      if ($("#division").val() == "All" || $("#division").val() == "MBTA") {
    //        projectLocationsMBTA.visible = true;
    //        mbtaSql = sql.replace("TotalCost", "Total").replace("TotalCost", "Total")
    //      } else {
    //        projectLocationsMBTA.visible = false;
    //      }
    //    }
    //
    //    function applySpatialFilter(spatialFilterGeom) {
    //      var intersectGeom = JSON.stringify(extentForRegionOfInterest);
    //      $.post("https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/FeatureServer/1/query", {
    //          where: sql,
    //          geometry: spatialFilterGeom,
    //          geometryType: "esriGeometryPolygon",
    //          spatialRelationship: "esriSpatialRelIntersects",
    //          outFields: "OBJECTID",
    //          returnGeometry: false,
    //          featureEncoding: "esriDefault",
    //          f: 'pjson'
    //        })
    //        .done(function (data) {
    //          var projLocations = $.parseJSON(data);
    //          lineOids = [];
    //          $(projLocations.features).each(function () {
    //            if (this.attributes.OBJECTID != null) {
    //              lineOids.push("'" + this.attributes.OBJECTID + "'");
    //            }
    //          });
    //          if (projLocations.features.length > 0) {
    //            lineSpatialDefinition = "OBJECTID in (" + lineOids.join() + ")";
    //            projectLocations.definitionExpression = lineSpatialDefinition;
    //            projectLocations.visible = true;
    //          } else {
    //            projectLocations.definitionExpression = '1=2';
    //          }
    //        });
    //
    //      $.post("https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/FeatureServer/3/query", {
    //          where: sql,
    //          geometry: intersectGeom,
    //          geometryType: "esriGeometryPolygon",
    //          spatialRelationship: "esriSpatialRelIntersects",
    //          outFields: "OBJECTID",
    //          returnGeometry: false,
    //          featureEncoding: "esriDefault",
    //          f: 'pjson'
    //        })
    //        .done(function (data) {
    //          var projLocations = $.parseJSON(data);
    //          pointOids = [];
    //          $(projLocations.features).each(function () {
    //            if (this.attributes.OBJECTID != null) {
    //              pointOids.push("'" + this.attributes.OBJECTID + "'");
    //            }
    //          });
    //          if (projLocations.features.length > 0) {
    //            pointSpatialDefinition = "OBJECTID in (" + pointOids.join() + ")";
    //            projectLocationsPoints.definitionExpression = pointSpatialDefinition;
    //            projectLocationsPoints.visible = true;
    //          } else {
    //            projectLocationsPoints.definitionExpression = '1=2';
    //          }
    //        });
    //    }
    //
    //    function applyMBTAAttributeFilter(sql) {
    //      mbtaSql = sql.replace("TotalCost", "Total").replace("TotalCost", "Total")
    //      $.post("https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/FeatureServer/6/query", {
    //          where: mbtaSql + " AND MBTA_Location is not null",
    //          outFields: "MBTA_Location",
    //          returnGeometry: false,
    //          orderByFields: 'MBTA_Location',
    //          returnDistinctValues: true,
    //          f: 'pjson'
    //        })
    //        .done(function (data) {
    //          var projLocations = $.parseJSON(data);
    //          mbtaLocationList = [];
    //          $(projLocations.features).each(function () {
    //            if (this.attributes.MBTA_Location != null) {
    //              mbtaLocationList.push("'" + this.attributes.MBTA_Location + "'");
    //            }
    //          });
    //          if (projLocations.features.length > 0) {
    //            mbtaLocationList = "MBTA_Location in (" + mbtaLocationList.join() + ")";
    //            projectLocationsMBTA.definitionExpression = mbtaLocationList;
    //            if (spatialFilter === true) {
    //              applyMBTASpatialFilter(mbtaLocationList)
    //            } else {
    //              projectLocationsMBTA.visible = true;
    //            }
    //          } else {
    //            projectLocationsMBTA.definitionExpression = '1=2';
    //          }
    //        });
    //    }
    //
    //    function applyMBTASpatialFilter(mbtaLocationList) {
    //      var intersectGeom = JSON.stringify(extentForRegionOfInterest);
    //      $.post("https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/FeatureServer/7/query", {
    //          where: mbtaLocationList,
    //          geometry: intersectGeom,
    //          geometryType: "esriGeometryPolygon",
    //          spatialRelationship: "esriSpatialRelIntersects",
    //          outFields: "OBJECTID, MBTA_Location",
    //          returnGeometry: false,
    //          featureEncoding: "esriDefault",
    //          f: 'pjson'
    //        })
    //        .done(function (data) {
    //          var projLocations = $.parseJSON(data);
    //          mbtaLocationList = [];
    //          $(projLocations.features).each(function () {
    //            if (this.attributes.MBTA_Location != null) {
    //              mbtaLocationList.push("'" + this.attributes.MBTA_Location + "'");
    //            }
    //          });
    //
    //          if (projLocations.features.length > 0) {
    //            mbtaLocationListSpatial = "MBTA_Location in (" + mbtaLocationList.join() + ")";
    //            projectLocationsMBTA.definitionExpression = mbtaLocationListSpatial;
    //            projectLocationsMBTA.visible = true;
    //          } else {
    //            projectLocationsMBTA.definitionExpression = '1=2';
    //          }
    //        });
    //    }

    $("#projectSearch").autocomplete("option", "select", function (event, ui) {
      showComments(ui.item.id);
    });

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
