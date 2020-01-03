$(document).ready(function () {
  searchedProject = false;
  require(["esri/views/MapView", "esri/Map", "esri/WebMap", "esri/layers/MapImageLayer", "esri/tasks/QueryTask", "esri/tasks/support/Query", "esri/core/watchUtils",
    "esri/layers/FeatureLayer",
    "esri/layers/GraphicsLayer",
    "esri/tasks/Locator",
    "esri/widgets/Search",
    "esri/widgets/Popup",
    "esri/widgets/Home",
    "esri/views/layers/support/FeatureFilter",
    "esri/Graphic"
  ], function (MapView, Map, WebMap, MapImageLayer, QueryTask, Query, watchUtils, FeatureLayer, GraphicsLayer, Locator, Search, Popup, Home, FeatureFilter, Graphic, comments) {
    var spatialFilter = false;
    var sql = "1=1"
    var projectSearchID = false;
    var extentForRegionOfInterest = false;
    var altSql = '1=1';
    var highlight;

    $("#projectSearch").autocomplete({
      source: function (request, response) {
        $.ajax({
          type: "POST",
          dataType: "json",
          url: "https://gisdev.massdot.state.ma.us/server/rest/services/CIP/Projects/FeatureServer/6/query",
          data: {
            where: "(Project_Description like '%" + request.term + "%' OR ProjectID like '%" + request.term + "%' OR Location like '%" + request.term + "%') AND " + altSql,
            outFields: "Project_Description, ProjectID, MBTA_Location",
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
              return rObj;
            });
            response(searchSuggestions);
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
      outFields: ["MBTA_Location", "route_desc", "route_long_name", "Location_Filter"],
      popupTemplate: {
        title: "MBTA Route: {MBTA_Location}",
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
        where: "(MBTA_Location = '" + target.graphic.attributes.MBTA_Location + "' or MBTA_Location = '" + target.graphic.attributes.route_desc + "' or MBTA_Location = 'System') AND " + altSql
      });
      return queryProjectTask.execute(query).then(function (result) {
        if (result.features.length > 0) {
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
        return "<p id='popupFeatureSelected' val='" + attributes.ProjectID + "'></br>MassDOT Division: " + attributes.Division + "</br> Location: " + attributes.MBTA_Location + "</br> Program: " + attributes.Program + "</br> Total Cost: " + numeral(attributes.Total).format('$0,0[.]00') + "</p> This is a <b>" + attributes.Division + "</b> project programmed as <b>" + attributes.Program + "</b>. It has a total cost of <b>" + numeral(attributes.Total).format('$0,0[.]00') + "</b>."
      });
    }

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

    map.addMany([projectLocations, projectLocationsPoints, projectLocationsMBTA]);

    //These are periphery layers used for added functionality, including spatial querying and commenting
    townLayer = new FeatureLayer({
      url: "https://gis.massdot.state.ma.us/arcgis/rest/services/Boundaries/Towns/MapServer/0",
    });

    mpoLayer = new FeatureLayer({
      url: "https://gis.massdot.state.ma.us/arcgis/rest/services/Boundaries/MPOs/MapServer/0",
    });

    var view = new MapView({
      map: map,
      container: "viewDiv",
      zoom: 9, // Sets zoom level based on level of detail (LOD)
      center: [-71.8, 42] // Sets center point of view using longitude,latitude
    });

    var queryProjectTask = new QueryTask({
      url: "https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/FeatureServer/6"
    });

    var searchWidget = new Search({
      view: view
    });

    var homeBtn = new Home({
      view: view
    });

    view.ui.add([{
      component: homeBtn,
      position: "top-left",
      index: 1
    }, {
      component: searchWidget,
      position: "top-left",
      index: 0
    }]);

    watchUtils.watch(view.popup, "selectedFeature", function (feature) {
      $('.project_comment_success').hide()
      $('.project_comment_failure').hide()
      $('#helpContents').show();
      $('#interactive').hide();
      //$('#projectList').hide();
      if (feature) {
        if (highlight && feature.attributes.HighlightRemove !== "false") {
          highlight.remove();
        }
        $("#projectSearch").val("");
        if (feature.attributes.ProjectID) {
          projId = feature.attributes.ProjectID;
          showComments(projId);
        }
      } else if (highlight) {
          highlight.remove();
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

    var townQuery = townLayer.createQuery();
    var mpoQuery = mpoLayer.createQuery();

    //The following event handlers listen for changes in the filter form inputs
    $("#townSelect").change(function () {
      $("#mpoSelect").val("");
      if ($("#townSelect").val() > 0) {
        $('#loading').modal('show')
        hideLoad = false;
        townQuery.where = "TOWN_ID = " + $("#townSelect").val();
        townQuery.returnGeometry = true;
        townQuery.outFields = ["TOWN_ID", "TOWN"];
        townQuery.outSpatialReference = view.spatialReference;
        townLayer.geometryPrecision = 0;
        townLayer.queryFeatures(townQuery)
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
        view.goTo({
          zoom: 9, // Sets zoom level based on level of detail (LOD)
          center: [-71.8, 42]
        });
      }
    });

    $("#mpoSelect").change(function () {
      $("#townSelect").val("");
      var selectedMPO = $(this).children("option:selected").val();
      if (selectedMPO != "All") {
        $('#loading').modal('show')
        hideLoad = false;
        mpoQuery.where = "MPO like '%" + selectedMPO + "%'";
        mpoQuery.returnGeometry = true;
        mpoQuery.outFields = ["MPO"];
        mpoQuery.outSpatialReference = view.spatialReference;
        mpoQuery.returnExtentOnly = true;
        mpoQuery.geometryPrecision = 0;
        mpoLayer.queryFeatures(mpoQuery)
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
        view.goTo({
          zoom: 9, // Sets zoom level based on level of detail (LOD)
          center: [-71.8, 42]
        });
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
        applyFeatureViewFilters();
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
      applyFeatureViewFilters();
    });

    $(".filter").change(function () {
      applyFeatureViewFilters();
    });

    var hideLoad = false;
    $('#loading').on('shown.bs.modal', function (e) {
      if (hideLoad == true) {
        $('#loading').modal('hide')
      }
    })

    //These are the feature layer views of the project locations
    view.whenLayerView(projectLocations)
      .then(function (layerView) {
        prjLocationLines = layerView
        prjLocationLines.watch("updating", function (val) {
          if (val == false) {
            hideLoad = true;
            $('#loading').modal('hide')
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
      altSql = sql.replace("TotalCost", "Total").replace("TotalCost", "Total")
      if ($("#division").val() == "All" || $("#division").val() == "MBTA") {
        mbtaLines.visible = true;
      } else {
        mbtaLines.visible = false;
      }

      if (spatialFilter === true && projectSearchID == false) {
        $('#loading').modal('show')
        hideLoad = false;
        queryFilter = new FeatureFilter({
          where: sql,
          geometry: extentForRegionOfInterest,
          spatialRelationship: "intersects"
        });
      } else if (projectSearchID !== false) {
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
    }

    $("#projectSearch").autocomplete("option", "select", function (event, ui) {
      view.popup.close();
      projectSearchID = ui.item.id
      $('#helpContents').show();
      $('#commentForm').hide();
      //$('#projectList').hide();
      geom = [];
      var query = prjLocationLines.createQuery();
      query.where = "ProjectID = '" + ui.item.id + "'";
      if (ui.item.mbta_loc !== null) {
        var tQuery = mbtaLines.createQuery();
        tQuery.where = "Location_Filter like '%" + ui.item.mbta_loc + "%'";
        mbtaLines.queryFeatures(tQuery).then(function (result) {
          if (highlight) {
            highlight.remove();
          }
          highlight = mbtaLines.highlight(result.features);
          tAsset = new Graphic({
            geometry: result.features[0].geometry,
            attributes: {
              Project_Description: ui.item.value,
              ProjectID: ui.item.id,
              HighlightRemove: "false"
            },
            popupTemplate: {
              title: "{Project_Description} - ({ProjectID})",
              content: popupFunction
            }
          });
          view.popup.open({
            location: tAsset.geometry.extent.center,
            features: [tAsset],
            highlightEnabled: true
          });
        })
      } else {
        prjLocationLines.queryFeatures(query).then(function (result) {
          geom = geom.concat(result.features);
        }).then(function () {
          prjLocationPoints.queryFeatures(query).then(function (pts) {
            geom = geom.concat(pts.features);
            openPopups();
          })
        });
      };

      function openPopups() {
        if (geom[0].geometry.type == 'point') {
          center = geom[0].geometry
        } else {
          center = geom[0].geometry.extent.center
        }
        view.popup.open({
          location: center,
          features: geom,
          highlightEnabled: true
        });
        view.goTo(center);
        projectSearchID = false
      }

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
              results.append("<div class='media'><div class='media-body'><h5 class='media-heading user_name'>" + this.attributes.Name + "</h5>" + this.attributes.Comments + "</div></div>");
            });
            results.show();
          } else {
            results.append("This project currently has no comments. PROJ ID: " + projId);
          }
          results.show();
          $('#interactive').show();
          //$('#projectList').show();
        });

    }

  });

});
