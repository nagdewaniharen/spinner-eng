//assumes 8 segments in a ring - needs work to adjust this

//factory
function Spinwheel(options){
    var defaults = {
        el: '#spinwheel', //selector or element reference
        canvas_size: 700, //used for width and height
        fonts: [''], //wait for these fonts to load before render
        messageContainer: '#spinwheel-messages', //selector or element reference
        showMessages: true, //display a message after each spin
        graphicPath: 'img/', //where to look for images for the wheel
        graphics: { //images to be loaded before render
            bg: {file:'o_wheelBackground.png'},
            segments: [ //array allows for multi-ringed wheels
                {file:'o_wheelSegments.png'}
            ],
            spinBtn: {file:'o_wheelSpinButton.png'},
            lightOff: {file:'o_wheelLightOff.png'},
            lightOn: {file:'o_wheelLightOn.png'},
            arrow: {file:'o_arrow.png'}
        },
        components: {
            //settings for drawing each part of the wheel
            //key is connected to key used in graphics object
            bg: {
                rotate: 0, //0 - 360
                scale: 0.9, // 0 - 1
                rotateBy: 0 //0 - 360
            },
            spinBtn: {
                rotate: 0, //0 - 360
                scale: 0.2, // 0 - 1
                clickableScale: false, // 0 - 1
                text: "SPIN", //text to write ontop
                font: 'Arial',
                fontSize: 35,
                fontWeight: 400,
                fontColor: 'white',
                fontShadowColor: 'white',
                fontShadowBlur: 0,
                fontStrokeColor: 'rgba(0,0,0,0.4)',
                fontStrokeWeight: 5,
                fontOffsetX: 0,
                fontOffsetY: 0
            },
            segments: [ //array allows for multi-ringed wheels
                {
                    rotate: 0, //start angle (0 - 360)
                    rotateBy: 10, //spin speed (>0)
                    scale: 0.73, //0 - 1
                    textRadius: 0.78, //0 - 1
                    font: 'Arial',
                    fontSize: 24,
                    fontWeight: 400,
                    fontColor: 'black',
                    fontShadowColor: '',
                    fontShadowBlur: 0,
                    fontStrokeColor: '',
                    fontStrokeWeight: 0,
                    textPosition: 'short', // [long | short]
                    lineGap: -5
                }
            ],
            light: {
                count: 40,
                radius: 0.76, //0 - 1
                scale: 0.05, //0 - 1
                states: { //ability to tweak light animations here
                    start: {type: 'cycle', fadeSpread: 10, delay: 100},
                    spinning: {type: 'cycle', fadeSpread: 10, delay: 25},
                    end: {type: 'flash', delay: 150, endAfter: 3000}
                }
            },
            arrow: {
                rotate: 0, //0 - 360
                scale: 0.25, //0 - 1
                x: 0, //0 - 1
                y: 0.78 //0 - 1
            }
        },
        segmentLabels: [ //array allows for multi-ringed wheels
            [
            /*0*/ {text:["50%","MATCH"], isWin:true},
            /*1*/ {text:["TRY","AGAIN"]},
            /*2*/ {text:["10","CHANCES"], isWin:true},
            /*3*/ {text:["MYSTERY","PRIZE"], isWin:true, fontColor: 'white'},
            /*4*/ {text:["10","CHANCES"], isWin:true},
            /*5*/ {text:["TRY","AGAIN"]},
            /*6*/ {text:["50%","MATCH"], isWin:true},
            /*7*/ {text:["10","CHANCES"], isWin:true}
            ]
        ],
        spinTime: 3000, //how long to spin wheel before landing
        stages: ["0,1","0,2","0,3"], //segments to land on (in order) ["ringIndex, segmentIndex"]
        winAngle: 0 * 45, //at what angle the 'winning' segment should land (0 - 360)
        drawArrow: true, //draw the arrow graphic to the wheel
        shroudColour: 'rgba(0,0,0,0)', //dark overlay ontop of wheel graphics (useful for multi-ringed wheel)
        rotateSegmentsOnIdle: true, //slow rotation on idle
        hideSpinTextOnSpin: true,
        init: function(){console.log(this)},
        onSpin: function(){},
        onLand: function(){},
        messageShown: function(){},
        messageHidden: function(){}
    };

    //- if options provided to overwrite defaults then use them
    //- cater for components object as it is nested
    if('components' in options){
        for(var key in options.components){
            if(Array.isArray(options.components[key])){
                options.components[key] = Object.assign([], defaults.components[key], options.components[key]);
            } else {
                options.components[key] = Object.assign({}, defaults.components[key], options.components[key]);
            }
        }
        options.components = Object.assign({}, defaults.components, options.components);
    }
    options = Object.assign({}, defaults, options);

    //
    //---CREATE VARIABLES AND ELEMENTS
    //

    //prepare variables
    var $$ = {o:options};
    var animationLoop, loopStartTime, canvasItems, temp, rootEl, messageContainer;
    if(typeof $$.o.el == 'string'){rootEl = document.querySelector($$.o.el);}
    else {rootEl = $$.o.el;}
    if(typeof $$.o.messageContainer == 'string'){messageContainer = document.querySelector($$.o.messageContainer);}
    else {messageContainer = $$.o.messageContainer;}
    var canvas_w = $$.o.canvas_size;
    var canvas_h = $$.o.canvas_size;
    var fontsLoaded = false;

    //setup canvas
    canvas = document.createElement('canvas');
    canvas.setAttribute("width",canvas_w);
    canvas.setAttribute("height",canvas_h);
    rootEl.style.width = canvas_w + "px";
    canvasItems = {};

    //background canvas
    temp = canvas.cloneNode();
    canvasItems['bg'] = {canvas:temp, ctx:temp.getContext('2d')};

    //canvas for each ring of segments
    var segments = $$.o.components.segments;
    for(var i=0; i<segments.length; i++){
        temp = canvas.cloneNode();
        canvasItems['seg_'+i] = {canvas:temp, ctx:temp.getContext('2d')};
    }

    //foreground canvas
    temp = canvas.cloneNode();
    canvasItems['fg'] = {canvas:temp, ctx:temp.getContext('2d')};

    //add canvases to page
    for(var key in canvasItems){
        canvasItems[key].canvas.setAttribute('data-layer',key);
        rootEl.appendChild(canvasItems[key].canvas);
    }

    //
    //---CREATE FUNCTIONS
    //

    //turn '_' delimited string into nested object call
    $$.getItemByString = function(key, obj){
        if(obj === undefined) obj = {};
        var arr = key.split('_');
        for(var k=0; k<arr.length; k++){
            obj = obj[arr[k]];
        }
        return obj;
    };

    //turn a delimted string into an array of integers
    $$.stringToIntArray = function(str, delim){
        if(delim === undefined) delim = ',';
        var arr = str.split(delim);
        for(var i=0; i<arr.length; i++){
            arr[i] = parseInt(arr[i]);
        }
        return arr;
    };

    $$.doInitialDraw = function(){
        $$.drawSegments();

        //clickable spin button
        var spinBtnEl = document.createElement('div');
        spinBtnEl.classList.add('btn-spin');
        spinBtnEl.classList.add('spin-button');
        var component = $$.o.components['spinBtn'];

        if('clickableScale' in component && component.clickableScale !== false) {
            var scale = component.clickableScale;
        } else {
            var scale = component.scale;
        }
        var img = $$.o.graphics['spinBtn'].img;
        var w = canvas_w * scale;
        var h = img.height * (w / img.width);
        w = w / canvas_w * 100;
        h = h / canvas_h * 100;

        spinBtnEl.style.width = w + '%';
        spinBtnEl.style.height = h + '%';

        rootEl.appendChild(spinBtnEl);

        var _btns = document.querySelectorAll('.btn-spin');
        for(var i=0; i<_btns.length; i++){
            _btns[i].addEventListener('click',$$.spin);
        }

        var _btns = document.querySelectorAll('.btn-hide-message');
        for(var i=0; i<_btns.length; i++){
            _btns[i].addEventListener('click',$$.hideMessage);
        }

        //start a fresh animation loop
        animationLoop = window.requestAnimationFrame(function(timestamp){
            step(timestamp, true);
        });

        //injectable function
        (function(){$$.o.init();})()
    };

    $$.initWheel = function(){
        $$.o.state = 'start';
        $$.o.lightState = 'start';
        $$.o.currentStage = 0;
        $$.o.segmentAngle = 360 / $$.o.segmentLabels[0].length;
        var _seg_index = $$.stringToIntArray($$.o.stages[$$.o.currentStage]);
        var component = $$.o.components.segments;
        for(var i=0; i<component.length; i++){
            component[i].revolutions = 0;
            component[i].showShroud = true;
        }
        component[_seg_index[0]].showShroud = false;
    };

    $$.initSegments = function(index){
        var component = $$.o.components.segments[index];
        var labels = $$.o.segmentLabels[index];

        //store for later
        component.startAngle = component.rotate;

        //set initial rotation for segment labels
        for(var k=0; k<labels.length; k++){
            labels[k].rotate = k*(360/labels.length) - 90 + component.rotate;
        }
    };

    $$.initLights = function(){
        var component = $$.o.components.light;
        component.nextIndex = 0;
        component.elapsed = 0;
        component.warmup = true;
        $$.o.lightsArray = [];
        for(var i=0; i<component.count; i++){
            $$.o.lightsArray.push({onOpacity:0, fadeDir:1});
        }

        $$.o.components.light.startTime = 0;
    };

    $$.setLightState = function(elapsed, state){
        $$.o.lightState = state;
        $$.o.components.light.startTime = elapsed;
    };

    $$.spin = function(){
        if($$.o.state != 'start') return;
        $$.o.state = 'start-spin';

        $$.drawSegments(); //re-draw keeps everything locked in correct positions
        $$.hideMessage();

        //injectible function
        (function(){$$.o.onSpin($$.o.currentStage);})()
    };

    $$.hideMessage = function(){
        //if using progress messages, hide them now
        if($$.o.showMessages){
            var messages = messageContainer.querySelectorAll('.message');
            for(var i=0; i<messages.length; i++){
                messages[i].classList.remove('active');
            }
            messageContainer.classList.remove('active');
            (function () { $$.o.messageHidden($$.o.currentStage > 0 ? $$.o.currentStage-1 : 0); })()
        }
    };

    //apply adjustments to a component (for movement purposes)
    //just handles rotation at this point
    $$.transformImage = function(key){
        var component = $$.o.components[key];
        if('rotateBy' in component){
            component.rotate += component.rotateBy;
            component.rotate = component.rotate % 360;
        }
    };

    //draw an image (graphic) based on attributes specified in linked component
    $$.drawImage = function(key, _ctx, transform){
        if(transform === undefined) transform = true;
        if(_ctx === undefined) _ctx = canvasItems['bg'].ctx;
        _ctx.save();

        var component = $$.getItemByString(key, $$.o.components);

        //draw from centre of canvas
        var centerX = canvas_w / 2;
        var centerY = canvas_h / 2;
        var x = 'x' in component ? canvas_w * component.x : 0;
        var y = 'y' in component ? canvas_w * component.y : 0;
        if(transform) _ctx.translate(centerX + x/2, centerY - y/2); //make sure rotation happens from center of symbol
        if(transform) _ctx.rotate(component.rotate * Math.PI / 180);

        //get image and size dimensions based on scale
        img = $$.getItemByString(key, $$.o.graphics).img;
        var w = canvas_w * component.scale;
        var scale = w / img.width;
        var h = img.height * scale;

        //draw the image
        _ctx.drawImage(img, -(w)/2, -(h)/2, w, h);

        _ctx.restore();

        var canDrawText = true;
        if($$.o.hideSpinTextOnSpin && key == 'spinBtn' && $$.o.state != 'start'){
            canDrawText = false;
        }

        if('text' in component && canDrawText){
            _ctx.save();
            _ctx.translate(centerX, centerY);

            _ctx.textBaseline = "middle";
            _ctx.textAlign = "center";

            // Allowing line breaks in text if placed in an array
            if (Array.isArray(component.text)) {
                for (var j = 0; j < component.text.length; j++) {
                    var _y = component.fontSize * j;
                    $$.drawText(component, component.text[j], 0, _y, _ctx);
                }
            } else {
                $$.drawText(component, component.text, 0, 0, _ctx);
            }
            
            _ctx.restore();
        }
    };

    //make the wheel rotate by increasing it's rotation
    $$.moveWheel = function(index, rotateBy){
        if(index === undefined) index = 0;
        var labels = $$.o.segmentLabels;
        var component = $$.o.components.segments[index];
        if(rotateBy === undefined) rotateBy = ('rotateBy' in component) ? component.rotateBy : 0;

        if(rotateBy > 0){
            //keep rotation within range 0 - 360
            var newRotation = (component.rotate + rotateBy) % 360;
            component.rotate = newRotation;
            //keep track of revolutions past 360
            if(newRotation < component.rotate) component.revolutions ++;

            //keep segment labels 'glued' to wheel
            for(var i=0; i<labels.length; i++){
                labels[i].rotate = (labels[i].rotate + rotateBy) % 360;
            }
        }
    };

    //draw the segment labels to the segments on the wheel
    $$.drawSegments = function(){
        var segments = $$.o.components.segments;
        //for each ring, draw the segment labels
        for(var k=0; k<segments.length; k++){
            var component = segments[k];
            var labels = $$.o.segmentLabels[k];
            var _ctx = canvasItems['seg_'+k].ctx;

            //reset some things
            _ctx.clearRect(0, 0, canvas_w, canvas_h);
            $$.initSegments(k);
            canvasItems['seg_'+k].canvas.style.transform = 'rotate(0deg)';
            $$.drawImage('segments_'+k, _ctx);

            //draw from centre of canvas
            var centerX = canvas_w / 2;
            var centerY = canvas_h / 2;
            var radius = canvas_w * component.scale * component.textRadius / 2;
            _ctx.textBaseline = "middle";
            _ctx.textAlign = "center";
            var mode = component.textPosition;
            var lineGap = component.lineGap;

            //for each label in the ring
            for(var i=0; i<labels.length; i++){
                var item = labels[i];

                _ctx.save();

                _ctx.translate(centerX, centerY); //make sure rotation happens from centre
                if(mode == 'short') item.rotate += 90; //put labels on correct slices
                _ctx.rotate(item.rotate * Math.PI / 180);

                if(mode == 'long'){
                    //horizontal text
                    _ctx.translate(radius, 0);
                } else if(mode == 'short'){
                    //text on edges
                    _ctx.translate(0, -radius);
                }

                //use any text label overwrites
                _style = Object.assign({}, component, item);

                if('text' in item){
                    var textStart = (item.text.length - 1) * (component.fontSize / 2) * -1 - lineGap/2;
                    //draw each string in array to a new line
                    for(var j=0; j<item.text.length; j++){
                        var _y = textStart + (component.fontSize+lineGap) * j;
                        $$.drawText(_style, item.text[j], 0, _y, _ctx);
                    }
                } else if('image' in item){
                    $$.drawImage(item.image, _ctx, false);
                }

                _ctx.restore();
            }

            //draw overlay ontop of rings (useful for multi-ring)
            if(component.showShroud){
                _ctx.save();
                _ctx.translate(centerX, centerY);

                var w = canvas_w * component.scale;
                _ctx.arc(0, 0, w/2, 0, 2 * Math.PI, false);
                _ctx.fillStyle = $$.o.shroudColour;
                _ctx.fill();
                _ctx.restore();
            }
        }
    };

    //general function for drawing text in different positions and styles
    $$.drawText = function(component, text, x, y, _ctx){
        if(_ctx === undefined) _ctx = canvasItems['bg'].ctx;
        
        if(!('font' in component) || !fontsLoaded) component.font = 'sans-serif';
        _ctx.font = component.fontWeight + " " + component.fontSize + "px " + component.font;
        _ctx.miterLimit = 2;

        if('fontOffsetX' in component) { x += component.fontOffsetX; }
        if('fontOffsetY' in component) { y += component.fontOffsetY; }

        //text shadow
        if('fontShadowBlur' in component && component.fontShadowBlur > 0){
            _ctx.save();
            if('fontShadowColor' in component){
                _ctx.shadowColor = component.fontShadowColor;
                _ctx.strokeStyle = component.fontShadowColor;
            }
            if('fontStrokeWeight' in component && component.fontStrokeWeight > 0){
                _ctx.lineWidth = component.fontStrokeWeight - 1;
            }
            if('fontShadowBlur' in component) _ctx.shadowBlur = component.fontShadowBlur;
            _ctx.strokeText(text, x, y);
            _ctx.restore();
        }

        //text outline
        if('fontStrokeWeight' in component && component.fontStrokeWeight > 0){
            _ctx.save();
            if('fontStrokeWeight' in component) _ctx.lineWidth = component.fontStrokeWeight;
            if('fontStrokeColor' in component) _ctx.strokeStyle = component.fontStrokeColor;
            _ctx.strokeText(text, x, y);
            _ctx.restore();
        }

        _ctx.save();
            if (Array.isArray(component.fontColor)) {
                var gradient = _ctx.createLinearGradient(0, y - 5, 0, y + 5);
                for (var i = 0; i < component.fontColor.length; i++) {
                    gradient.addColorStop(i, component.fontColor[i]);
                }                
                _ctx.fillStyle = gradient;
            } else {
                _ctx.fillStyle = component.fontColor;
            }                                    
            _ctx.fillText(text, x, y);
        _ctx.restore();
    }

    $$.drawLights = function(){
        var component = $$.o.components.light;
        var lights = $$.o.lightsArray;
        var _ctx = canvasItems['fg'].ctx;

        //draw each individual light
        for(var i=0; i<lights.length; i++){
            _ctx.save();

            //get image and size dimensions based on scale
            //assumed that both lightOn and lightOff have same dimensions
            var img = $$.o.graphics['lightOff'].img;
            var w = canvas_w * component.scale;
            var scale = w / img.width;
            var h = img.height * scale;

            //draw from centre of canvas
            var centerX = canvas_w / 2;
            var centerY = canvas_h / 2;
            _ctx.translate(centerX, centerY);
            _ctx.rotate((360 / component.count * i) * Math.PI / 180);

            //draw lightOff
            _ctx.drawImage(img, (-w/2) + (canvas_w/2 * component.radius), (-h/2), w, h);

            var img = $$.o.graphics['lightOn'].img;
            _ctx.globalAlpha = lights[i].onOpacity; //get lightOn opacity

            //draw lightOn ontop of lightOff
            _ctx.drawImage(img, (-w/2) + (canvas_w/2 * component.radius), (-h/2), w, h);

            _ctx.restore();
        }
    };

    //change the state of each light
    $$.cycleLights = function(elapsed){
        var component = $$.o.components.light;
        var lights = $$.o.lightsArray;
        var state = $$.o.lightState;
        var settings = component.states[state];
        elapsed = elapsed - component.startTime;

        if(settings.type == 'flash'){
            //flash animation
            var progress = Math.ceil(elapsed % settings.delay);
            var opacity = progress / settings.delay; //get new opacity

            for(var i=0; i<lights.length; i++){
                if(progress < component.elapsed) {
                    if('endAfter' in settings && elapsed > settings.endAfter && lights[i].fadeDir == 0){
                        //return lights to their 'idle' cycle animation after x amount of time
                        $$.initLights();
                        $$.setLightState(elapsed, 'start');
                        return;
                    } else {
                        //direction flip for opacity
                        lights[i].fadeDir = lights[i].fadeDir == 0 ? 1 : 0;
                    }
                }

                //set new opacity
                if(lights[i].fadeDir == 1){
                    lights[i].onOpacity = opacity;
                } else {
                    lights[i].onOpacity = 1 - opacity;
                }
            }
        } else if(settings.type == 'cycle') {
            //cycle animation
            var opacityStep = (1 / settings.fadeSpread);

            if(component.warmup){
                //warmup so lights are gradually introduced into existence
                for(var i=0; i<settings.fadeSpread; i++){
                    if(i <= component.nextIndex){
                        lights[i].onOpacity = i*opacityStep;
                    }
                    if(component.nextIndex == settings.fadeSpread) {
                        component.warmup = false;
                    }
                }
            } else {
                //warmup done
                //set opacity of x amount of lights
                for(var i=0; i<settings.fadeSpread; i++){
                    var index = component.nextIndex - i;
                    if(index < 0) index = lights.length + index;
                    lights[index].onOpacity = 1 - opacityStep * i; //set new opacity
                }
            }

            //move the lights along if x amount of time has passed
            if(elapsed % settings.delay < component.elapsed){
                if(component.nextIndex + 1 < lights.length){
                    component.nextIndex++;
                } else {
                    component.nextIndex = 0;
                }
            }
        }

        //keep track of time
        component.elapsed = elapsed % settings.delay;
    };

    $$.prepareNextSpin = function(){
        var segments = $$.o.components.segments;
        for(var i=0; i<segments.length; i++){
            //reset revolutions (times gone past 360)
            segments[i].revolutions = 0;
        }

        if($$.o.currentStage + 1 < $$.o.stages.length){
            //if there are more configured segments to land on
            $$.o.state = 'start';
            $$.o.currentStage++;
        } else {
            //all segments have been landed on, we're done, no more spinning
            $$.o.state = 'stopped';
        }
    };

    //
    //---START DOING THINGS
    //

    //preload images from graphics object
    var promises = [];
    for(var key in $$.o.graphics){
        var graphic = $$.o.graphics[key];
        var _images = [];

        if(Array.isArray(graphic)){
            //handle nested items (i.e. segments)
            for(var i=0; i<graphic.length; i++){
                var _graphic = graphic[i];
                _images.push({src:$$.o.graphicPath + _graphic.file, key:key+"_"+i});
            }
        } else {
            //non nested (normal) items
            _images.push({src:$$.o.graphicPath + graphic.file, key:key});
        }

        //create a promise for each image and resolve it once it is loaded
        for(var i=0; i<_images.length; i++){
            promises.push(new Promise(function(resolve, reject){
                (function(item){
                    var img = new Image();
                    img.src = item.src;
                    img.onerror = function(){ reject(img); }
                    img.onload = function(){ resolve({img:img,key:item.key}); }
                })(_images[i]);
            }));
        }
    }

    //all images for the wheel are loaded (all promises resolved)
    Promise.all(promises).then(function(r){
        //store loaded images to be accessed later
        for(var i=0; i<r.length; i++){
            var item = r[i];
            $$.getItemByString(item.key, $$.o.graphics)['img'] = item.img;
        }

        $$.initWheel();
        $$.initLights();

        //cancel animation loop if it is running
        if(animationLoop) window.cancelAnimationFrame(animationLoop);

        if('fonts' in $$.o && $$.o.fonts.length > 0){
            //wait for any fonts to be loaded
            WebFont.load({
                custom: {
                    families: $$.o.fonts
                },
                active: function(){
                    //fonts loaded, draw the wheel
                    fontsLoaded = true;
                    $$.doInitialDraw();
                },
                fontinactive: function(fontname){
                    //one or more fonts not loaded, draw the wheel with default font
                    $$.doInitialDraw();
                    throw new Error('FONT ' + fontname + ' COULD NOT BE LOADED');
                }
            });
        } else {
            //no fonts to be loaded, draw the wheel
            $$.doInitialDraw();
        }
    }).catch(function(e){
        //notify if images aren't loaded or if something bad happened
        console.log(e);
    });

    //
    //---ANIMATE
    //

    //main animation loop (runs at screen refresh rate i.e. 60 times per second)
    function step(timestamp, restart) {
        if(loopStartTime === undefined || restart) loopStartTime = timestamp;
        var elapsed = timestamp - loopStartTime;

        //clear the canvas so we can draw the next frame
        canvasItems['fg'].ctx.clearRect(0, 0, canvas_w, canvas_h);
        canvasItems['bg'].ctx.clearRect(0, 0, canvas_w, canvas_h);

        $$.drawImage('spinBtn', canvasItems['fg'].ctx);
        $$.drawImage('bg', canvasItems['bg'].ctx);

        //if lights, update them and draw them
        if($$.o.components.light.count > 0){
            $$.cycleLights(elapsed);
            $$.drawLights();
        }

        if($$.o.drawArrow) $$.drawImage('arrow', canvasItems['fg'].ctx);

        //i.e. spinning background
        $$.transformImage('bg');

        //work with the current ring of segments
        //_seg_index[0] == ring | _seg_index[1] == segment to land on
        var _seg_index = $$.stringToIntArray($$.o.stages[$$.o.currentStage]);
        var segments = $$.o.components.segments[_seg_index[0]];
        canvasItems['seg_'+_seg_index[0]].canvas.style.transform = 'rotate('+(segments.rotate - segments.startAngle)+'deg)';

        if($$.o.state == 'start-spin'){
            //if spin of wheel triggered
            $$.o.spinStart = timestamp;

            if($$.o.lightState == 'end'){
                $$.initLights();
            }

            $$.o.state = 'spinning';
            $$.setLightState(elapsed, 'spinning');
        }

        //if wheel is spinning and has been been for x amount of time, let's get ready to stop it
        if($$.o.state == 'spinning' && timestamp - $$.o.spinStart > $$.o.spinTime){
            var _currentAngle = segments.revolutions * 360 + segments.rotate;
            var offset = _currentAngle % 360;
            var endAngle = 360 - ($$.o.segmentAngle * _seg_index[1]) - offset + $$.o.winAngle;
            endAngle = endAngle % 360;
            if(endAngle < 0) endAngle += 360;
            // console.log("C:"+_currentAngle+" O:"+offset+" E:"+endAngle+" T:"+(endAngle+_currentAngle));

            //we want to stop the wheel a certain distance before the segment to land on
            //so that there is enough space left to animate the stop
            if(endAngle > 45 && endAngle < 90) {
                $$.o.state = 'stopping';
                segments._rotate = segments.rotate;
                segments._timeStart = timestamp;
                segments._changeBy = Math.abs(endAngle);
            }
        }

        //if we are in the process of stopping the wheel
        if($$.o.state == 'stopping'){
            var _elapsed = timestamp - segments._timeStart;
            var _timeToStop = 1;

            //if stop animation duration has not been reached
            if(_elapsed/1000 <= _timeToStop){
                //calculate next position
                var change = easeOutBack(_elapsed/1000, segments._rotate, segments._changeBy, _timeToStop) - segments.rotate;
                //apply next position to ring of segments
                segments.rotate += change;

                //apply next position to segment labels
                var labels = $$.o.segmentLabels;
                for(var i=0; i<labels.length; i++){
                    labels[i].rotate += change;
                }
            } else { //stop animation is done
                //injectible function
                (function(){$$.o.onLand($$.o.currentStage);})()

                var segment = $$.o.segmentLabels[_seg_index[0]][_seg_index[1]];

                if('isWin' in segment && segment.isWin == true){
                    $$.setLightState(elapsed, 'end');
                } else {
                    $$.setLightState(elapsed, 'start');
                }

                $$.o.state = 'stopped';

                //wait some time before showing progress message and / or allowing next spin
                window.setTimeout(function(){
                    if($$.o.showMessages){
                        var _message = messageContainer.querySelectorAll('.message')[$$.o.currentStage];
                        _message.classList.add('active');
                        messageContainer.classList.add('active');
                        (function(){$$.o.messageShown($$.o.currentStage);})()
                    }

                    if($$.o.currentStage+1 < $$.o.stages.length){
                        var _seg_index_next = $$.stringToIntArray($$.o.stages[$$.o.currentStage+1])
                        $$.o.components.segments[_seg_index_next[0]].showShroud = false;
                        $$.drawSegments();
                    }

                    $$.prepareNextSpin();
                },1000);
            }
        } else if($$.o.state == 'spinning') {
            //if the wheel is still spinning then update position
            $$.moveWheel(_seg_index[0]);
        }

        //if wheel is idle and should spin slowly, then update it's position
        if($$.o.state == 'start' && $$.o.rotateSegmentsOnIdle){
            $$.moveWheel(_seg_index[0], 0.3);
        }

        //run the animation loop again
        animationLoop = window.requestAnimationFrame(step);
    }

    //account for time lost while page not focused
    //--very important, without this things disappear / animate weirdly
    //--this is because window.requestAnimationFrame only runs when page is focused
    var timestampHidden;
    document.addEventListener('visibilitychange', function(){
        if(document['hidden']){
            //track time at which page focus was lost
            timestampHidden = new Date().getTime();
        } else {
            //get time between page focus lost and page focus re-gained (time lost)
            var difference = new Date().getTime() - timestampHidden;

            //on return to page, add time lost to animation timers
            loopStartTime += difference;
            var segments = $$.o.components.segments;
            for(var i=0; i<segments.length; i++){
                segments[i]._timeStart += difference;
            }
        }
    }, false);

    return $$;
}

