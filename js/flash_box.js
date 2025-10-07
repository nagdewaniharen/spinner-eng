// a lot of this is boilerplate.
// the real stuff:
// - var defaults = {}
// - anything inside `var FlashBox = function (selector, options)`

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory(root));
    } else if (typeof exports === 'object') {
        module.exports = factory(root);
    } else {
        root.FlashBox = factory(root);
    }
})(typeof global !== "undefined" ? global : this.window || this.global, function (root) {

    'use strict';

    var supports = !!document.querySelector && !!root.addEventListener; // Feature test
    var settings, eventTimeout;

    // Default settings
    var defaults = {
        fonts: [],
        lightSpeed: 500,
        lightsOff: 1,
        direction: 'clockwise',
        fadeLights: false,
        responsive: false,
        sizeFromCanvas: false,
        assets: {},
        objectPaint: {
            'rail': {
                stroke: '#ffc700',
                strokeWeight: 2,
                fill: '#ffc700'
            },
            'content': {
                stroke: '#ffc700',
                strokeWeight: 2,
                fill: '#000000'
            }
        },
        outerRadius: 35,
        innerRadius: 20,
        edgeGap: 19,
        lightSettings: {
            minMargin: 0,
            lightDiam: 38,
            gapHorizontal: 30,
            gapVertical: 30
        },
        canvasSettings: {
            width: 400,
            height: 400,
            margin: 10
        }
    };

	/**
	 * A simple forEach() implementation for Arrays, Objects and NodeLists
	 * @private
	 * @param {Array|Object|NodeList} collection Collection of items to iterate
	 * @param {Function} callback Callback function for each iteration
	 * @param {Array|Object|NodeList} scope Object/NodeList/Array that forEach is iterating over (aka `this`)
	 */
    var forEach = function (collection, callback, scope) {
        if (Object.prototype.toString.call(collection) === '[object Object]') {
            for (var prop in collection) {
                if (Object.prototype.hasOwnProperty.call(collection, prop)) {
                    callback.call(scope, collection[prop], prop, collection);
                }
            }
        } else {
            for (var i = 0, len = collection.length; i < len; i++) {
                callback.call(scope, collection[i], i, collection);
            }
        }
    };

	/**
	 * Merge defaults with user options
	 * @private
	 * @param {Object} defaults Default settings
	 * @param {Object} options User options
	 * @returns {Object} Merged values of defaults and options
	 */
    var extend = function (defaults, options) {
        var extended = {};
        forEach(defaults, function (value, prop) {
            extended[prop] = defaults[prop];
        });
        forEach(options, function (value, prop) {
            extended[prop] = options[prop];
        });
        return extended;
    };

	/**
	 * Convert data-options attribute into an object of key/value pairs
	 * @private
	 * @param {String} options Link-specific options as a data attribute string
	 * @returns {Object}
	 */
    var getDataOptions = function (options) {
        return !options || !(typeof JSON === 'object' && typeof JSON.parse === 'function') ? {} : JSON.parse(options);
    };

    var isEmpty = function (str) {
        return (!str || 0 === str.length);
    }

	/**
	 * Get the closest matching element up the DOM tree
	 * @param {Element} elem Starting element
	 * @param {String} selector Selector to match against (class, ID, or data attribute)
	 * @return {Boolean|Element} Returns false if not match found
	 */
    var getClosest = function (elem, selector) {
        var firstChar = selector.charAt(0);
        for (; elem && elem !== document; elem = elem.parentNode) {
            if (firstChar === '.') {
                if (elem.classList.contains(selector.substr(1))) {
                    return elem;
                }
            } else if (firstChar === '#') {
                if (elem.id === selector.substr(1)) {
                    return elem;
                }
            } else if (firstChar === '[') {
                if (elem.hasAttribute(selector.substr(1, selector.length - 2))) {
                    return elem;
                }
            }
        }
        return false;
    };


    //--- MAIN CODE
    var FlashBox = function (selector, options) {

        var flashBox = {};
        var _s, el;
        var mainCanvasContain, canvas, c, canvasSettings, lightSettings, lights, assets, lightsTimer, lightOpacity, lightOpacityDirection, lightOpacityIncrement, loopSpeed;
        var edgeGap, _border, startX, endX, startY, endY;
        var isDestroyed = false;

        if (typeof selector == 'string') {
            el = document.querySelector(selector);
        } else {
            el = selector;
        }

        flashBox.destroy = function () {
            //do any necessary destroy stuff here            
            clearInterval(lightsTimer);
            isDestroyed = true;
        };

        //user callable function
        // flashBox.printVar = function() {
        //     console.log(settings.someVar);
        // }

        flashBox.init = function() {            
            isDestroyed = false;

            // Selectors and variables
            _s = extend(defaults, options || {}); // Merge user options with defaults
            if (!('gapHorizontal' in _s.lightSettings)) _s.lightSettings['gapHorizontal'] = defaults.lightSettings['gapHorizontal'];
            if (!('gapVertical' in _s.lightSettings)) _s.lightSettings['gapVertical'] = defaults.lightSettings['gapVertical'];

            if (window.getComputedStyle(el).display === 'none' && _s.sizeFromCanvas == true) return;

            //Start Here
            _border = _s.edgeGap * 2 - _s.canvasSettings.margin;
            _s.lightSettings.edgeGap = _s.edgeGap;
            loopSpeed = 10;
            lightOpacity = 0;
            lightOpacityIncrement = (1 / _s.lightSpeed) * loopSpeed * 100;
            
            preload().then(function () {
                setup();
                drawStage();

                //make the lights flash
                if (_s.lightSpeed > 0) {
                    if (_s.fadeLights) {
                        startLightsFade();
                    } else {
                        startLights();
                    }
                }
            });            
        }
        flashBox.init();

        function startLightsFade() {
            clearInterval(lightsTimer);
            lightsTimer = window.setInterval(function () {
                c.clearRect(0, 0, canvas.width, canvas.height);
                if (lightOpacity <= 0) {
                    lightOpacityDirection = 1;

                    var temp_lights = JSON.parse(JSON.stringify(lights));

                    for (var i = 0; i < lights.length; i++) {
                        if (temp_lights[i].on) {
                            lights[i].on = false;

                            if (_s.direction == 'anti-clockwise') {
                                if (i - 1 >= 0) {
                                    lights[i - 1].on = true;
                                } else {
                                    lights[lights.length - 1].on = true;
                                }
                            } else if (_s.direction == 'clockwise') {
                                if (i + 1 <= lights.length - 1) {
                                    lights[i + 1].on = true;
                                } else {
                                    lights[0].on = true;
                                }
                            }
                        }
                    }

                }

                if (lightOpacity >= 100) { lightOpacityDirection = 0; }
                if (lightOpacityDirection == 1) { lightOpacity += lightOpacityIncrement; }
                if (lightOpacityDirection == 0) { lightOpacity -= lightOpacityIncrement; }

                drawStage();
            }, loopSpeed);
        }

        function startLights() {
            clearInterval(lightsTimer);
            lightsTimer = window.setInterval(function () {
                c.clearRect(0, 0, canvas.width, canvas.height);

                var temp_lights = JSON.parse(JSON.stringify(lights));

                for (var i = 0; i < lights.length; i++) {
                    if (temp_lights[i].on) {
                        lights[i].on = false;

                        if (_s.direction == 'anti-clockwise') {
                            if (i - 1 >= 0) {
                                lights[i - 1].on = true;
                            } else {
                                lights[lights.length - 1].on = true;
                            }
                        } else if (_s.direction == 'clockwise') {
                            if (i + 1 <= lights.length - 1) {
                                lights[i + 1].on = true;
                            } else {
                                lights[0].on = true;
                            }
                        }
                    }
                }

                drawStage();
            }, _s.lightSpeed);
        }

        function setup() {
            mainCanvasContain = el;

            if (mainCanvasContain && _s.responsive) {
                if (mainCanvasContain.offsetWidth) {
                    _s.canvasSettings.width = mainCanvasContain.offsetWidth;
                }
                if (mainCanvasContain.offsetHeight) {
                    _s.canvasSettings.height = mainCanvasContain.offsetHeight;
                }
            }

            if (!canvas) {
                canvas = document.createElement('canvas');
                canvas.setAttribute('id', 'flashBoxCanvas');
                el.appendChild(canvas);
            }
            c = canvas.getContext("2d");

            if (_s.sizeFromCanvas) {                
                _s.canvasSettings.width = canvas.offsetWidth;
                _s.canvasSettings.height = canvas.offsetHeight;
            }

            canvas.setAttribute('width', _s.canvasSettings.width);
            canvas.setAttribute('height', _s.canvasSettings.height);

            lights = [];

            //create the lights
            createLights('top', _s.lightSettings);
            createLights('right', _s.lightSettings);
            createLights('bottom', _s.lightSettings);
            createLights('left', _s.lightSettings);

            //set light state
            for (var i = 0; i < lights.length; i++) {
                if (i % (_s.lightsOff + 1) == 0) {
                    lights[i].on = true;
                } else {
                    lights[i].on = false;
                }
            }
        }

        function drawStage() {
            //draw base rectangle
            paintShape({
                shape: 'roundedRectangle',
                shapeData: [
                    (_s.canvasSettings.width - _s.canvasSettings.margin * 2),
                    (_s.canvasSettings.height - _s.canvasSettings.margin * 2),
                    _s.canvasSettings.margin,
                    _s.canvasSettings.margin,
                    _s.outerRadius
                ],
                fill: _s.objectPaint.rail.fill,
                stroke: _s.objectPaint.rail.stroke,
                strokeWeight: _s.objectPaint.rail.strokeWeight
            });

            if ('railTile' in _s.assets && !isEmpty(_s.assets['railTile'])) {
                paintShape({
                    shape: 'roundedRectangle',
                    shapeData: [
                        (_s.canvasSettings.width - _s.canvasSettings.margin * 2),
                        (_s.canvasSettings.height - _s.canvasSettings.margin * 2),
                        _s.canvasSettings.margin,
                        _s.canvasSettings.margin,
                        _s.outerRadius
                    ],
                    fillImage: 'railTile',
                    stroke: _s.objectPaint.rail.stroke,
                    strokeWeight: _s.objectPaint.rail.strokeWeight
                });
            }

            //draw inner rectangle
            paintShape({
                shape: 'roundedRectangle',
                shapeData: [
                    (_s.canvasSettings.width - _border * 2),
                    (_s.canvasSettings.height - _border * 2),
                    _border,
                    _border,
                    _s.innerRadius
                ],
                fill: _s.objectPaint.content.fill,
                stroke: _s.objectPaint.content.stroke,
                strokeWeight: _s.objectPaint.content.strokeWeight
            });

            if ('contentTile' in _s.assets && !isEmpty(_s.assets['contentTile'])) {
                paintShape({
                    shape: 'roundedRectangle',
                    shapeData: [
                        (_s.canvasSettings.width - _border * 2),
                        (_s.canvasSettings.height - _border * 2),
                        _border,
                        _border,
                        _s.innerRadius
                    ],
                    fillImage: 'contentTile',
                    stroke: _s.objectPaint.content.stroke,
                    strokeWeight: _s.objectPaint.content.strokeWeight
                });
            }

            //draw the lights
            for (var i = 0; i < lights.length; i++) {
                var _light = lights[i];
                drawLight(_light);
            }
        }

        flashBox.refreshSize = function () {
            if (window.getComputedStyle(el).display === 'none' && _s.sizeFromCanvas == true) return;
            if (isDestroyed) return;

            if (c) {
                c.clearRect(0, 0, canvas.width, canvas.height);
                setup();
                drawStage();

                if (_s.lightSpeed > 0) {
                    if (_s.fadeLights) {
                        startLightsFade();
                    } else {
                        startLights();
                    }
                }
            }
        }        

        if (_s.responsive) {
            var resizeTimer;
            window.addEventListener("resize", function () {
                clearTimeout(resizeTimer);

                resizeTimer = setTimeout(function () {
                    flashBox.refreshSize();
                }, 250);
            });

            window.onload = function () {
                flashBox.refreshSize();
            }

            if (_s.fonts.length > 0) {
                WebFont.load({
                    custom: {
                        families: _s.fonts
                    },
                    active: function () {
                        flashBox.refreshSize();
                    }
                });
            }

        }

        /* --- FUNCTIONS --- */
        function preload() {
            var promises = [];

            for (var key in _s.assets) {
                promises.push(new Promise(function (resolve, reject) {
                    var _key = key;
                    if (isEmpty(_s.assets[_key])) resolve();
                    var _img = document.createElement('img');
                    _img.src = _s.assets[_key];
                    _img.onload = function () {
                        _s.assets[_key] = _img;
                        resolve();
                    };
                }));
            }

            return Promise.all(promises);
        }

        function drawLight(light) {
            var x = light.shapeData[0];
            var y = light.shapeData[1];
            var d = light.shapeData[2];

            // paintShape({
            //     shape: 'square',
            //     shapeData: light.shapeData,
            //     fill: '#ff0000'
            // });

            if ('lightOn' in _s.assets && !isEmpty(_s.assets['lightOn'])
                && 'lightOff' in _s.assets && !isEmpty(_s.assets['lightOff'])) {
                c.drawImage(_s.assets['lightOff'], (x - d / 2), (y - d / 2), d, d);
                if (_s.fadeLights) {
                    c.save();
                    // c.globalAlpha = lightOpacity/100;
                    c.globalAlpha = ease(lightOpacity / 100);
                    if (light.on) c.drawImage(_s.assets['lightOn'], (x - d / 2), (y - d / 2), d, d);
                    c.restore();
                } else {
                    if (light.on) c.drawImage(_s.assets['lightOn'], (x - d / 2), (y - d / 2), d, d);
                }
            }
        }

        function createLights(side, obj) {
            if (side == 'top' || side == 'bottom') {
                startX = obj.gapHorizontal;
                endX = _s.canvasSettings.width - obj.gapHorizontal;
            }

            if (side == 'top') {
                startY = obj.edgeGap;
                endY = obj.edgeGap;
            }

            if (side == 'bottom') {
                startY = _s.canvasSettings.height - obj.edgeGap;
                endY = _s.canvasSettings.height - obj.edgeGap;
            }

            if (side == 'left' || side == 'right') {
                startY = obj.gapVertical;
                endY = _s.canvasSettings.height - obj.gapVertical;
            }

            if (side == 'left') {
                startX = obj.edgeGap;
                endX = obj.edgeGap;
            }

            if (side == 'right') {
                startX = _s.canvasSettings.width - obj.edgeGap;
                endX = _s.canvasSettings.width - obj.edgeGap;
            }

            var xChange = endX - startX;
            var yChange = endY - startY;

            var direction = xChange > yChange ? 'horizontal' : 'vertical';
            if (direction == 'horizontal') {

                obj.lightCount = 0;
                obj.margin = obj.minMargin;
                obj.dirChange = xChange;
                obj = calcLightCount(obj);
                _s.lightSettings.horizontalCount = obj.lightCount;

                var temp = [];
                for (var i = 0; i < obj.lightCount; i++) {
                    var shapeData = [];
                    shapeData.push(startX + (obj.lightDiam / 2) + (i * (obj.lightDiam + obj.margin)));
                    shapeData.push(startY);
                    shapeData.push(obj.lightDiam);

                    temp.push({ shapeData: shapeData, on: false });
                }
                if (side == 'bottom') temp = temp.reverse();
                lights = lights.concat(temp);

            } else if (direction == 'vertical') {
                obj.lightCount = 0;
                obj.margin = obj.minMargin;
                obj.dirChange = yChange;
                obj = calcLightCount(obj);
                _s.lightSettings.verticalCount = obj.lightCount;

                var temp = [];
                for (var i = 0; i < obj.lightCount; i++) {
                    var shapeData = [];
                    shapeData.push(startX);
                    shapeData.push(startY + (obj.lightDiam / 2) + (i * (obj.lightDiam + obj.margin)));
                    shapeData.push(obj.lightDiam);

                    temp.push({ shapeData: shapeData, on: false });
                }
                if (side == 'left') temp = temp.reverse();
                lights = lights.concat(temp);

            }

        }

        var calcLightSpawn = 0;
        var maxCalls = 0;
        function calcLightCount(obj) {
            if (calcLightSpawn > maxCalls) maxCalls = calcLightSpawn; //logging purposes

            obj.gap = obj.dirChange - (obj.lightCount * (obj.lightDiam + obj.margin));

            if (calcLightSpawn == 0) {
                if (obj.gap < (obj.lightDiam + obj.margin)) {
                    obj.traverse = 'down';
                } else {
                    obj.traverse = 'up';
                }
            }

            calcLightSpawn++;

            if (obj.traverse == 'up' && obj.gap > (obj.lightDiam + obj.margin)) {
                obj.lightCount++;
                obj = calcLightCount(obj);
            }

            if (obj.traverse == 'down' && obj.gap < (obj.lightDiam + obj.margin)) {
                obj.lightCount--;
                obj = calcLightCount(obj);
            }

            calcLightSpawn--;
            if (calcLightSpawn == 0) {
                //put leftover space into margin
                obj.margin += obj.gap / obj.lightCount;
                //eliminate the final margin by adding it to every other margin
                obj.margin += obj.margin / obj.lightCount;
            }
            return obj;
        }

        function paintShape(obj) {
            //set stroke
            if (Array.isArray(obj.stroke)) {
                var gradient = c.createLinearGradient((s.x + s.w / 2), s.y, (s.x + s.w / 2), (s.y + s.h));
                var divisions = 1 / (obj.stroke.length - 1);
                for (var i = 0; i < obj.stroke.length; i++) {
                    gradient.addColorStop(divisions * i, obj.stroke[i]);
                }
                c.strokeStyle = gradient;
            } else {
                c.strokeStyle = obj.stroke;
            }

            c.lineWidth = obj.strokeWeight;

            var s = makeShape(obj.shape, obj.shapeData);

            //if filling with image
            if (obj.fillImage) {
                var _pattern = c.createPattern(_s.assets[obj.fillImage], "repeat");
                c.fillStyle = _pattern;
            } else {
                //if filling with colour or gradient
                if (Array.isArray(obj.fill)) {
                    var gradient = c.createLinearGradient((s.x + s.w / 2), s.y, (s.x + s.w / 2), (s.y + s.h));
                    var divisions = 1 / (obj.fill.length - 1);
                    for (var i = 0; i < obj.fill.length; i++) {
                        gradient.addColorStop(divisions * i, obj.fill[i]);
                    }
                    c.fillStyle = gradient;
                } else {
                    c.fillStyle = obj.fill;
                }
            }

            //paint
            if ('fill' in obj || 'fillImage' in obj) c.fill();
            if ('stroke' in obj) c.stroke();
        }

        function makeSquare(x, y, d) {
            c.beginPath();
            c.rect((x - d / 2), (y - d / 2), d, d);
            c.closePath();

            //let further steps access properties about this shape
            return { w: d, h: d, x: x, y: y };
        }

        function makeCircle(x, y, d) {
            //stops us getting too crazy
            var min = d;
            if (d > min / 2) d = min / 2;

            c.beginPath();
            c.arc(x, y, d, 0, 2 * Math.PI);
            c.closePath();

            //let further steps access properties about this shape
            return { w: d, h: d, x: x, y: y };
        }

        function makeRoundedRectangle(w, h, x, y, r) {
            //stops us getting too crazy
            var min = Math.min(w, h);
            if (r > min / 2) r = min / 2;

            c.beginPath();

            //draws the shape
            c.arc((r + x), (r + y), r, 1 * Math.PI, 1.5 * Math.PI);
            c.lineTo((w - r + x), y);
            c.arc((w - r + x), r + y, r, 1.5 * Math.PI, 0);
            c.lineTo(w + x, (h - r + y));
            c.arc((w - r + x), (h - r + y), r, 0, 0.5 * Math.PI);
            c.lineTo(r + x, h + y);
            c.arc(r + x, (h - r) + y, r, 0.5 * Math.PI, 1 * Math.PI);
            c.lineTo(0 + x, r + y);
            c.closePath();

            //let further steps access properties about this shape
            return { w: w, h: h, x: x, y: y };
        }

        function makeShape(shape, shapeData) {
            if (shape == 'roundedRectangle') {
                var w = shapeData[0];
                var h = shapeData[1];
                var x = shapeData[2];
                var y = shapeData[3];
                var r = shapeData[4];
                return makeRoundedRectangle(w, h, x, y, r);
            }

            if (shape == 'circle') {
                var x = shapeData[0];
                var y = shapeData[1];
                var d = shapeData[2];
                return makeCircle(x, y, d);
            }

            if (shape == 'square') {
                var x = shapeData[0];
                var y = shapeData[1];
                var d = shapeData[2];
                return makeSquare(x, y, d);
            }
        }

        //---https://gist.github.com/gre/1650294
        function ease(t) {
            return t * (2 - t);
        }

        return flashBox;
    };

    //
    // Public APIs
    //

    return FlashBox;
});