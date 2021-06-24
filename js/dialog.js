'use strict';

(function () {

  $(document).ready(function () {
    tableau.extensions.initializeDialogAsync().then(function (openPayload) {
      buildDialog();
    });
  });

  // We bulid the dialogue box and ensure that settings are read from the
  // UI Namespace and the UI is updated.
  function buildDialog() {
    var worksheetName = tableau.extensions.settings.get("worksheet");
    if (worksheetName != undefined) {
      // We restore the look and feel settings.
      if (tableau.extensions.settings.get("compact") == "Y") {
        $("#compact").prop("checked", true);
      } else {
        $("#compact").prop("checked", false);
      }
      if (tableau.extensions.settings.get("hover") == "Y") {
        $("#hover").prop("checked", true);
      } else {
        $("#hover").prop("checked", false);
      }
      if (tableau.extensions.settings.get("nowrap") == "Y") {
        $("#nowrap").prop("checked", true);
      } else {
        $("#nowrap").prop("checked", false);
      }
      if (tableau.extensions.settings.get("order-column") == "Y") {
        $("#order-column").prop("checked", true);
      } else {
        $("#order-column").prop("checked", false);
      }
      if (tableau.extensions.settings.get("row-border") == "Y") {
        $("#row-border").prop("checked", true);
      } else {
        $("#row-border").prop("checked", false);
      }
      if (tableau.extensions.settings.get("stripe") == "Y") {
        $("#stripe").prop("checked", true);
      } else {
        $("#stripe").prop("checked", false);
      }

      $("#include-table-name").prop("checked", tableau.extensions.settings.get("include-table-name") == "Y" ? true : false);

      // ASL: additional controls
      if (tableau.extensions.settings.get("show-search-box") == "Y") {
        $("#show-search-box").prop("checked", true);
      } else {
        $("#show-search-box").prop("checked", false);
      }
      if (tableau.extensions.settings.get("show-filter-row") == "Y") {
        $("#show-filter-row").prop("checked", true);
      } else {
        $("#show-filter-row").prop("checked", false);
      }

      // We restore the Buttons plugin settings.
      if (tableau.extensions.settings.get("copy-btn") == "Y") {
        $("#copy-btn").prop("checked", true);
      } else {
        $("#copy-btn").prop("checked", false);
      }
      if (tableau.extensions.settings.get("export-excel-btn") == "Y") {
        $("#export-excel-btn").prop("checked", true);
      } else {
        $("#export-excel-btn").prop("checked", false);
      }
      if (tableau.extensions.settings.get("export-csv-btn") == "Y") {
        $("#export-csv-btn").prop("checked", true);
      } else {
        $("#export-csv-btn").prop("checked", false);
      }
      if (tableau.extensions.settings.get("export-pdf-btn") == "Y") {
        $("#export-pdf-btn").prop("checked", true);
      } else {
        $("#export-pdf-btn").prop("checked", false);
      }
      if (tableau.extensions.settings.get("print-btn") == "Y") {
        $("#print-btn").prop("checked", true);
      } else {
        $("#print-btn").prop("checked", false);
      }
      if (tableau.extensions.settings.get("colvis-btn") == "Y") {
        $("#colvis-btn").prop("checked", true);
      } else {
        $("#colvis-btn").prop("checked", false);
      }
      if (tableau.extensions.settings.get("checkbox-options") == "Y") {
        $("#checkbox-options").prop("checked", true);
      } else {
        $("#checkbox-options").prop("checked", false);
      }
      if (tableau.extensions.settings.get("checkbox-apply") == "Y") {
        $("#checkbox-apply").prop("checked", true);
      } else {
        $("#checkbox-apply").prop("checked", false);
      }
    }

    // Populate the worksheet drop down with a list of worksheets.
    // Generated at the time of opening the dialogue.
    let dashboard = tableau.extensions.dashboardContent.dashboard;
    dashboard.worksheets.forEach(function (worksheet) {
      $("#selectWorksheet").append("<option value='" + worksheet.name + "'>" + worksheet.name + "</option>");
      $("#selectWorksheetFilter").append("<option value='" + worksheet.name + "'>" + worksheet.name + "</option>");
    });

    // Add the column orders it exists
    var column_order = tableau.extensions.settings.get("column-order");
    if (column_order != undefined && column_order.length > 0) {
      var column_names_array = tableau.extensions.settings.get("column-names").split("|");
      var column_order_array = tableau.extensions.settings.get("column-order").split("|");
      $("#sort-it ol").text("");
      for (var i = 0; i < column_names_array.length; i++) {
        //alert(column_names_array[i] + " : " + column_order_array[i]);
        $("#sort-it ol").append("<li><div class='input-field'><input id='" + column_names_array[i] + "' type='text' col_num=" + column_order_array[i] + "><label for=" + column_names_array[i] + "'>" + column_names_array[i] + "</label></div></li>");

        // add option to "number of columns for row header" dropdown
        $('#col-count-row-header').append('<option value="' + (i + 1) + '" ' +
          (tableau.extensions.settings.get('col-count-row-header') == i + 1 ? 'selected' : '') + '>' + (i + 1) + '</option>');
      }
      $('#sort-it ol').sortable({
        onDrop: function (item) {
          $(item).removeClass("dragged").removeAttr("style");
          $("body").removeClass("dragging");
        }
      });
    }

    // Initialise the tabs, select and attach functions to buttons.
    $("#selectWorksheet").val(tableau.extensions.settings.get("worksheet"));
    $("#selectWorksheetFilter").val(tableau.extensions.settings.get("worksheet-filter"));
    $("#items-per-page").val(tableau.extensions.settings.get("items-per-page"));
    $("#action-element").val(tableau.extensions.settings.get("action-element"));
    $("#action-element-column").val(tableau.extensions.settings.get("action-element-column"));
    $("#checkbox-column").val(tableau.extensions.settings.get("checkbox-column"));
    $("#select-btn-text").val(tableau.extensions.settings.get("select-btn-text"));
    $('#selectWorksheet').on('change', '', function (e) {
      columnsUpdate();
    });
    $('select').formSelect();
    $('.tabs').tabs();
    $('#closeButton').click(closeDialog);
    $('#saveButton').click(saveButton);
    // $('#resetButton').click(resetButton);
  }

  function columnsUpdate() {
    var worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;
    var worksheetName = $("#selectWorksheet").val();

    // Get the worksheet object for the specified names.
    var worksheet = worksheets.find(function (sheet) {
      return sheet.name === worksheetName;
    });

    // Note that for our purposes and to speed things up we only want 1 record.
    worksheet.getSummaryDataAsync({ maxRows: 1 }).then(function (sumdata) {
      var worksheetColumns = sumdata.columns;
      // This blanks out the column list
      $("#sort-it ol").text("");
      var counter = 1;
      worksheetColumns.forEach(function (current_value) {
        // For each column we add a list item with an input box and label.
        // Note that this is based on materialisecss.
        $("#sort-it ol").append("<li><div class='input-field'><input id='" + current_value.fieldName + "' type='text' col_num=" + counter + "><label for=" + current_value.fieldName + "'>" + current_value.fieldName + "</label></div></li>");
        counter++;
      });
    });
    // Sets up the sortable elements for the columns list.
    // https://jqueryui.com/sortable/
    $('#sort-it ol').sortable({
      onDrop: function (item) {
        $(item).removeClass("dragged").removeAttr("style");
        $("body").removeClass("dragging");
      }
    });
  }

  // This function closes the dialog box without.
  function closeDialog() {
    tableau.extensions.ui.closeDialog("10");
  }

  // This function saves then settings and then closes then closes the dialogue
  // window.
  function saveButton() {

    // Data settings
    tableau.extensions.settings.set("worksheet", $("#selectWorksheet").val());
    tableau.extensions.settings.set("worksheet-filter", $("#selectWorksheetFilter").val());

    // Create a string which will hold the datatable.net css options called tableClass.
    // Also saves the individual Y and N so that we can restore the settings when you
    // open the configuration dialogue.
    // https://datatables.net/examples/styling/
    var tableClass = "";
    if ($("#compact").is(":checked")) {
      tableClass += " compact";
      tableau.extensions.settings.set("compact", "Y");
    } else {
      tableau.extensions.settings.set("compact", "N");
    }
    if ($("#hover").is(":checked")) {
      tableClass += " hover";
      tableau.extensions.settings.set("hover", "Y");
    } else {
      tableau.extensions.settings.set("hover", "N");
    }
    if ($("#nowrap").is(":checked")) {
      tableau.extensions.settings.set("nowrap", "Y");
    } else {
      tableClass += " nowrap";
      tableau.extensions.settings.set("nowrap", "N");
    }
    if ($("#order-column").is(":checked")) {
      tableClass += " order-column";
      tableau.extensions.settings.set("order-column", "Y");
    } else {
      tableau.extensions.settings.set("order-column", "N");
    }
    if ($("#row-border").is(":checked")) {
      tableClass += " row-border";
      tableau.extensions.settings.set("row-border", "Y");
    } else {
      tableau.extensions.settings.set("row-border", "N");
    }
    if ($("#stripe").is(":checked")) {
      tableClass += " stripe";
      tableau.extensions.settings.set("stripe", "Y");
    } else {
      tableau.extensions.settings.set("stripe", "N");
    }
    if ($("#include-table-name").is(":checked")) {
      tableClass += " include-table-name";
      tableau.extensions.settings.set("include-table-name", "Y");
    } else {
      tableau.extensions.settings.set("include-table-name", "N");
    }

    tableau.extensions.settings.set("table-classes", tableClass);

      // ASL: additional controls
      if ($("#show-search-box").is(":checked")) {
      tableau.extensions.settings.set("show-search-box", "Y");
    } else {
      tableau.extensions.settings.set("show-search-box", "N");
    }
    if ($("#show-filter-row").is(":checked")) {
      tableau.extensions.settings.set("show-filter-row", "Y");
    } else {
      tableau.extensions.settings.set("show-filter-row", "N");
    }

    // Saves the individual Y and N for the Buttons plugin settings so that we can restore this
    // when you open the configuration dialogue.
    // https://datatables.net/extensions/buttons/examples/html5/simple.html
    if ($("#copy-btn").is(":checked")) {
      tableau.extensions.settings.set("copy-btn", "Y");
    } else {
      tableau.extensions.settings.set("copy-btn", "N");
    }
    if ($("#export-excel-btn").is(":checked")) {
      tableau.extensions.settings.set("export-excel-btn", "Y");
    } else {
      tableau.extensions.settings.set("export-excel-btn", "N");
    }
    if ($("#export-csv-btn").is(":checked")) {
      tableau.extensions.settings.set("export-csv-btn", "Y");
    } else {
      tableau.extensions.settings.set("export-csv-btn", "N");
    }
    if ($("#export-pdf-btn").is(":checked")) {
      tableau.extensions.settings.set("export-pdf-btn", "Y");
    } else {
      tableau.extensions.settings.set("export-pdf-btn", "N");
    }
    if ($("#print-btn").is(":checked")) {
      tableau.extensions.settings.set("print-btn", "Y");
    } else {
      tableau.extensions.settings.set("print-btn", "N");
    }
    if ($("#colvis-btn").is(":checked")) {
      tableau.extensions.settings.set("colvis-btn", "Y");
    } else {
      tableau.extensions.settings.set("colvis-btn", "N");
    }
    if ($("#checkbox-options").is(":checked")) {
      tableau.extensions.settings.set("checkbox-options", "Y");
    } else {
      tableau.extensions.settings.set("checkbox-options", "N");
    }
    if ($("#checkbox-apply").is(":checked")) {
      tableau.extensions.settings.set("checkbox-apply", "Y");
    } else {
      tableau.extensions.settings.set("checkbox-apply", "N");
    }
    var items_per_page = $("#items-per-page").val();
    if (!items_per_page) { items_per_page = "5"; }
    tableau.extensions.settings.set("items-per-page", items_per_page);
    tableau.extensions.settings.set("action-element", $("#action-element").val());
    tableau.extensions.settings.set("action-element-column", $("#action-element-column").val());
    tableau.extensions.settings.set("checkbox-column", $("#checkbox-column").val());
    tableau.extensions.settings.set("select-btn-text", $("#select-btn-text").val());

    // This gets the column information and saves the column order and column name.
    // For example, if you have a data source with three columns and then reorder
    // there so that you get the third, first and then second column, you would get: 
    // --- column_order will look like: 3|1|2
    // --- column_name will look like: SUM(Sales)|Country|Region
    var column_order = "";
    var column_name = "";
    var counter = 0;
    $("#sort-it").find("input").each(function (column) {
      // This handles the column order
      if (counter == 0) {
        column_order = $(this).attr("col_num");
      } else {
        column_order = column_order + "|" + $(this).attr("col_num");
      }
      // This handles the column name.
      if (counter == 0) {
        if ($(this).val().length > 0) {
          column_name = $(this).val();
        } else {
          column_name = $(this).attr("id");
        }
      } else {
        if ($(this).val().length > 0) {
          column_name = column_name + "|" + $(this).val();
        } else {
          column_name = column_name + "|" + $(this).attr("id");
        }
      }
      counter++;
    });

    // row header setting
    tableau.extensions.settings.set("col-count-row-header", $('#col-count-row-header').val());

    // We save the column order and column name variables in the UI Namespace.
    tableau.extensions.settings.set("column-order", column_order);
    tableau.extensions.settings.set("column-names", column_name);

    // Call saveAsync to save the settings before calling closeDialog.
    tableau.extensions.settings.saveAsync().then((currentSettings) => {
      tableau.extensions.ui.closeDialog("10");
    });
  }
})();