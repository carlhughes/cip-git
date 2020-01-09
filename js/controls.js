$(document).ready(function () {
  $.getJSON("config/urls.json")
    .done(function (json) {
      url = json.urls;
      $.post(url.project_table + "/query", {
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

      $.post(url.MPOs + "/query", {
          where: "Location_Type = 'MPO'",
          outFields: "Location",
          returnGeometry: false,
          orderByFields: 'Location',
          f: 'pjson'
        })
        .done(function (data) {
          var mpos = $.parseJSON(data);
          var mpoSelect = $('#mpoSelect');
          $(mpos.features).each(function () {
            mpoSelect.append(
              $('<option></option>').val(this.attributes.Location).html(this.attributes.Location)
            );
          });

        });


      $.post(url.Towns + "/query", {
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

      $.post(url.project_table + "/query", {
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


    })
    .fail(function (jqxhr, textStatus, error) {
      var err = textStatus + ", " + error;
    });

});
