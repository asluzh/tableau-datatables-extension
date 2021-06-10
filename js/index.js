'use strict';

(function () {

  // Creates a global table reference for future use.
  let tableReference = null;
  // let extensionTracker = null;

  // These variables will hold a reference to the unregister Event Listener functions.
  // https://tableau.github.io/extensions-api/docs/interfaces/dashboard.html#addeventlistener
  let unregisterSettingsEventListener = null;
  let unregisterFilterEventListener = null;
  let unregisterMarkSelectionEventListener = null;
  let unregisterParameterEventListener = null;

  $(document).ready(function () {
    // Add the configure option in the initialiseAsync to call the configure function
    // when we invoke this action on the user interface.
    tableau.extensions.initializeAsync({ 'configure': configure }).then(function () {
      // calls a function to show the table. There will be plenty of logic in this one.
      renderDataTable();
      // extensionTracker = parseInt(localStorage.getItem("tableau.extensions.datatables.tracker"));
      // if (!extensionTracker) {
        // extensionTracker = 0;
      // }
      // console.log("Extension launch counter: " + extensionTracker);
      // extensionTracker = extensionTracker + 1;
      // localStorage.setItem("tableau.extensions.datatables.tracker", extensionTracker);

      // We add our Settings and Parameter listeners here  listener here.
      unregisterSettingsEventListener = tableau.extensions.settings.addEventListener(tableau.TableauEventType.SettingsChanged, (settingsEvent) => {
        renderDataTable();
      });
      tableau.extensions.dashboardContent.dashboard.getParametersAsync().then(function (parameters) {
        parameters.forEach(function (p) {
          p.addEventListener(tableau.TableauEventType.ParameterChanged, (filterEvent) => {
            renderDataTable();
          });
        });
      });

    }, function () { console.log('Error while Initializing: ' + err.toString()); });
  });

  // Here is where the meat of the Extension is.
  // In a nut shell, we will try to read values from Settings and have several
  // if statements to retrieve values and populate as appropriate. This will end
  // with a call to a datatable function.
  function renderDataTable() {

    const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;

    // Unregister Event Listeners for old Worksheet, if exists.
    if (unregisterFilterEventListener != null) {
      unregisterFilterEventListener();
    }
    if (unregisterMarkSelectionEventListener != null) {
      unregisterMarkSelectionEventListener();
    }

    // We will try to read the worksheet from the settings, if this exists we will show
    // the configuration screen, otherwise we will clear the table and destroy the
    // reference.
    var sheetName = tableau.extensions.settings.get("worksheet");
    var sheetNameFilter = tableau.extensions.settings.get("worksheet-filter");
    var action_element = tableau.extensions.settings.get("action-element");
    var checkbox_column = tableau.extensions.settings.get("checkbox-column") == "Y";
    if (action_element) {console.log("action button YES");}
    if (checkbox_column) {console.log("checkbox column YES");}

    if (sheetName == undefined || sheetName == "" || sheetName == null) {
      $("#configure").show();
      $("#datatable").text("");
      if (tableReference !== null) {
        tableReference.destroy();
      }
      return; // exit the function if no worksheet name is present
    } else {
      // If a worksheet is selected, then we hide the configuration screen.
      $("#configure").hide();
    }

    // Use the worksheet name saved in the Settings to find and return
    // the worksheet object.
    var worksheet = worksheets.find(function (sheet) {
      return sheet.name === sheetName;
    });
    var worksheetFilter = worksheets.find(function (sheet) {
      return sheet.name === sheetNameFilter;
    });

    // Retrieve values the other two values from the settings dialogue window.
    var includeTableName = (tableau.extensions.settings.get('include-table-name') == 'Y' ? true : false);

    // override default datatable lang variables
    var datatableLangObj = {
      oAria: {
        sSortAscending: ': activate to sort column ascending' + (includeTableName ? ' on ' + sheetName + ' table' : ''),
        sSortDescending: ': activate to sort column descending' + (includeTableName ? ' on ' + sheetName + ' table' : '')
      }
    };

    // Add an event listener to the worksheet.
    unregisterFilterEventListener = worksheet.addEventListener(tableau.TableauEventType.FilterChanged, (filterEvent) => {
      renderDataTable();
    });
    unregisterMarkSelectionEventListener = worksheet.addEventListener(tableau.TableauEventType.MarkSelectionChanged, (markSelectionEvent) => {
      renderDataTable();
    });

    worksheet.getSummaryDataAsync().then(function (sumdata) {
      // We will loop through our column names from our settings and save these into an array
      // We will use this later in our datatable function.
      // https://tableau.github.io/extensions-api/docs/interfaces/datatable.html#columns
      const worksheetData = sumdata.data;
      var n_cols = sumdata.columns.length;
      // if configured, reserve additional two columns for checkbox and button
      var n_cols_ext = n_cols + (checkbox_column ? 1 : 0) + (action_element ? 1 : 0);
      console.log(n_cols, n_cols_ext);

      var data = [];
      // data.push({ title: "cb" }); // checkboxes, add dummy first column
      var column_names = tableau.extensions.settings.get("column-names").split("|");
      for (i = 0; i < column_names.length && i < n_cols; i++) {
        data.push({ title: column_names[i] });
      }
      if (checkbox_column) { data.push({ title: "" }); } // column name for checkboxes
      if (action_element)  { data.push({ title: "" }); } // column name for action element / button

      //      var column_order = tableau.extensions.settings.get("column-order").split("|");
      // var tableData = makeArray(sumdata.columns.length, sumdata.totalRowCount);
      var tableData = makeArray(n_cols_ext, sumdata.totalRowCount);
      for (var i = 0; i < tableData.length; i++) {
        for (var j = 0; j < n_cols; j++) {
          tableData[i][j] = worksheetData[i][j].formattedValue;
        }
        if (checkbox_column) {
          tableData[i][n_cols] = tableData[i][0]; // transfer the value from the first column to checkbox column
        }
      }

      // Destroy the old table.
      if (tableReference !== null) {
        tableReference.destroy();
        $("#datatable").text("");
      }

      // Read the Settings and get the single string for UI settings.
      var tableClass = tableau.extensions.settings.get("table-classes");
      $("#datatable").attr('class', '')
      $("#datatable").addClass(tableClass);

      // Read the Settings and create an array for the Buttons.
      var buttons = [];
      if (tableau.extensions.settings.get("copy-btn") == "Y") {
        buttons.push('copy');
      }
      if (tableau.extensions.settings.get("export-csv-btn") == "Y") {
        buttons.push('csv');
      }
      if (tableau.extensions.settings.get("export-excel-btn") == "Y") {
        buttons.push('excel');
      }
      if (tableau.extensions.settings.get("export-pdf-btn") == "Y") {
        buttons.push('pdf');
      }
      if (tableau.extensions.settings.get("print-btn") == "Y") {
        buttons.push('print');
      }
      if (tableau.extensions.settings.get("select-btn-text")) {
        buttons.push({
          text: tableau.extensions.settings.get("select-btn-text"),
          action: function ( e, dt, node, config ) {
            var selected = dt.column(0, { filter : 'applied'}).data().toArray();
            // console.log( selected );
            // console.log( column_names[0] );
            worksheetFilter.applyFilterAsync(column_names[0], selected, tableau.FilterUpdateType.Replace);
          }
        });
      }

      var dataTablesOptions = {
        data: tableData,
        columns: data,
        columnDefs: [],
        lengthMenu: [ 5, 10, 15, 20 ],
        stateSave: true,
        responsive: true,
        bAutoWidth: false,
        initComplete: datatableInitCallback,
        drawCallback: datatableDrawCallback,
        oLanguage: datatableLangObj
      };
      // If there are 1 or more Export options ticked, then we will add the dom: 'Bfrtip'
      // Else leave this out.
      if (buttons.length > 0) {
        $.extend(dataTablesOptions, {
          buttons: buttons,
          dom: 'Bfrtip',
          rowGroup: true
        });
      }
      if (checkbox_column) {
        dataTablesOptions.columnDefs.push({
          targets: n_cols,
          orderable: false,
          checkboxes: {
            selectRow: false,
            selectAll: false,
            selectCallback: function(nodes, selected) {
              // If "Show all" is not selected
              if($('#ctrl-show-selected').val() !== 'all'){
                // Redraw table to include/exclude selected row
                tableReference.draw(false);                  
              }            
            }
          }
        });
      }
      if (action_element) {
        dataTablesOptions.columnDefs.push({
          targets: n_cols_ext-1,
          orderable: false,
          data: null,
          defaultContent: action_element
        });
      }
      console.log(dataTablesOptions);
      tableReference = $('#datatable').DataTable(dataTablesOptions);
      $('#datatable tbody').on( 'click', 'button', function () {
        var data = tableReference.row( $(this).parents('tr') ).data();
        console.log( data[0] );
        console.log( column_names[0] );
        worksheetFilter.applyFilterAsync(column_names[0], [data[0]], tableau.FilterUpdateType.Replace);
      });
      // Handle change event for "Show selected records" control
      $('#ctrl-show-selected').on('change', function() {
        var val = $(this).val();
        // If all records should be displayed
        if (val === 'all'){
          $.fn.dataTable.ext.search.pop();
          tableReference.draw();
        }
        // If selected records should be displayed
        if (val === 'selected') {
          $.fn.dataTable.ext.search.pop();
          $.fn.dataTable.ext.search.push(
            function (settings, data, dataIndex) {
              // return ($(tableReference.row(dataIndex).node()).hasClass('selected')) ? true : false;
              return ($(tableReference.row(dataIndex).node()).find('input[type=checkbox]').prop('checked')) ? true : false;
            }
          );
          tableReference.draw();
        }
        // If selected records should not be displayed
        if (val === 'not-selected') {
          $.fn.dataTable.ext.search.pop();
          $.fn.dataTable.ext.search.push(
            function (settings, data, dataIndex){             
              // return ($(tableReference.row(dataIndex).node()).hasClass('selected')) ? false : true;
              return ($(tableReference.row(dataIndex).node()).find('input[type=checkbox]').prop('checked')) ? false : true;
            }
          );
        tableReference.draw();
        }
      });

    });
  }

  function datatableInitCallback(settings, json) {
    // insert table caption
    console.log("datatableInitCallback");
    var table = settings.oInstance.api();
    var $node = $(table.table().node());

    var sheetName = tableau.extensions.settings.get('worksheet');
    var includeTableName = (tableau.extensions.settings.get('include-table-name') == 'Y' ? true : false);

    // add screen reader only h2
    $('#datatable_wrapper').prepend('<h2 class="sr-only">' + sheetName + ' | Data Table Extension | Tableau</h2>');

    // show reviewed checkbox
    $('#datatable_wrapper').prepend('<select id="ctrl-show-selected"><option value="all" selected>Show all</option><option value="selected">Show selected</option><option value="not-selected">Show not selected</option></select>');

    // add screen readers only caption for table
    // make changes of caption announced by screen reader - used to update caption when sorting changed
    $node.prepend($('<caption id="datatable_caption" class="sr-only" role="alert" aria-live="polite">' + sheetName + '</caption>'));

    // update buttons aria-label to include information about table it is bound to
    $.each(table.buttons, function (item) {
    //table.buttons().each(function (item) {
      var $buttonNode = $(item.node);

      var ariaLabel = '';

      if ($buttonNode.hasClass('buttons-copy')) {
        ariaLabel = 'Copy' + (includeTableName ? ' ' + sheetName : '') + ' table';
        console.log("added copy button");
      }
      else if ($buttonNode.hasClass('buttons-csv')) {
        ariaLabel = 'CSV of' + (includeTableName ? ' ' + sheetName : '') + ' table';
      }
      else if ($buttonNode.hasClass('buttons-excel')) {
        ariaLabel = 'Excel of' + (includeTableName ? ' ' + sheetName : '') + ' table';
      }
      else if ($buttonNode.hasClass('buttons-pdf')) {
        ariaLabel = 'PDF of' + (includeTableName ? ' ' + sheetName : '') + ' table';
      }
      else if ($buttonNode.hasClass('buttons-print')) {
        ariaLabel = 'Print' + (includeTableName ? ' ' + sheetName : '') + ' table';
      }

      if (ariaLabel) {
        $buttonNode.attr('aria-label', ariaLabel);
      }
    });


    // update search input label
    var $searchEl = $('#datatable_filter input');
    $searchEl.attr('aria-label', 'Search' + (includeTableName ? ' ' + sheetName : '') + ' table');


    // set extension's iframe title
    if (window.frameElement) {
      window.frameElement.title = sheetName;
    }


    // set html lang attribute
    document.documentElement.setAttribute('lang', tableau.extensions.environment.language);
  }

  function datatableDrawCallback(settings) {
    console.log("datatableDrawCallback");
    var table = settings.oInstance.api();
    var $node = $(table.table().node());

    var $captionEl = $node.find('#datatable_caption');

    var sheetName = tableau.extensions.settings.get('worksheet');
    var includeTableName = (tableau.extensions.settings.get('include-table-name') == 'Y' ? true : false);
    var countOfColumnsForRowHeader = Number(tableau.extensions.settings.get('col-count-row-header'));

    // set row headers if setting is selected
    if (countOfColumnsForRowHeader > 0) {
      table.rows().every(function () {
        // for each row update needed number of cells to have role of row header
        $(this.node()).find('td').slice(0, countOfColumnsForRowHeader).attr('role', 'rowheader');
      });
    }

    // fix pagination buttons access by keyboard
    var $paginationNode = $('#datatable_paginate');

    if ($paginationNode.length) {

      // change role of element
      $paginationNode.attr('role', 'navigation');
      // set which element it controls
      $paginationNode.attr('aria-controls', $node.attr('id'));

      var paginateButEls = $paginationNode.find('.paginate_button');

      // if pagination button is disabled or current page (means no action when activated), remove from tab order
      paginateButEls.each(function () {
        var $item = $(this);

        // remove aria-controls set by default for each button (previously we set it for whole navigation element)
        $item.removeAttr('aria-controls');

        // disabled link, for example: prev or next button
        if ($item.hasClass('disabled')) {
          $item.attr('tabindex', -1);
        }
        // current page
        if ($item.hasClass('current')) {
          $item.addClass('disabled');
          $item.attr('tabindex', -1);
        }

        // prev page link text: add sr-only " page" text
        if ($item.attr('id') == 'datatable_previous') {
          $item.html('Previous <span class="sr-only">&nbsp;page of' + (includeTableName ? ' ' + sheetName + ' table' : '') + '</span>');
        }
        // link with number, for example "2" - add sr-only "page " text
        else if ($item.text().trim().match(/^\d+$/)) {
          // page number
          var pageNum = Number($item.text().trim());
          // items per page
          var itemsPerPage = table.page.len();
          // total number of items in table
          var totalCount = table.data().length;

          // calculate number of first item on the page
          var firstItemNum = (pageNum - 1) * itemsPerPage + 1;
          var lastItemNum = firstItemNum + itemsPerPage - 1;
          // correct last item num if last page is not full
          if (lastItemNum > totalCount) {
            lastItemNum = totalCount;
          }

          // set aria-label attribute
          $item.attr('aria-label', pageNum + ' - entries ' + firstItemNum + ' to ' + lastItemNum + ' of ' + totalCount + (includeTableName ? ' on ' + sheetName + ' table' : ''));
        }
        // next page link text: add sr-only " page" text
        else if ($item.attr('id') == 'datatable_next') {
          $item.html('Next <span class="sr-only">&nbsp;page of' + (includeTableName ? ' ' + sheetName + ' table' : '') + '</span>');
        }
      });
    }


    // fix sorting change announce by screen reader
    var order = table.order();

    if (order && order.length) {
      // remove aria-sort from any column set previously
      // as per spec it should be applied to only one element at a time: https://www.w3.org/WAI/PF/aria/states_and_properties#aria-sort
      $node.find('[aria-sort]').removeAttr('aria-sort');

      // get header element sorted by currently
      var $columnHeader = $(table.column(order[0][0]).header());

      // set aria-sort
      var ariaSortedByDirection = (order[0][1] == 'asc' ? 'ascending' : (order[0][1] == 'desc' ? 'descending' : 'other'));
      $columnHeader.attr('aria-sort', ariaSortedByDirection);

      // update table caption
      var sortedByDirectionText = ariaSortedByDirection;
      $captionEl.text(sheetName + ' sorted by ' + $columnHeader.text() + ': ' + sortedByDirectionText + ' order');
    }
    // default for no sort
    else {
      $node.find('[aria-sort]').removeAttr('aria-sort');
      $captionEl.text(sheetName);
    }
  }

  // Creates an empty 2D array. we will use this to match the the data set returned
  // by Tableau and repopulate this with the values we want.
  function makeArray(d1, d2) {
    var arr = new Array(d2), i, l;
    for (i = 0, l = d2; i < l; i++) {
      arr[i] = new Array(d1);
    }
    return arr;
  }

  // This is called when you click on the Configure button.
  function configure() {

    let popupUrl =
      window.location.href.substr(0, window.location.href.lastIndexOf("/") + 1) + "dialog.html";

    let input = "";

    tableau.extensions.ui.displayDialogAsync(popupUrl, input, { height: 540, width: 800 }).then((closePayload) => {
      // The close payload is returned from the popup extension via the closeDialog method.
      $('#interval').text(closePayload);
    }).catch((error) => {
      // One expected error condition is when the popup is closed by the user (meaning the user
      // clicks the 'X' in the top right of the dialog).  This can be checked for like so:
      switch (error.errorCode) {
        case tableau.ErrorCodes.DialogClosedByUser:
          console.log("Dialog was closed by user");
          break;
        default:
          console.error(error.message);
      }
    });
  }
})();
