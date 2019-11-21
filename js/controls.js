$(document).ready(function () {
  $.get("https://gisdev.massdot.state.ma.us/server/rest/services/CIP/CIPCommentToolTest/MapServer/1/query?where=1%3D1&text=&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&relationParam=&outFields=Program&returnGeometry=false&returnTrueCurves=false&maxAllowableOffset=&geometryPrecision=&outSR=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&returnDistinctValues=true&resultOffset=&resultRecordCount=&queryByDistance=&returnExtentsOnly=false&datumTransformation=&parameterValues=&rangeValues=&f=pjson", function (data) {
    var programs = JSON.parse(data);
    var mySelect = $('#programs');
    $(programs.features).each(function () {
      mySelect.append(
        $('<option></option>').val(this.attributes.Program).html(this.attributes.Program)
      );
    });

  });
  $("#cost-range").slider({
    range: true,
    min: 0,
    max: 1000000,
    values: [0, 1000000],
    slide: function (event, ui) {
      $("#minAmount").val("₹" + ui.values[0] + " - ₹" + ui.values[1]);
	  $("#amount").val("₹" + ui.values[0] + " - ₹" + ui.values[1]);
    }
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
});