//
//---MISC HELPER FUNCTIONS
//

//t = elapsed time (seconds)
//b = current value
//c = amount to change value by (+/-)
//d = duration to change value over (seconds)
function easeOutBack(t, b, c, d) {
    s = 4;
    return c * ((t = t / d - 1) * t * ((s + 1) * t + s) + 1) + b;
}

function easeInOutCubic(t, b, c, d) {
    if ((t/=d/2) < 1) return c/2*t*t*t + b;
    return c/2*((t-=2)*t*t + 2) + b;
}

function easeLinear (t, b, c, d) {
    return c * t / d + b;
}

function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

function randomInt(min, max) { // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function isBlank(str) {
    return (!str || /^\s*$/.test(str));
}

//forEach polyfill
window.NodeList&&!NodeList.prototype.forEach&&(NodeList.prototype.forEach=function(o,t){t=t||window;for(var i=0;i<this.length;i++)o.call(t,this[i],i,this)});
//Object.assign polyfill
"function"!=typeof Object.assign&&Object.defineProperty(Object,"assign",{value:function(e,t){"use strict";if(null==e)throw new TypeError("Cannot convert undefined or null to object");for(var n=Object(e),r=1;r<arguments.length;r++){var o=arguments[r];if(null!=o)for(var c in o)Object.prototype.hasOwnProperty.call(o,c)&&(n[c]=o[c])}return n},writable:!0,configurable:!0});