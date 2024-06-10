$(document).ready(function () {
    $("#upload-link").on("click", function (e) {
        e.preventDefault();
        $("#file-input").click();
    });

    $("#uploadfile").on("dragover", function (e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).css('background-color', '#f9f9f9');
    });

    $("#uploadfile").on("dragleave", function (e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).css('background-color', '#fff');
    });

    $("#uploadfile").on("drop", function (e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).css('background-color', '#fff');
        let files = e.originalEvent.dataTransfer.files;
        handleFiles(files);
    });

    $("#file-input").on("change", function () {
        let files = this.files;
        handleFiles(files);
    });

    $('#upload-form').on('submit', function() {
      $('#myDiv').show();
    });
});

function handleFiles(files) {
    $("#image-previews").empty();
    if (files.length > 0) {
        console.log(files)
        console.log(files.length)
        Array.from(files).forEach(file => {
            let reader = new FileReader();
            reader.onload = function (e) {
                let img = $("<img>").attr("src", e.target.result).css("max-width", "100%").css("margin-top", "10px");
                $("#image-previews").append(img);
            }
            reader.readAsDataURL(file);
            console.log("File uploaded:", file.name);
        });
    }
}