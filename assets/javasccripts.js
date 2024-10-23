(function() {
    var id = 'drag_container';
    var id2 = 'drag_container2';

    function initializeDragula() {
        var container1 = document.getElementById(id);
        var container2 = document.getElementById(id2);

        if (container1 && container2) {
            console.log('Containers found. Initializing Dragula.');
            dragula([container1, container2], {
                removeOnSpill: false
            });
            observer.disconnect(); // Stop observing after initialization
        }
    }

    // Create a MutationObserver to watch for changes in the DOM
    var observer = new MutationObserver(function(mutations, me) {
        initializeDragula();
    });

    // Start observing the document body for added nodes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Also try to initialize immediately in case the elements are already present
    initializeDragula();
})();
