$(document).ready(function () {
  require(["esri/views/MapView", "esri/Map", "esri/WebMap", "esri/layers/MapImageLayer", "esri/tasks/QueryTask", "esri/tasks/support/Query", "esri/core/watchUtils",
    "esri/layers/FeatureLayer",
    "esri/layers/GraphicsLayer",
    "esri/geometry/Extent",
    "esri/geometry/Polygon",
    "esri/tasks/Locator",
    "esri/widgets/Search",
    "esri/widgets/Popup",
    "esri/widgets/Home",
    "esri/widgets/Legend",
    "esri/views/layers/support/FeatureFilter",
    "esri/Graphic"
  ], function (MapView, Map, WebMap, MapImageLayer, QueryTask, Query, watchUtils, FeatureLayer, GraphicsLayer, Extent, Polygon, Locator, Search, Popup, Home, Legend, FeatureFilter, Graphic, comments) {

    /*
    These are global variables used throughout the rest of this page.
    Their values change depending on user actions and some of them are
    then used to validate certain functions/steps within the workflow.
    */
    searchedProject = false;
    liked = false;
    townsSql = "Town";
    rtaSql = "RTA";
    distSql = "Highway District";
    polySql = "1=1";
    spatialFilter = false;
    sql = "1=1"
    projectSearchID = false;
    extentForRegionOfInterest = false;
    var highlight;
    var selectedHighlight;
    var showPolyGraphic;
    hideLoad = false;
    polySymbol = {
      type: "simple-fill",
      style: "none",
      outline: {
        color: [255, 255, 0, 1],
        width: "2.5px"
      }
    }


    /*
    These are some ArcGIS JS objects useful for doing things within the map
    */
    popupSelected = new Graphic({
      symbol: polySymbol
    });

    statewideSelected = new Graphic({
      symbol: polySymbol,
    });

    stateExtent = new Polygon({
      rings: [
        [
          [-73.7, 40.8],
          [-73.7, 43],
          [-69.8, 43],
          [-69.8, 40.8]
        ]
      ],
      spatialReference: {
        wkid: 4326
      }
    });


    /*
    The following are feature layers and one map image layer
    that are used in the web map and view. They represent the
    the projects and their locations 
    */
    projectList = new FeatureLayer({
      url: "https://gis.massdot.state.ma.us/rh/rest/services/Projects/CIPCommentTool/FeatureServer/6",
      outFields: ["*"],
      visible: true,
      popupEnabled: true,
      popupTemplate: {
        title: "{Project_Description}",
        content: popupFunction
      }
    });

    projectLocations = new FeatureLayer({
      url: "https://gis.massdot.state.ma.us/rh/rest/services/Projects/CIPCommentTool/MapServer/1",
      outFields: ["Project_Description", "ProjectID", "OBJECTID"],
      visible: true,
      title: "Linear Projects",
      popupEnabled: true,
      popupTemplate: {
        title: "{Project_Description} - ({ProjectID})",
        content: popupFunction
      }
    });

    projectLocationsPoints = new FeatureLayer({
      url: "https://gis.massdot.state.ma.us/rh/rest/services/Projects/CIPCommentTool/MapServer/3",
      outFields: ["*"],
      visible: true,
      title: "Point Projects",
      popupEnabled: true,
      popupTemplate: {
        title: "{Project_Description} - ({ProjectID})",
        content: popupFunction
      }
    });

    projectLocationsPolygonsMapImageLayer = new MapImageLayer({
      url: "https://gis.massdot.state.ma.us/rh/rest/services/Projects/CIPCommentTool/MapServer",
      sublayers: [{
        id: 4,
        opacity: 0.3,
        popupEnabled: true,
        definitionExpression: "Location_Type <> 'MPO'",
        popupTemplate: {
          title: "{Location_Type} - {Location}",
          content: "<p id='popupFeatureSelected' class='polyList' modeType='{Location}' val='{Location}'><button class='btn btn-info'>View projects in this {Location_Type}</button><br>"
            + "<p id='popupFeatureSelectedStatewide' class='polyList' modeType='Statewide' val='{Location}'><button class='btn btn-info'>View statewide projects</button>"
        }
      }]
    });

    projectLocationsPolygons = new FeatureLayer({
      url: "https://gis.massdot.state.ma.us/rh/rest/services/Projects/CIPCommentTool/MapServer/4",
    });

    projectLocationsMBTA = new FeatureLayer({
      url: "https://gis.massdot.state.ma.us/rh/rest/services/Projects/CIPCommentTool/MapServer/7",
      outFields: ["MBTA_Location", "route_desc", "route_long_name", "Location_Filter"],
      popupTemplate: {
        title: "MBTA Route: {MBTA_Location}",
        content: popupFunctionMbtaAsset
      }
    });

    queryProjectTask = new QueryTask({
      url: "https://gis.massdot.state.ma.us/rh/rest/services/Projects/CIPCommentTool/FeatureServer/6"
    });

    /*
    The following functions and listners are related to popups and
    buttons clicked from within popups
    */
    //This function creates the content for the popups for the projects
    function popupFunction(feature) {
      var query = new Query({
        outFields: ["*"],
        where: "ProjectID = '" + feature.graphic.attributes.ProjectID + "'"
      });
      return queryProjectTask.execute(query).then(function (result) {
        var attributes = result.features[0].attributes;
        if (attributes.Division == "Highway") {
          link = "<a href='https://hwy.massdot.state.ma.us/projectinfo/projectinfo.asp?num=" + attributes.ProjectID + "' target=blank id='pinfoLink' class='popup-link' style='color: blue'>Additional Project Information.</a>"
        } else if (attributes.Division == "MBTA") {
          link = "<a href='https://www.mbta.com/projects' target=blank id='pinfoLink' class='popup-link'>Learn more about MBTA capital projects and programs.</a>"
        } else {
          link = ""
        }
        return "<p id='popupFeatureSelected' val='" + attributes.ProjectID + "' votes='" + attributes.Votes + "'>" + link + "</br>MassDOT Division: " + attributes.Division + "</br> Location: " + attributes.Location + "</br> Program: " + attributes.Program + "</br> Total Cost: " + numeral(attributes.Total).format('$0,0[.]00') + "</p> This project was programmed by the <b>" + attributes.Division + "</b> within the <b>" + attributes.Program + "</b> CIP Program. It is located in <b>" + attributes.Location + "</b> and has a total cost of <b>" + numeral(attributes.Total).format('$0,0[.]00') + "</b>."
      });
    }

    //This listens for the user to click a button from a polygon feature with the .polyList class. It will then display all projects associated with that polygon 
    $(document).on("click", ".polyList", function (e) {
      existingFeatures = view.popup.features;
      selectedIndex = view.popup.selectedFeatureIndex;
      displayPolygonProjects($(this).attr('modeType'), $(this));
    });

    //This function displays projects which are associated with a polygon. It gets called when user clicks the .polyList button
    function displayPolygonProjects(value, id) {
      polyProjects = [];
      var query = new Query({
        outFields: ["*"],
        where: "(Location_Source = '" + value + "') AND " + sql
      });
      view.graphics.removeAll();
      queryProjectTask.execute(query).then(function (result) {
        if (result.features.length > 0) {
          var table = ""
          $(result.features).each(function () {
            thisProject = "<p> <button class='btn info tProjList' id=" + this.attributes.ProjectID + ">" + this.attributes.Project_Description + " (" + this.attributes.ProjectID + ")</button></p>";
            table = table.concat(thisProject);
            var thisProject = new Graphic({
              geometry: view.popup.selectedFeature.geometry,
              attributes: this.attributes,
              symbol: polySymbol,
              popupTemplate: {
                title: "{Project_Description}",
                content: popupFunction,
                actions: [{
                  id: "back",
                  title: "Go back",
                  className: "esri-icon-undo"
                }]
              }
            });
            polyProjects.push(thisProject);
          });
          showPolyGraphic = polyProjects[0]
          view.graphics.add(showPolyGraphic);
          view.popup.open({
            features: polyProjects, // array of graphics
            featureMenuOpen: true,
            highlightEnabled: true // selected features initially display in a list
          });
        } else {
          $(id).html("No " + value + " projects currently match your search criteria.");
        }
      });

    }

    //This function creates the content for the popups for MBTA lines 
    function popupFunctionMbtaAsset(target) {
      thisFeatureTarget = target;
      lineProjects = [];
      modeProjects = [];
      systemProjects = [];
      var query = new Query({
        outFields: ["*"],
        where: "(MBTA_Location like '%" + target.graphic.attributes.MBTA_Location + "%' or MBTA_Location = '" + target.graphic.attributes.route_desc + "' or MBTA_Location = 'System') AND " + sql
      });
      return queryProjectTask.execute(query).then(function (result) {
        if (result.features.length > 0) {
          var table = ""
          $(result.features).each(function () {
            thisProject = "<p> <button class='btn info tProjList' id=" + this.attributes.ProjectID + ">" + this.attributes.Project_Description + " (" + this.attributes.ProjectID + ")</button></p>";
            table = table.concat(thisProject);
            var thisProject = new Graphic({
              geometry: view.popup.selectedFeature.geometry,
              attributes: this.attributes,
              symbol: {
                type: "simple-line",
                color: [255, 255, 0, 1],
                width: 4
              },
              popupTemplate: {
                title: "{Project_Description}",
                content: popupFunction,
                actions: [{
                  id: "back",
                  title: "Go back",
                  className: "esri-icon-undo"
                }]
              }
            });
            if (this.attributes.MBTA_Location.includes(target.graphic.attributes.MBTA_Location)) {
              lineProjects.push(thisProject);
            } else if (this.attributes.MBTA_Location === target.graphic.attributes.route_desc) {
              modeProjects.push(thisProject);
            } else {
              systemProjects.push(thisProject);
            }
          });
          if (lineProjects.length > 0) {
            line = "<button class='btn btn-info'>View " + target.graphic.attributes.MBTA_Location + " projects</button>";
          } else {
            line = "No " + target.graphic.attributes.MBTA_Location + " projects currently match your search criteria";
          }
          if (modeProjects.length > 0) {
            mode = "<button class='btn btn-info'>View  " + target.graphic.attributes.route_desc + " projects</button>";
          } else {
            mode = "No " + target.graphic.attributes.route_desc + " projects currently match your search criteria";
          }
          if (systemProjects.length > 0) {
            mbta = "<button class='btn btn-info'>View MBTA Systemwide projects</button>";
          } else {
            mbta = "No MBTA Systemwide projects currently match your search criteria"
          }
          return "<p id='popupFeatureSelected' class='tProjList line' modeType='line' val='" + target.graphic.attributes.MBTA_Location + "'>" + line
            + "<p id='popupFeatureSelected' class='tProjList mode' modeType='mode' val='System'>" + mode
            + "<p id='popupFeatureSelected' class='tProjList system' modeType='system' val='System'>" + mbta;
        } else {
          return "<p id='popupFeatureSelected' class='tProjList' val=''>No projects currently match your search criteria";
        }

      });
    }

    //This listens for the user to click a button from an MBTA system feature with the .tProjList class. It will then display all projects associated with that MBTA asset 
    $(document).on("click", ".tProjList", function (e) {
      existingFeatures = view.popup.features;
      selectedIndex = view.popup.selectedFeatureIndex;
      switch ($(this).attr('modeType')) {
        case 'line':
          popupFeatures = lineProjects;
          break;
        case 'mode':
          popupFeatures = modeProjects;
          break;
        case 'system':
          popupFeatures = systemProjects;
      }
	  showPolyGraphic = popupFeatures[0]
      view.graphics.add(showPolyGraphic);
      view.popup.open({
        features: popupFeatures,
        featureMenuOpen: true,
        highlightEnabled: true
      });
    });


    /*
    The following are map and view related. it creates the map
	adds the layers, and defines the layerviews. The layerviews
	are used subsequently in the code for filtering. It also adds
	the out of the box widgets to the map.
    */
    map = new Map({
      basemap: "gray-vector",
    });

    map.addMany([projectLocationsPolygonsMapImageLayer, projectLocations, projectLocationsPoints, projectLocationsMBTA]);
    view = new MapView({
      map: map,
      scale: 1155581.108577,
      container: "viewDiv",
      spatialReference: {
        wkid: 3857
      },
      highlightOptions: {
        color: [255, 255, 0, 1],
        haloOpacity: 0.9,
        fillOpacity: 0.2
      }
    });

    view.goTo(stateExtent);
    view.watch("updating", function (event) {
      if (event == true) {} else if (event == false) {
        $('#loading').modal('hide') //Hide the loading wheel once all layers have finished updating
      }
    });

    $('#loading').on('shown.bs.modal', function (e) {
      if (hideLoad == true) {
        $('#loading').modal('hide')
      }
    })

    view.whenLayerView(projectLocations)
      .then(function (layerView) {
        prjLocationLines = layerView
        prjLocationLines.watch("updating", function (val) {
          if (val == false) {
            hideLoad = true;
            $('#loading').modal('hide')
			console.log("Project lines updating: ", val)
			prjLocationLines.queryFeatureCount().then(function(count){
				console.log(count);
			})
			  			prjLocationLines.queryFeatures().then(function(results){
				console.log(results);
			})
          }
        });
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

    projectLocationsPolygonsMapImageLayer.when(function () {
      prjLocationPolygons = projectLocationsPolygonsMapImageLayer.findSublayerById(4);
    })

    searchWidget = new Search({
      view: view
    });

    homeBtn = new Home({
      view: view
    });

    legend = new Legend({
      view: view,
      layerInfos: [{
        layer: projectLocations,
        title: "Linear Projects"
      }, {
        layer: projectLocationsPoints,
        title: "Point Projects"
      }]
    });

    view.ui.add([{
      component: homeBtn,
      position: "top-left",
      index: 1
    }, {
      component: searchWidget,
      position: "top-left",
      index: 0
    }, {
      component: legend,
      position: "bottom-left",
      index: 1
    }]);

    view.popup.on("trigger-action", function (event) {
      if (event.action.id === "back") {
        view.popup.open({
          features: existingFeatures,
        });
        view.popup.selectedFeatureIndex = selectedIndex;
      }
    });

    //This function displays comments for the selected project. CAN BE IGNORED FOR PROJECT VIEWER
    function showComments(projId) {
      $('#helpContents').hide();
      $('#prjLikes').hide();
      $('#prjLikes').empty();
      if (projId == false) {
        html = $.parseHTML(view.popup.content.viewModel.content)
        projId = $(html).attr('val');
      }
      $.post("https://gis.massdot.state.ma.us/rh/rest/services/Projects/CIPCommentTool/MapServer/2/query", {
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
          $('#interactive').show();
        });

    }

    /*
    The following controls are used to filter projects within the map, based
	on the user actions in the left hand side of the webpage. 
    */
    townQuery = projectLocationsPolygons.createQuery();
    mpoQuery = projectLocationsPolygons.createQuery();

    //The following event handlers listen for changes to the town input
    $("#townSelect").change(function () {
      $("#mpoSelect").val("");
      if ($("#townSelect").val() > 0) {
        $('#loading').modal('show')
        hideLoad = false;
        townQuery.where = "Location = '" + $("#townSelect").children("option:selected").html() + "' and Location_Type = 'Town'";
        townQuery.returnGeometry = true;
        townQuery.outFields = ["*"];
        townQuery.outSpatialReference = view.spatialReference;
        projectLocationsPolygons.geometryPrecision = 0;
        projectLocationsPolygons.queryFeatures(townQuery)
          .then(function (response) {
            spatialFilter = true;
            extentForRegionOfInterest = response.features[0].geometry
            queryFilter = new FeatureFilter({
              where: sql,
              geometry: extentForRegionOfInterest,
              spatialRelationship: "intersects"
            });
            prjLocationLines.filter = queryFilter
            prjLocationPoints.filter = queryFilter
            view.goTo(extentForRegionOfInterest);
          });
      } else {
        spatialFilter = false;
        applyFeatureViewFilters();
        view.goTo(stateExtent);
      }
    });

    //The following event handlers listen for changes to the MPO input
    $("#mpoSelect").change(function () {
      $("#townSelect").val("");
      var selectedMPO = $(this).children("option:selected").val();
      if (selectedMPO != "All") {
        $('#loading').modal('show')
        hideLoad = false;
        mpoQuery.where = "Location like '%" + selectedMPO + "%' and Location_Type = 'MPO'";
        mpoQuery.returnGeometry = true;
        mpoQuery.outFields = ["Location"];
        mpoQuery.outSpatialReference = view.spatialReference;
        mpoQuery.returnExtentOnly = true;
        mpoQuery.geometryPrecision = 0;
        projectLocationsPolygons.queryFeatures(mpoQuery)
          .then(function (response) {
            spatialFilter = true;
            extentForRegionOfInterest = response.features[0].geometry
            queryFilter = new FeatureFilter({
              where: sql,
              geometry: extentForRegionOfInterest,
              spatialRelationship: "intersects"
            });
            prjLocationLines.filter = queryFilter
            prjLocationPoints.filter = queryFilter
            view.goTo(extentForRegionOfInterest);
          });
      } else {
        spatialFilter = false;
        applyFeatureViewFilters();
        view.goTo(stateExtent);
      }
    });

    //The following is the cost slider. It is used to configure the input and do something when the value is changed
    $("#cost-range").slider({
      range: true,
      min: 0,
      max: 5000000000,
      values: [0, 5000000000],
      slide: function (event, ui) {
        $("#minCost").val(numeral(ui.values[0]).format('0,0[.]00'));
        $("#maxCost").val(numeral(ui.values[1]).format('0,0[.]00'));
        applyFeatureViewFilters();
      }
    });

    //The following is the cost inputs. It is used to do something when the value is changed
    $(".costInput").change(function () {
      minValue = numeral($("#minCost").val()).value();
      maxValue = numeral($("#maxCost").val()).value();
      if (minValue > maxValue) {
        maxValue = minValue
      };
      $("#minCost").val(numeral(minValue).format('0,0[.]00'));
      $("#maxCost").val(numeral(maxValue).format('0,0[.]00'));
      $("#cost-range").slider("values", [minValue, maxValue]);
      applyFeatureViewFilters();
    });

    $(".filter").change(function (e) {
      if (e.target.id === "townPrjs") {} else {
        $('#loading').modal('show')
        applyFeatureViewFilters();
      }
    });

    //This is the main filter function
    function applyFeatureViewFilters() {
      //Remove any existing graphics, close any existing popups, and reset the SQL statement
      view.popup.close();
      view.graphics.removeAll();
      sql = "1=1"
      divisionsSQL = "(1=1)";
      programsSQL = "(1=1)";
      if ($("#division").val() !== "All") {
        //Get the selected division
        divisionsSQL = "Division = '" + $("#division").val() + "'";
      }
      if ($("#programs").val()[0] !== 'All') {
        $($("#programs").val()).each(function () {
          //Get the selected programs
          if (this == $("#programs").val()[0]) {
            programsSQL = "Program = '" + this + "'"
          } else {
            programsSQL = programsSQL + " OR Program = '" + this + "'"
          }
        });
      }
      //Create the SQL statement for the projects
      sql = sql + " AND (" + divisionsSQL + ") AND (" + programsSQL + ") AND ( Total  >= " + parseFloat($("#minCost").val().replace(/,/g, '')) + " AND Total <= " + parseFloat($("#maxCost").val().replace(/,/g, '')) + ")"

      //Make sure the correct polygons are showing, based on the controls. It uses the polySql statement which gets towns/mpos/districts if needed
      prjLocationPolygons.definitionExpression = polySql;

      //Show/hide MBTA lines and other polygons, based on division selections.
      if ($("#division").val() == "All") {
        //Can show MBTA lines and polygons, since All divisions are selected
        mbtaLines.visible = true;
        prjLocationPolygons.visible = true;
      } else if ($("#division").val() == "MBTA") {
        //Only show the MBTA lines, because only MBTA division is selected
        mbtaLines.visible = true;
        prjLocationPolygons.visible = false;
      } else if ($("#division").val() == "Transit") {
        //Hide MBTA lines, and only show RTA polygons, because only Transit is selected
        mbtaLines.visible = true;
        prjLocationPolygons.visible = true;
        prjLocationPolygons.definitionExpression = "Location_Type = 'RTA'";
      } else {
        //Can hide MBTA lines, because MBTA division is not selected
        mbtaLines.visible = false;
        prjLocationPolygons.visible = true;
      }
      if (spatialFilter === true && projectSearchID == false) {
        //If a spatial filter is required and no project has been selected via the project search bar
        hideLoad = false;
        queryFilter = new FeatureFilter({
          where: sql,
          geometry: extentForRegionOfInterest,
          spatialRelationship: "intersects"
        });
      } else if (projectSearchID !== false) {
        //If a project has been selected via the project search bar
        queryFilter = new FeatureFilter({
          where: "ProjectID = '" + projectSearchID + "'",
        });
      } else {
        queryFilter = new FeatureFilter({
          where: sql,
        });
      }
      prjLocationLines.filter = queryFilter
      prjLocationPoints.filter = queryFilter
	  projectLocations.definitionExpression = sql
      projectLocationsPoints.definitionExpression = sql
    }

	  
    /*
    The following controls the project search bar. It defines it as an autopopulate
	input search. It also tells it what to search for when a user inputs some text.
	The second function is called when a project has been selected.
    */
    $("#projectSearch").autocomplete({
      source: function (request, response) {
        $.ajax({
          type: "POST",
          dataType: "json",
          url: "https://gis.massdot.state.ma.us/rh/rest/services/Projects/CIPCommentTool/FeatureServer/6/query",

          data: {
            where: "(Project_Description like '%" + request.term + "%' OR ProjectID like '%" + request.term + "%' OR Location like '%" + request.term + "%') AND " + sql,
            outFields: "Project_Description, ProjectID, MBTA_Location, Location_Source",
            returnGeometry: false,
            orderByFields: 'Project_Description',
            returnDistinctValues: true,
            f: 'pjson'
          },
          success: function (data) {
            const resultsArray = data.features;
            const searchSuggestions = resultsArray.map(p => {
              var rObj = {};
              rObj["id"] = p.attributes.ProjectID;
              rObj["value"] = p.attributes.Project_Description;
              rObj["mbta_loc"] = p.attributes.MBTA_Location;
              rObj["loc_source"] = p.attributes.Location_Source;
              return rObj;
            });
            response(searchSuggestions);
            view.popup.close();
            $(".ui-autocomplete").css({
              'width': ($("#projectSearch").width() + 'px')
            });
          }
        });
      },
      minLength: 2,
      select: function (event, ui) {
        searchedProject = ui.item.id;
      }
    });

    $("#projectSearch").autocomplete("option", "select", function (event, ui) {
      view.popup.clear();
      view.popup.close();
      view.graphics.removeAll();
      if (selectedHighlight) {
        selectedHighlight.remove();
      }
      popupSelected = new Graphic({});
      projectSearchID = ui.item.id
      $('#helpContents').show();
      $('#interactive').hide();
      geom = [];
      var query = prjLocationLines.createQuery();
      query.where = "ProjectID = '" + ui.item.id + "'";
      switch (ui.item.loc_source) {
        case 'POINT':
          projectLocationsPoints.queryFeatures(query).then(function (pts) {
            popupSelected = pts.features[0];
            view.zoom = 10;
            openSearchedPopup();
          })
          break;
        case 'LINE':
          projectLocations.queryFeatures(query).then(function (lines) {
            popupSelected = lines.features[0];
            openSearchedPopup();
          })
          break;
        case 'MBTA':
          var tQuery = mbtaLines.createQuery();
          tQuery.where = "Location_Filter like '%" + ui.item.mbta_loc + "%'";
          projectLocationsMBTA.queryFeatures(tQuery).then(function (result) {
            selectedHighlight = mbtaLines.highlight(result.features)
            popupSelected = result.features[0];
            popupSelected.attributes.Project_Description = ui.item.value
            popupSelected.attributes.ProjectID = ui.item.id
            popupSelected.popupTemplate = {
              title: "{Project_Description} - ({ProjectID})",
              content: popupFunction
            };
            openSearchedPopup();
          })
          break;
        case 'Statewide':
          if (highlight) {
            highlight.remove();
          }
          popupSelected.popupTemplate = {
            title: "{Project_Description} - ({ProjectID})",
            content: popupFunction
          };
          popupSelected.attributes = {
            Project_Description: ui.item.value,
            ProjectID: ui.item.id,
            HighlightRemove: "false"
          }
          popupSelected.geometry = stateExtent.centroid
          view.zoom = 8;
          openSearchedPopup();
          break;
        default:
          var highlight;
          var pQuery = prjLocationPolygons.createQuery();
          pQuery.where = "Location like '%" + ui.item.loc_source + "%'";
          prjLocationPolygons.queryFeatures(pQuery).then(function (result) {
            popupSelected = result.features[0];
            popupSelected.symbol = polySymbol;
            popupSelected.attributes.Project_Description = ui.item.value
            popupSelected.attributes.ProjectID = ui.item.id
            popupSelected.popupTemplate = {
              title: "{Project_Description} - ({ProjectID})",
              content: popupFunction
            };
            view.graphics.add(popupSelected);
            openSearchedPopup();
          })
      }
    });

    function openSearchedPopup() {
      view.goTo(popupSelected);
      view.popup.open({
        features: [popupSelected],
        highlightEnabled: true
      });
      projectSearchID = false
    }

    //This listens for anytime a new feature is selected and displayed in the popup, or someone clicks the map and there is no feature there
    watchUtils.watch(view.popup, "selectedFeature", function (feature) {
      $('.project_comment_success').hide()
      $('.project_comment_failure').hide()
      $('#helpContents').show();
      $('#interactive').hide();
      if (feature) {
        $("#projectSearch").val("");
        if (highlight && feature.attributes.HighlightRemove !== "false") {
          highlight.remove();
        }
        if (feature.attributes.ProjectID) {
          projId = feature.attributes.ProjectID;
          showComments(projId);
          liked = false;
          $('#likeProject').prop('disabled', false);
        }
      } else if (selectedHighlight) {
        selectedHighlight.remove();
        popupSelected.geometry = null;
        view.graphics.remove(popupSelected);
      } else {
        popupSelected.geometry = null;
        view.graphics.remove(popupSelected);
        view.graphics.remove(showPolyGraphic);
      }
    });


    /*
	This waits for a checkbox with the .geomCheck class to change. It will then filter
	the polygon layer to hide/remove features based on the options (towns, RTAs, districts)
	from the map.
    */
    $(".geomCheck").change(function (e) {
      view.graphics.removeAll();
      if (e.target.checked == false && e.target.id === "townPrjs") {
        townsSql = "0"
      } else if (e.target.checked == true && e.target.id === "townPrjs") {
        townsSql = "Town"
      }
      if (e.target.checked == false && e.target.id === "rtaPrjs") {
        rtaSql = "0"
      } else if (e.target.checked == true && e.target.id === "rtaPrjs") {
        rtaSql = "RTA"
      }
      if (e.target.checked == false && e.target.id === "districtPrjs") {
        distSql = "0"
      } else if (e.target.checked == true && e.target.id === "districtPrjs") {
        distSql = "Highway District"
      }
      polySql = "(Location_Type = '" + townsSql + "') OR (Location_Type = '" + rtaSql + "') OR (Location_Type = '" + distSql + "')"
      polySqlFilter = new FeatureFilter({
        where: polySql,
      });
      prjLocationPolygons.definitionExpression = polySql
    });


  });

});
