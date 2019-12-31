$(document).ready(function () {
  searchedProject = false;

  $.post("https://gisdev.massdot.state.ma.us/server/rest/services/CIP/Projects/FeatureServer/6/query", {
      where: "1=1",
      outFields: "Division",
      returnGeometry: false,
      orderByFields: 'Division',
      returnDistinctValues: true,
      f: 'pjson'
    })
    .done(function (data) {
      var divisions = $.parseJSON(data);
      var divisionSelect = $('#division');
      $(divisions.features).each(function () {
        divisionSelect.append(
          $('<option></option>').val(this.attributes.Division).html(this.attributes.Division)
        );
      });

    });


  $.post("https://gis.massdot.state.ma.us/arcgis/rest/services/Boundaries/MPOs/MapServer/0/query", {
      where: "1=1",
      outFields: "MPO",
      returnGeometry: false,
      orderByFields: 'MPO',
      f: 'pjson'
    })
    .done(function (data) {
      var mpos = $.parseJSON(data);
      var mpoSelect = $('#mpoSelect');
      $(mpos.features).each(function () {
        mpoSelect.append(
          $('<option></option>').val(this.attributes.MPO).html(this.attributes.MPO)
        );
      });

    });


  $.post("https://gis.massdot.state.ma.us/arcgis/rest/services/Boundaries/Towns/MapServer/0/query", {
      where: "1=1",
      outFields: "TOWN, TOWN_ID",
      returnGeometry: false,
      orderByFields: 'TOWN_ID',
      f: 'pjson'
    })
    .done(function (data) {
      var towns = $.parseJSON(data);
      var townsSelect = $('#townSelect');
      $(towns.features).each(function () {
        townsSelect.append(
          $('<option></option>').val(this.attributes.TOWN_ID).html(this.attributes.TOWN)
        );
      });

    });

  programList = [];

  $.post("https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/MapServer/6/query", {
      where: "1=1",
      outFields: "Division, Program",
      returnGeometry: false,
      orderByFields: 'Program',
      returnDistinctValues: true,
      f: 'pjson'
    })
    .done(function (data) {
      var programs = $.parseJSON(data);
      var programSelector = $('#programs');
      $(programs.features).each(function () {
        programList.push(this.attributes.Program);
        programSelector.append(
          $('<option></option>').val(this.attributes.Program).html(this.attributes.Program).attr("division", this.attributes.Division)
        );
      });
	  getPrograms();
    });


  function getPrograms() {
    $("#programs").val("");
    $("#programs option").filter(function () {
      $(this).toggle($(this).attr("division") == $('#division').val() || $(this).attr("division") == "All");
    });
  }


  $("#division").change(function () {
    getPrograms();
  });
});
