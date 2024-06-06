if (!window.dash_clientside) {
    window.dash_clientside = {};
}
window.dash_clientside.clientside = {
    make_draggable: function(id,id2) {
        setTimeout(function() {
            dragula([document.getElementById(id),document.getElementById(id2)], {
                removeOnSpill: true
              })
        }, 1)

        return window.dash_clientside.no_update
    }
}