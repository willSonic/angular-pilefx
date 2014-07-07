/**
 * @ngdoc overview
 * @name wilsonic-pileFx
 *
 * @description
 * stacks of tiles that animates to position on grid and size when triggered to open and return to pile when triggered to close
 *
 */
angular.module('wilsonic.pileFx-Directive', ['ui.bootstrap.transition'])
    .controller('PileFxController', ['$scope', '$element', '$timeout', '$transition', function ($scope, $element, $timeout, $transition, $window) {
        $scope.pileDefaults = {
            // space between the tiles
            gutter : 70,
            // the rotations degree for the 2nd and 3rd tile
            // (to give a more realistic pile effect)
            pileAngles : 5,
            // animation settings for the clicked pile's tiles
            pileAnimation : {
                openSpeed : 400,
                openEasing : 'ease-in-out', // try this :) 'cubic-bezier(.47,1.34,.9,1.03)',
                closeSpeed : 400,
                closeEasing : 'ease-in-out'
            },
            // animation settings for the other piles
            otherPileAnimation : {
                openSpeed : 400,
                openEasing : 'ease-in-out',
                closeSpeed : 350,
                closeEasing : 'ease-in-out'
            },
            // delay for each tile of the pile
            delay : 50,
            // random rotation for the tiles once opened
            randomAngle : false
        };

        var self = this;
        var spread = false;
        var tiles = self.tiles = $scope.tiles =[];
        var destroyed = false;

      //  this.options = $.extend( true, {}, $.Stapel.defaults, options );
        _config();
        _layout();
        _initEvents();


        function _config() {

            // css transitions support
            this.support = Modernizr.csstransitions;

            var transEndEventNames = {
                    'WebkitTransition' : 'webkitTransitionEnd',
                    'MozTransition' : 'transitionend',
                    'OTransition' : 'oTransitionEnd',
                    'msTransition' : 'MSTransitionEnd',
                    'transition' : 'transitionend'
                },
                transformNames = {
                    'WebkitTransform' : '-webkit-transform',
                    'MozTransform' : '-moz-transform',
                    'OTransform' : '-o-transform',
                    'msTransform' : '-ms-transform',
                    'transform' : 'transform'
                };

            if( this.support ) {

                this.transEndEventName = transEndEventNames[ Modernizr.prefixed( 'transition' ) ] + '.cbpFWSlider';
                this.transformName = transformNames[ Modernizr.prefixed( 'transform' ) ];

            }

            // true if one pile is opened
            this.spread = false;

            // the li's
            //this.tiles = $element.children( 'li' ).hide();

            // close pile
           // this.close = $( '#tp-close' );

        }

        function _getSize() {

            this.elementWidth = $element.width();

        }

        function _initEvents() {

            var self = this;
            $window.on( 'debouncedresize.stapel', function() { self._resize(); } );
            this.tiles.on( 'click.stapel', function() {

                var $tile = $( this );

                if( !self.spread && $tile.data( 'isPile' ) ) {

                    self.spread = true;
                    self.pileName = $tile.data( 'pileName' );
                    self.options.onBeforeOpen( self.pileName );
                    self._openPile();

                    return false;

                }

            } );

        }

        function _layout() {

            /*
             piles() : save the tiles info in a object with the following structure:

             this.piles = {

             pileName : {

             // elements of this pile (note that an element can be also in a different pile)
             // for each element, the finalPosition is the position of the element when the pile is opened
             elements : [
             { el : HTMLELEMENT, finalPosition : { left : LEFT, top : TOP } },
             {},
             {},
             ...
             ],
             // this is the position of the pile (all elements of the pile) when the pile is closed
             position : { left : LEFT, top : TOP },
             index : INDEX
             },

             // more piles
             ...

             }
             */
            this._piles();

            // tiles width & height
            //TODO Will all tiles will not have the same height and width
            // assuming here that all tiles have the same width and height
            this.tilesize = { width : this.tiles.width() , height : this.tiles.height() };

            // remove original elements
            this.tiles.remove();

            // applies some initial style for the tiles
            this._setInitialStyle();

            $element.css( 'min-width', this.tilesize.width + this.options.gutter );

            // gets the current ul size (needed for the calculation of each tile's position)
            this._getSize();

            // calculate and set each Pile's elements position based on the current ul width
            // this function will also be called on window resize
            this._setTilesPosition();

            // new tiles
            this.tiles = $element.children( 'li' ).show();
            // total tiles
            this.tilesCount	= this.tiles.length;

        }
        function _piles() {

            this.piles = {};
            var pile, self = this, idx = 0;
            this.tiles.each( function() {

                var $tile = $( this ),
                    tilePile = $tile.attr( 'data-pile' ) || 'nopile-' + $tile.index(),
                    attr = tilePile.split( ',' );

                for( var i = 0, total = attr.length; i < total; ++i ) {

                    var pileName = $.trim( attr[i] );
                    pile = self.piles[ pileName ];

                    if( !pile ) {

                        pile = self.piles[ pileName ] = {
                            elements : [],
                            position : { left : 0, top : 0 },
                            index : idx
                        };

                        ++idx;

                    }

                    var clone = $tile.clone().get(0);
                    pile.elements.push( { el : clone, finalPosition : { left : 0, top : 0 } } );
                    $( clone ).appendTo( self.el );

                }

            } );

        }

        function _setInitialStyle() {

            for( var pile in this.piles ) {

                var p = this.piles[pile];

                for( var i = 0, len = p.elements.length; i < len; ++i ) {

                    var $el = $( p.elements[i].el ),
                        styleCSS = { transform : 'rotate(0deg)' };

                    this._applyInitialTransition( $el );

                    if( i === len - 2 ) {
                        styleCSS = { transform : 'rotate(' + this.options.pileAngles + 'deg)' };
                    }
                    else if( i === len - 3 ) {
                        styleCSS = { transform : 'rotate(-' + this.options.pileAngles + 'deg)' };
                    }
                    else if( i !== len - 1 ) {
                        var extraStyle = { visibility : 'hidden' };
                        $el.css( extraStyle ).data( 'extraStyle', extraStyle );
                    }
                    else if( pile.substr( 0, 6 ) !== 'nopile' ) {
                        $el.data( 'front', true ).append( '<div class="tp-title"><span>' + pile + '</span><span>' + len + '</span></div>' );
                    }

                    $el.css( styleCSS ).data( {
                        initialStyle : styleCSS,
                        pileName : pile,
                        pileCount : len,
                        shadow : $el.css( 'box-shadow' ),
                        isPile : pile.substr( 0, 6 ) === 'nopile' ? false : true
                    } );

                }

            }

        }

        function _applyInitialTransition( $el ) {

            if( this.support ) {
                $el.css( 'transition', 'left 400ms ease-in-out, top 400ms ease-in-out' );
            }

        }

        function _setTilesPosition() {

            var accumL = 0, accumT = 0,
                l, t, ml = 0,
                lastTileTop = 0;

            for( var pile in this.piles ) {

                var p = this.piles[pile],
                    stepW = this.tilesize.width + this.options.gutter,

                    accumIL = 0, accumIT = 0, il, it;

                if( accumL + stepW <= this.elementWidth ) {

                    l = accumL;
                    t = accumT;
                    accumL += stepW;

                }
                else {

                    if( ml === 0 ) {
                        ml = Math.ceil( ( this.elementWidth - accumL + this.options.gutter ) / 2 );
                    }

                    accumT += this.tilesize.height + this.options.gutter;
                    l = 0;
                    t = accumT;
                    accumL = stepW;

                }

                p.position.left = l;
                p.position.top = t;

                for( var i = 0, len = p.elements.length; i < len; ++i ) {

                    var elem = p.elements[i],
                        fp = elem.finalPosition;

                    if( accumIL + stepW <= this.elementWidth ) {

                        il = accumIL;
                        it = accumIT;
                        accumIL += stepW;

                    }
                    else {

                        accumIT += this.tilesize.height + this.options.gutter;
                        il = 0;
                        it = accumIT;
                        accumIL = stepW;

                    }

                    fp.left = il;
                    fp.top = it;

                    var $el = $( elem.el );

                    if( pile !== this.pileName ) {

                        $el.css( { left : p.position.left, top : p.position.top } );

                    }
                    else {

                        lastTileTop = elem.finalPosition.top;
                        $el.css( { left : elem.finalPosition.left, top : lastTileTop } );

                    }

                }

            }

            // the position of the tiles will influence the final margin left value and height for the ul
            // center the ul
            lastTileTop = this.spread ? lastTileTop : accumT;
            $element.css( {
                marginLeft : ml,
                height : lastTileTop + this.tilesize.height
            } );

        }
        function _openPile() {

            if( !this.spread ) {
                return false;
            }

            // final style
            var fs;
            for( var pile in this.piles ) {

                var p = this.piles[ pile ], cnt = 0;

                for( var i = 0, len = p.elements.length; i < len; ++i ) {

                    var elem = p.elements[i],
                        $tile = $( elem.el ),
                        $img = $tile.find( 'img' ),
                        styleCSS = pile === this.pileName ? {
                            zIndex : 9999,
                            visibility : 'visible',
                            transition : this.support ? 'left ' + this.options.pileAnimation.openSpeed + 'ms ' + ( ( len - i - 1 ) * this.options.delay ) + 'ms ' + this.options.pileAnimation.openEasing + ', top ' + this.options.pileAnimation.openSpeed + 'ms ' + ( ( len - i - 1 ) * this.options.delay ) + 'ms ' + this.options.pileAnimation.openEasing + ', ' + this.transformName + ' ' + this.options.pileAnimation.openSpeed + 'ms ' + ( ( len - i - 1 ) * this.options.delay ) + 'ms ' + this.options.pileAnimation.openEasing : 'none'
                        } : {
                            zIndex : 1,
                            transition : this.support ? 'opacity ' + this.options.otherPileAnimation.closeSpeed + 'ms ' + this.options.otherPileAnimation.closeEasing : 'none'
                        };

                    if( pile === this.pileName ) {

                        if( $tile.data( 'front' ) ) {
                            $tile.find( 'div.tp-title' ).hide();
                        }

                        if( i < len - 1  ) {
                            $img.css( 'visibility', 'visible' );
                        }

                        fs = elem.finalPosition;
                        fs.transform = this.options.randomAngle && i !== p.index ? 'rotate(' + Math.floor( Math.random() * ( 5 + 5 + 1 ) - 5 ) + 'deg)' : 'none';

                        if( !this.support ) {
                            $tile.css( 'transform', 'none' );
                        }

                        // hack: remove box-shadow while animating to prevent the shadow stack effect
                        if( i < len - 3 ) {
                            $tile.css( 'box-shadow', 'none' );
                        }

                    }
                    else if( i < len - 1  ) {
                        $img.css( 'visibility', 'hidden' );
                    }

                    $tile.css( styleCSS );

                    var self = this;

                    pile === this.pileName ?
                        this._applyTransition( $tile, fs, this.options.pileAnimation.openSpeed, function( evt ) {

                            var target = this.target || this.nodeName;
                            if( target !== 'LI' ) {
                                return;
                            }

                            var $el = $( this );

                            // hack: remove box-shadow while animating to prevent the shadow stack effect
                            $el.css( 'box-shadow', $el.data( 'shadow' ) );

                            if( self.support ) {
                                $el.off( self.transEndEventName );
                            }

                            ++cnt;

                            if( cnt === $el.data( 'pileCount' ) ) {

                                $( document ).one( 'mousemove.stapel', function() {
                                    self.el.addClass( 'tp-open' );
                                } );
                                self.options.onAfterOpen( self.pileName, cnt );

                            }

                        } ) :
                        this._applyTransition( $tile, { opacity : 0 }, this.options.otherPileAnimation.closeSpeed );

                }

            }

            $element.css( 'height', fs.top + this.tilesize.height );

        }

        function _closePile(){

            var self = this;

            // close..
            if( this.spread ) {

                this.spread = false;

                this.options.onBeforeClose( this.pileName );

                $element.removeClass( 'tp-open' );

                // final style
                var fs;
                for( var pile in this.piles ) {

                    var p = this.piles[ pile ], cnt = 0;

                    for( var i = 0, len = p.elements.length; i < len; ++i ) {

                        var $tile = $( p.elements[i].el ),
                            styleCSS = pile === this.pileName ? {
                                transition : this.support ? 'left ' + this.options.pileAnimation.closeSpeed + 'ms ' + this.options.pileAnimation.closeEasing + ', top ' + this.options.pileAnimation.closeSpeed + 'ms ' + this.options.pileAnimation.closeEasing + ', ' + this.transformName + ' ' + this.options.pileAnimation.closeSpeed + 'ms ' + this.options.pileAnimation.closeEasing : 'none'
                            } : {
                                transition : this.support ? 'opacity ' + this.options.otherPileAnimation.openSpeed + 'ms ' + this.options.otherPileAnimation.openEasing : 'none'
                            };

                        $tile.css( styleCSS );

                        fs = p.position;

                        if( pile === this.pileName ) {

                            $.extend( fs, $tile.data( 'initialStyle' ) );

                            // hack: remove box-shadow while animating to prevent the shadow stack effect
                            if( i < len - 3 ) {
                                $tile.css( 'box-shadow', 'none' );
                            }

                        }

                        pile === this.pileName ? this._applyTransition( $tile, fs, this.options.pileAnimation.closeSpeed, function( evt ) {

                            var target = this.target || this.nodeName;
                            if( target !== 'LI' ) {
                                return;
                            }

                            var $el = $( this ), extraStyle = $el.data( 'extraStyle' );

                            // hack: remove box-shadow while animating to prevent the shadow stack effect
                            $el.css( 'box-shadow', $el.data( 'shadow' ) );

                            if( self.support ) {
                                $el.off( self.transEndEventName );
                                self._applyInitialTransition( $el );
                            }
                            else {
                                $el.css( $el.data( 'initialStyle' ) );
                            }

                            if( extraStyle ) {
                                $el.css( extraStyle );
                            }

                            ++cnt;

                            if( $el.data( 'front' ) ) {
                                $el.find( 'div.tp-title' ).show();
                            }

                            if( cnt === $el.data( 'pileCount' ) ) {
                                self.options.onAfterClose( $el.data( 'pileName' ), cnt );
                            }

                        } ) : this._applyTransition( $tile, { opacity : 1 }, this.options.otherPileAnimation.openSpeed, function( evt ) {

                            var target = this.target || this.nodeName;
                            if( target !== 'LI' ) {
                                return;
                            }

                            var $el = $( this );

                            if( $el.index() < len - 1  ) {
                                $el.find( 'img' ).css( 'visibility', 'visible' );
                            }

                            if( self.support ) {
                                $el.off( self.transEndEventName );
                                self._applyInitialTransition( $el );
                            }

                        } );

                    }

                }

                // reset pile name
                this.pileName = '';

                // update ul height
                $element.css( 'height', fs.top + this.tilesize.height );

            }

            return false;

        }

        function _resize() {

            // get ul size again
            this._getSize();
            // reset tiles positions
            this._setTilesPosition();

        }


        function _applyTransition( el, styleCSS, speed, fncomplete ) {

            $.fn.applyStyle = this.support ? $.fn.css : $.fn.animate;

            if( fncomplete && this.support ) {

                el.on( this.transEndEventName, fncomplete );

            }

            fncomplete = fncomplete || function() { return false; };

            el.stop().applyStyle( styleCSS, $.extend( true, [], { duration : speed + 'ms', complete : fncomplete } ) );

        }

        function closePile() {

            this._closePile();

        }


        self.addTile = function(tile, element) {
            tile.$element = element;
            tiles.push(tile);
        }
}])

