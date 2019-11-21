$(document).ready(function () {

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


  function getPrograms(division) {
	  		$('#programs')
			.empty()
			.append('<option selected="selected" value="All">All</option>');
    $.post("https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/MapServer/1/query", {
        where: "Division ='" + division + "'",
        outFields: "Program",
        returnGeometry: false,
        orderByFields: 'Program',
		returnDistinctValues: true,
        f: 'pjson'
      })
      .done(function (data) {
        var programs = $.parseJSON(data);
        var programSelector = $('#programs');
        $(programs.features).each(function () {
          programSelector.append(
            $('<option></option>').val(this.attributes.Program).html(this.attributes.Program)
          );
        });

      });
  }
	
	
	$("#division").change(function (evt) {
		getPrograms(evt.currentTarget.value);
    });

});
