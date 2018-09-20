var indexToName = [ 'Id', 'User', 'Start', 'End', 'Project', 'Vacation', 'Note' ];
var searchField = '';

$(document).ready(function(){
	var toImplantHTML = '<option value="Date">Date</option>';
	for (var i = 0; i < indexToName.length; i++) {
		toImplantHTML += '<option value="' + indexToName[i] + '">' + indexToName[i] + '</option>';
	}
	$('#fieldSelect').html(toImplantHTML);
	delete toImplantHTML;

	function updateSearch(){
		searchField = $('#fieldSelect').val();
		var search = $('#filterSearch').val().toUpperCase();
		var hasWarned = false;
		$('#plans-table').find('tr').each(function(){
			if (!hasWarned) {
				if (searchField == 'Date') {
					var startVal = new Date($(this).find('.Start-d').text()).getTime();
					var endVal = new Date($(this).find('.End-d').text()).getTime();
					var searchd = new Date(search).getTime();
					if (isNaN(searchd)) {
						$(this).addClass('showing');
					} else {
						if (searchd > startVal && searchd < endVal) {
							$(this).addClass('showing');
						} else {
							$(this).removeClass('showing');
						}
					}
				} else {
					var fieldVal = $(this).find('.' + searchField + '-d').html();
					if (fieldVal.toUpperCase().indexOf(search) != -1) {
						$(this).addClass('showing');
					} else {
						$(this).removeClass('showing');
					}
				}
			}
		});
		reshadePlans();
	}

	function reshadePlans(){
		var total = 0;
		$('.ts-planner-row.showing').each(function(){
			if (total % 2 == 0) {
				$(this).addClass('even');
			} else {
				$(this).removeClass('even');
			}
			total++;
		});
	}

	$('#fieldSelect').bind('change', function(e){
		updateInputField();
		updateSearch();
	});
	$('#filterSearch').bind('keyup', function(e){
		if (e.keyCode == 13) {
			updateSearch();
		}
	});
	$('#fieldSelect').bind('change', function(e){
		var fv = $('#fieldSelect').val();
		if (fv == 'Date' || fv == 'Start' || fv == 'End') {
			updateSearch();
		}
	});

	$('#file-upload').on('change', function(){
		var file = this.files[0];
		if (file.size > 1048576 * 8) {
			alert('max upload size is 8 MegaBytes (' + 1048576 * 8 + ' Bytes)');
		}
		if (file.size < 32) {
			alert('min upload size is 32 bits (' + 32 / 8 + ' bits)');
		}
	});

	$('#submitFileWithAjax').click(function(){
		if (confirm('This will remove all conflicting spreadsheet data, are you sure?')) {
			// if they click ok, run this code, otherwise, dont.
			var refrBtn = $(this);
			loadState = 0;
			var offset = {
				x: refrBtn.offset().left + refrBtn.width(),
				y: refrBtn.offset().top + refrBtn.height() / 2,
				opacity: 1,
				speed: 1,
			};
			rect_loader.tune(offset).generate().replay();
			rect_loaded.tune(offset).generate();
			$.ajax({
				url: '/ajax/planviaspreadsheet',
				type: 'POST',
				data: new FormData($('form')[0]),
				cache: false,
				contentType: false,
				processData: false,

				// Custom XMLHttpRequest
				xhr: function(){
					var myXhr = $.ajaxSettings.xhr();
					if (myXhr.upload) {
						// For handling the progress of the upload
						myXhr.upload.addEventListener(
							'progress',
							function(e){
								if (e.lengthComputable) {
									$('progress').attr({
										value: e.loaded,
										max: e.total,
									});
								}
							},
							false
						);
					}
					return myXhr;
				},
			}).done(function(){
				loadState = 1;
				rect_loader.tune({speed: 2}).generate();
				updatePlans();
			});
		}
	});

	function updateInputField(){
		var field = document.getElementById('filterSearch');
		var fv = $('#fieldSelect').val();
		if (fv == 'Date' || fv == 'Start' || fv == 'End') {
			field.type = 'date';
		} else {
			field.type = 'input';
		}
	}
	updateInputField();

	function updatePlans(){
		$.get(
			'/ajax/getplans',
			function(data){
				if (data.errcode == 200) {
					data = data.data[0].rows;
					var toSetAsHTML =
						'<table class="col-12" style="margin-top: 20px; margin-bottom: 30px;"> <tr class="col-12"> <th class="col-2"> Id </th> <th class="col-2"> User </th>';
					toSetAsHTML +=
						'<th class="col-2"> Start </th> <th class="col-2"> End </th> <th class="col-2"> Project </th> <th class="col-2"> Vacation? </th> <th class="col-2"> Note </th> </tr> </table><table id="plans-table" class="col-12">';
					var total = 0;
					for (var row of data) {
						toSetAsHTML += '<tr class="ts-planner-row ' + (total % 2 == 0 ? 'even ' : '') + 'showing col-12">';
						for (var i in row) {
							toSetAsHTML += '<td class="col-2 ' + indexToName[i] + '-d">' + row[i] + '</td>';
						}
						toSetAsHTML += '</tr>';
						total++;
					}
					toSetAsHTML += '</table>';
					$('#plansHolder').html(toSetAsHTML);
				} else {
					alert('ERRORCODE: ' + data.errcode + ' ERROR: ' + data.err);
				}
			},
			'json'
		);
	}
	updatePlans();
});

