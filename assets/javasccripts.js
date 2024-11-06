(function() {
    var id = 'drag_container';
    var id2 = 'drag_container2';
    var drake; // Keep reference to the Dragula instance

    function initializeDragula() {
        var container1 = document.getElementById(id);
        var container2 = document.getElementById(id2);

        console.log('initializeDragula called. Containers:', container1, container2);

        if (container1 && container2) {
            console.log('Containers found. Initializing Dragula.');

            // Destroy the previous Dragula instance if it exists
            if (drake) {
                drake.destroy();
                drake = null;
            }

            // Initialize a new Dragula instance
            drake = dragula([container1, container2], {
                removeOnSpill: false
            });
        } else {
            console.log('Containers not found.');
        }
    }

    function destroyDragula() {
        if (drake) {
            drake.destroy();
            drake = null;
            console.log('Dragula instance destroyed.');
        }
    }

    // Observe the document for additions and removals of the containers
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (
                    node.id === id || node.id === id2 ||
                    (node.querySelector && (node.querySelector('#' + id) || node.querySelector('#' + id2)))
                ) {
                    console.log('Containers added to the DOM.');
                    initializeDragula();
                }
            });
            mutation.removedNodes.forEach(function(node) {
                if (
                    node.id === id || node.id === id2 ||
                    (node.querySelector && (node.querySelector('#' + id) || node.querySelector('#' + id2)))
                ) {
                    console.log('Containers removed from the DOM.');
                    destroyDragula();
                }
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Initialize Dragula in case the containers are already present
    initializeDragula();
})();