/**
 * @ngdoc directive
 * @name ui.bootstrap.carousel.directive:carousel
 * @restrict EA
 *
 * @description
 * Carousel is the outer container for a set of image 'slides' to showcase.
 *
 * @param {number=} interval The time, in milliseconds, that it will take the carousel to go to the next slide.
 * @param {boolean=} noTransition Whether to disable transitions on the carousel.
 * @param {boolean=} noPause Whether to disable pausing on the carousel (by default, the carousel interval pauses on hover).
 *
 * @example
 <example module="ui.bootstrap">
 </example>
 */
    .directive('wsPileGrid', [function() {
        return {
            restrict: 'EA',
            transclude: true,
            replace: true,
            controller: 'PileGridController',
            require: 'wsPileGrid',
            templateUrl: 'app/template/wilsonic/pileFx/pilegrid.html',
            scope: {
                delay : 50,
                gutter : 70,
                pileAngles : 5
            }
        };
    }])

/**
 * @ngdoc directive
 * @name ui.bootstrap.carousel.directive:slide
 * @restrict EA
 *
 * @description
 * Creates a slide inside a {@link ui.bootstrap.carousel.directive:carousel carousel}.  Must be placed as a child of a carousel element.
 *
 * @param {boolean=} active Model binding, whether or not this slide is currently active.
 *
 * @example
 <example module="ui.bootstrap">
 </example>
 */

    .directive('wsPileTile', function() {
        return {
            require: '^ws-pile-tile',
            restrict: 'EA',
            transclude: true,
            replace: true,
            templateUrl: 'template/carousel/piletile.html',
            scope: {
                active: '=?'
            },
            link: function (scope, element, attrs, PileGridController) {
                PileGridController.addTile(scope, element);
                //when the scope is destroyed then remove the slide from the current slides array
                scope.$on('$destroy', function() {
                    PileGridController.removeTiles(scope);
                });
                scope.$on( 'click', function() {
                    $close.hide();
                    $name.empty();
                    stapel.closePile();
                } );

                scope.$watch('active', function(active) {
                    if (active) {
                        PileGridController.select(scope);
                    }
                });
            }
        };
    });