(function(){
	/* (the below copyright is only talking about this function) */
	/*
	Copyright (c) 2018 by Ushinro (https://codepen.io/Ushinro/pen/NPQzOx)

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
	*/
	function Init(){
		var fileSelect = document.getElementById('file-upload'),
			fileDrag = document.getElementById('file-drag'),
			submitButton = document.getElementById('submit-button');

		fileSelect.addEventListener('change', fileSelectHandler, false);

		// Is XHR2 available?
		var xhr = new XMLHttpRequest();
		if (xhr.upload) {
			// File Drop
			fileDrag.addEventListener('dragover', fileDragHover, false);
			fileDrag.addEventListener('dragleave', fileDragHover, false);
			fileDrag.addEventListener('drop', fileSelectHandler, false);
		}
	}

	function fileDragHover(e){
		var fileDrag = document.getElementById('file-drag');

		e.stopPropagation();
		e.preventDefault();

		fileDrag.className = e.type === 'dragover' ? 'hover' : 'modal-body file-upload';
	}

	function fileSelectHandler(e){
		// Fetch FileList object
		var files = e.target.files || e.dataTransfer.files;

		// Cancel event and hover styling
		fileDragHover(e);

		// Process all File objects
		for (var i = 0, f; (f = files[i]); i++) {
			parseFile(f);
			uploadFile(f);
		}
	}

	function output(msg){
		var m = document.getElementById('messages');
		m.innerHTML = msg;
	}

	function parseFile(file){
		output(
			'<ul>' +
				'<li>Name: <strong>' +
				encodeURI(file.name) +
				'</strong></li>' +
				'<li>Type: <strong>' +
				file.type +
				'</strong></li>' +
				'<li>Size: <strong>' +
				(file.size / (1024 * 1024)).toFixed(2) +
				' MB</strong></li>' +
				'</ul>'
		);
	}

	function setProgressMaxValue(e){
		var pBar = document.getElementById('file-progress');

		if (e.lengthComputable) {
			pBar.max = e.total;
		}
	}

	function updateFileProgress(e){
		var pBar = document.getElementById('file-progress');

		if (e.lengthComputable) {
			pBar.value = e.loaded;
		}
	}

	function uploadFile(file){
		var xhr = new XMLHttpRequest(),
			fileInput = document.getElementById('class-roster-file'),
			pBar = document.getElementById('file-progress'),
			fileSizeLimit = 1024; // In MB
		if (xhr.upload) {
			// Check if file is less than x MB
			if (file.size <= fileSizeLimit * 1024 * 1024) {
				// Progress bar
				pBar.style.display = 'inline';
				xhr.upload.addEventListener('loadstart', setProgressMaxValue, false);
				xhr.upload.addEventListener('progress', updateFileProgress, false);

				// File received / failed
				xhr.onreadystatechange = function(e){
					if (xhr.readyState == 4) {
						// Everything is good!
						// progress.className = (xhr.status == 200 ? "success" : "failure");
						// document.location.reload(true);
					}
				};

				// Start upload
				xhr.open('POST', document.getElementById('file-upload-form').action, true);
				xhr.setRequestHeader('X-File-Name', file.name);
				xhr.setRequestHeader('X-File-Size', file.size);
				xhr.setRequestHeader('Content-Type', 'multipart/form-data');
				xhr.send(file);
			} else {
				output('Please upload a smaller file (< ' + fileSizeLimit + ' MB).');
			}
		}
	}

	// Check for the various File API support.
	if (window.File && window.FileList && window.FileReader) {
		Init();
	} else {
		document.getElementById('file-drag').style.display = 'none';
	}
})();
