// assets/clickstream.js
import { getEasternISO } from '../frontend/src/utils/datetimeUtils';

if (!window.dash_clientside) {
    window.dash_clientside = {};
}

window.dash_clientside.clickstream = {
    captureClick: function(n_clicks) {
        if (window.latestClickData) {
            var data = window.latestClickData;
            window.latestClickData = null; // Reset after reading
            return data;
        } else {
            return null;
        }
    }
};

window.addEventListener('DOMContentLoaded', (event) => {
    document.addEventListener('mousedown', function(event) {
        console.log('mousedown event captured:', event.target.id);

        const target = event.target.id || event.target.className || event.target.tagName;
        const downPosition = { x: event.clientX, y: event.clientY };
        const timestamp = getEasternISO();

        document.addEventListener('mouseup', function(e) {
            console.log('mouseup event captured:', e.target.id);

            const upPosition = { x: e.clientX, y: e.clientY };

            const clickData = {
                target: target,
                timestamp: timestamp,
                down_position: downPosition,
                up_position: upPosition
            };

            console.log('Click data:', clickData);

            // Store the data globally
            window.latestClickData = clickData;

            // Programmatically click the hidden button to trigger the clientside callback
            const dummyButton = document.getElementById('dummy-input');
            if (dummyButton) {
                dummyButton.click();
                console.log('Triggered dummy button click');
            }

        }, { once: true });
    });
});
