//Holds all layer data
import F_ from '../Formulae_/Formulae_'
import Description from '../../Ancillary/Description'
import Search from '../../Ancillary/Search'
import ToolController_ from '../../Basics/ToolController_/ToolController_'
import $ from 'jquery'
import * as d3 from 'd3'

var L_ = {
    url: window.location.href,
    mission: null,
    missionPath: null,
    missionsList: [],
    recentMissions: [],
    site: null,
    view: null,
    radius: null,
    masterdb: false,
    Viewer_: null,
    Map_: null,
    Globe_: null,
    UserInterface_: null,
    tools: null,
    //The full, unchanged data
    configData: null,
    //The full layer object
    layers: null, //was fullData
    //Name -> layer objects
    layersNamed: {}, //was namedLayersData
    //Name -> leaflet layer
    layersGroup: {}, //was mainLayerGroup
    //Name -> sublayer group
    layersGroupSublayers: {},
    //Index -> layer name
    layersOrdered: [], //was mainLayerOrder
    //Index -> layerName (an unchanging layersOrdered)
    layersOrderedFixed: [], //was fixedLayerOrder
    //Name -> original index
    layersIndex: {},
    //Index -> had loaded (T/F) (same index as orderedLayers)
    layersLoaded: [], //was layersloaded
    //Name -> style
    layersStyles: {}, //was layerStyles
    //Name -> legendurl
    layersLegends: {}, //was layerLegends
    //Name -> legendData
    layersLegendsData: {},
    //Name -> layer expanded in layers tab (T/F)
    expandArray: {},
    //Index -> layer object
    layersData: [],
    //Name => layer object
    layersDataByName: {},
    //Index -> level (0, 1, 2 ... )
    indentArray: [],
    //Name -> is toggled (T/F)
    toggledArray: {},
    //Name -> layer visible because header expanded (T/F)
    expanded: {},
    //Name -> layer opacity ( 0 to 1 )
    opacityArray: {},
    //Name -> filter value array
    layerFilters: {},
    //Name -> parent
    layersParent: {},
    //FUTURES
    FUTURES: {
        site: null,
        viewerImg: null,
        mapView: null,
        globeView: null,
        globeCamera: null,
        panelPercents: null,
    },
    //URL search strings
    searchStrings: null,
    //URL search file
    searchFile: null,
    toolsLoaded: false,
    addedfiles: {}, //filename -> null (not null if added)
    lastActivePoint: {
        layerName: null,
        lat: null,
        lon: null,
    },
    mapAndGlobeLinked: false,
    init: function (configData, missionsList, urlOnLayers) {
        parseConfig(configData, urlOnLayers)
        L_.missionsList = missionsList
    },
    clear: function () {
        L_.mission = null
        L_.missionPath = null
        L_.missionsList = []
        L_.site = null
        L_.view = null
        L_.radius = null
        L_.masterdb = false
        L_.Viewer_ = null
        L_.Map_ = null
        L_.Globe_ = null
        L_.UserInterface_ = null
        L_.tools = null
        L_.configData = null
        L_.layers = null
        L_.layersNamed = {}
        L_.layersGroup = {}
        L_.layersOrdered = []
        L_.layersOrderedFixed = []
        L_.layersIndex = {}
        L_.layersLoaded = []
        L_.layersStyles = {}
        L_.layersLegends = {}
        L_.layersLegendsData = {}
        L_.expandArray = {}
        L_.layersData = []
        L_.layersDataByName = {}
        L_.indentArray = []
        L_.toggledArray = {}
        L_.expanded = {}
        L_.opacityArray = {}
        L_.layerFilters = {}
        L_.layersParent = {}
        L_.FUTURES = {
            site: null,
            mapView: null,
            globeView: null,
            globeCamera: null,
            panelPercents: null,
            activePoint: null,
            centerPin: null,
        }
        L_.searchStrings = null
        L_.searchFile = null
        L_.toolsLoaded = false
        L_.lastActivePoint = {
            layerName: null,
            lat: null,
            lon: null,
        }
    },
    fina: function (viewer_, map_, globe_, userinterface_) {
        this.Viewer_ = viewer_
        this.Map_ = map_
        this.Globe_ = globe_
        this.UserInterface_ = userinterface_
    },
    fullyLoaded: function () {
        this.selectPoint(this.FUTURES.activePoint)

        Search.init('.Search', L_, this.Viewer_, this.Map_, this.Globe_)
        Description.updateInfo()

        $('.LoadingPage').animate(
            {
                opacity: 0,
            },
            1000,
            function () {
                $('.LoadingPage').remove()
            }
        )
    },
    setSite: function (newSite, newView, dontSetGlobe) {
        if (newSite != undefined && newSite != null) {
            this.site = newSite
            if (newView != null) {
                this.view = newView

                if (this.FUTURES.activePoint == null) {
                    L_.Map_.resetView(newView)
                    if (!dontSetGlobe && L_.hasGlobe) {
                        L_.Globe_.litho.setCenter(newView)
                    }
                }
            }
        } else console.log('Failure updating to new site')
    },
    //Takes in config layer obj
    //Toggles a layer on and off and accounts for sublayers
    //Takes in a config layer object
    toggleLayer: async function (s) {
        if (s == null) return
        let on //if on -> turn off //if off -> turn on
        if (L_.toggledArray[s.name] === true) on = true
        else on = false
        if (s.type !== 'header') {
            if (on) {
                if (L_.Map_.map.hasLayer(L_.layersGroup[s.name])) {
                    try {
                        $('.drawToolContextMenuHeaderClose').click()
                    } catch (err) {}
                    L_.Map_.map.removeLayer(L_.layersGroup[s.name])
                    if (L_.layersGroupSublayers[s.name]) {
                        for (let sub in L_.layersGroupSublayers[s.name]) {
                            if (
                                L_.layersGroupSublayers[s.name][sub].type ===
                                'model'
                            ) {
                                L_.Globe_.litho.removeLayer(
                                    L_.layersGroupSublayers[s.name][sub].layerId
                                )
                            } else {
                                L_.Map_.rmNotNull(
                                    L_.layersGroupSublayers[s.name][sub].layer
                                )
                            }
                        }
                    }
                }
                if (s.type === 'model') {
                    L_.Globe_.litho.toggleLayer(s.name, false)
                } else L_.Globe_.litho.removeLayer(s.name)
            } else {
                if (L_.layersGroup[s.name]) {
                    if (L_.layersGroupSublayers[s.name]) {
                        for (let sub in L_.layersGroupSublayers[s.name]) {
                            if (L_.layersGroupSublayers[s.name][sub].on) {
                                if (
                                    L_.layersGroupSublayers[s.name][sub]
                                        .type === 'model'
                                ) {
                                    L_.Globe_.litho.addLayer(
                                        'model',
                                        L_.layersGroupSublayers[s.name][sub]
                                            .modelOptions
                                    )
                                } else {
                                    L_.Map_.map.addLayer(
                                        L_.layersGroupSublayers[s.name][sub]
                                            .layer
                                    )
                                    L_.layersGroupSublayers[s.name][
                                        sub
                                    ].layer.setZIndex(
                                        L_.layersOrdered.length +
                                            1 -
                                            L_.layersOrdered.indexOf(s.name)
                                    )
                                }
                            }
                        }
                    }
                    L_.Map_.map.addLayer(L_.layersGroup[s.name])
                    L_.layersGroup[s.name].setZIndex(
                        L_.layersOrdered.length +
                            1 -
                            L_.layersOrdered.indexOf(s.name)
                    )
                }
                if (s.type === 'tile') {
                    let layerUrl = s.url
                    if (!F_.isUrlAbsolute(layerUrl))
                        layerUrl = L_.missionPath + layerUrl
                    let demUrl = s.demtileurl
                    if (!F_.isUrlAbsolute(demUrl))
                        demUrl = L_.missionPath + demUrl
                    if (s.demtileurl == undefined || s.demtileurl.length == 0)
                        demUrl = undefined
                    L_.Globe_.litho.addLayer('tile', {
                        name: s.name,
                        order: 99999 - L_.layersIndex[s.name],
                        on: L_.opacityArray[s.name],
                        format: s.tileformat || 'tms',
                        formatOptions: {},
                        demFormat: s.tileformat || 'tms',
                        demFormatOptions: {
                            correctSeams: s.tileformat === 'wms',
                            wmsParams: {},
                        },
                        parser: s.demparser || null,
                        path: layerUrl,
                        demPath: demUrl,
                        opacity: L_.opacityArray[s.name],
                        minZoom: s.minZoom,
                        maxZoom: s.maxNativeZoom,
                        //boundingBox: s.boundingBox,
                        //time: s.time == null ? '' : s.time.end,
                    })
                } else if (s.type === 'data') {
                } else if (s.type === 'model') {
                    if (L_.Globe_.litho.hasLayer(s.name)) {
                        L_.Globe_.litho.toggleLayer(s.name, true)
                    } else {
                        let modelUrl = s.url
                        if (!F_.isUrlAbsolute(modelUrl))
                            modelUrl = L_.missionPath + modelUrl
                        L_.Globe_.litho.addLayer('model', {
                            name: s.name,
                            order: 1,
                            on: true,
                            path: modelUrl,
                            opacity: s.initialOpacity,
                            position: {
                                longitude: s.position?.longitude || 0,
                                latitude: s.position?.latitude || 0,
                                elevation: s.position?.elevation || 0,
                            },
                            scale: s.scale || 1,
                            rotation: {
                                // y-up is away from planet center. x is pitch, y is yaw, z is roll
                                x: s.rotation?.x || 0,
                                y: s.rotation?.y || 0,
                                z: s.rotation?.z || 0,
                            },
                        })
                    }
                } else {
                    let hadToMake = false
                    if (L_.layersGroup[s.name] === false) {
                        await L_.Map_.makeLayer(s, true)
                        Description.updateInfo()
                        hadToMake = true
                    }
                    if (L_.layersGroup[s.name]) {
                        if (!hadToMake) {
                            // Refresh annotation popups
                            if (L_.layersGroup[s.name]._layers)
                                Object.keys(
                                    L_.layersGroup[s.name]._layers
                                ).forEach((key) => {
                                    const l =
                                        L_.layersGroup[s.name]._layers[key]
                                    if (l._isAnnotation) {
                                        L_.layersGroup[s.name]._layers[key] =
                                            L_.createAnnotation(
                                                l._annotationParams.feature,
                                                l._annotationParams.className,
                                                l._annotationParams.layerId,
                                                l._annotationParams.id1
                                            )
                                    }
                                })
                        }
                        L_.Map_.map.addLayer(L_.layersGroup[s.name])
                        L_.layersGroup[s.name].setZIndex(
                            L_.layersOrdered.length +
                                1 -
                                L_.layersOrdered.indexOf(s.name)
                        )
                        if (s.type === 'vector') {
                            L_.Globe_.litho.addLayer('clamped', {
                                name: s.name,
                                order: 1000 - L_.layersIndex[s.name], // Since higher order in litho is on top
                                on: L_.opacityArray[s.name] ? true : false,
                                geojson: L_.layersGroup[s.name].toGeoJSON(),
                                onClick: (feature, lnglat, layer) => {
                                    this.selectFeature(layer.name, feature)
                                },
                                useKeyAsHoverName: s.useKeyAsName,
                                style: {
                                    // Prefer feature[f].properties.style values
                                    letPropertiesStyleOverride: true, // default false
                                    default: {
                                        fillColor: s.style.fillColor, //Use only rgb and hex. No css color names
                                        fillOpacity: parseFloat(
                                            s.style.fillOpacity
                                        ),
                                        color: s.style.color,
                                        weight: s.style.weight,
                                        radius: s.radius,
                                    },
                                    bearing: s.variables?.markerAttachments
                                        ?.bearing
                                        ? s.variables.markerAttachments.bearing
                                        : null,
                                },
                                opacity: L_.opacityArray[s.name],
                                minZoom: 0, //s.minZoom,
                                maxZoom: 100, //s.maxNativeZoom,
                            })
                        }
                    }
                }
            }
        }

        if (on) L_.toggledArray[s.name] = false
        if (!on) L_.toggledArray[s.name] = true

        if (!on && s.type === 'vector') {
            L_.Map_.orderedBringToFront()
        }
    },
    toggleSublayer: function (layerName, sublayerName) {
        const sublayers = L_.layersGroupSublayers[layerName] || {}
        const sublayer = sublayers[sublayerName]
        if (sublayer) {
            if (sublayer.on === true) {
                if (sublayer.type === 'model') {
                    L_.Globe_.litho.removeLayer(sublayer.layerId)
                } else {
                    L_.Map_.rmNotNull(sublayer.layer)
                }
                sublayer.on = false
            } else {
                if (sublayer.type === 'model') {
                    L_.Globe_.litho.addLayer('model', sublayer.modelOptions)
                } else {
                    L_.Map_.map.addLayer(sublayer.layer)
                    sublayer.layer.setZIndex(
                        L_.layersOrdered.length +
                            1 -
                            L_.layersOrdered.indexOf(layerName)
                    )
                }
                sublayer.on = true
            }
        }
    },
    disableAllBut: function (name, skipDisabling) {
        if (L_.layersNamed.hasOwnProperty(name)) {
            var l
            if (skipDisabling !== true) {
                for (var i = 0; i < L_.layersData.length; i++) {
                    l = L_.layersData[i]
                    if (L_.toggledArray[l.name] == true) {
                        L_.toggleLayer(l)
                    }
                }
            }
            for (var i = 0; i < L_.layersData.length; i++) {
                l = L_.layersData[i]
                if (L_.toggledArray[l.name] == false) {
                    if (l.name == name) L_.toggleLayer(l)
                }
                if (L_.toggledArray['Mars Overview'] == false) {
                    if (l.name == 'Mars Overview') L_.toggleLayer(l)
                }
            }
        }
    },
    // Simply if visibility was set as true in the json,
    // add the layer
    addVisible: function (map_) {
        var map = map_
        if (map == null) {
            if (L_.Map_ == null) {
                console.warn(
                    "Can't addVisible layers before Map_ is initialized."
                )
                return
            }
            map = L_.Map_.map
        } else {
            map = map.map
        }
        for (var i = L_.layersData.length - 1; i >= 0; i--) {
            if (
                L_.toggledArray[L_.layersData[i].name] === true &&
                (L_.layersData[i].type === 'model' ||
                    L_.layersGroup[L_.layersData[i].name] != null)
            ) {
                if (L_.layersData[i].type === 'tile') {
                    // Make sure all tile layers follow z-index order at start instead of element order
                    L_.layersGroup[L_.layersData[i].name].setZIndex(
                        L_.layersOrdered.length +
                            1 -
                            L_.layersOrdered.indexOf(L_.layersData[i].name)
                    )
                }

                // Add Map layers
                if (L_.layersGroup[L_.layersData[i].name]) {
                    try {
                        if (L_.layersGroupSublayers[L_.layersData[i].name]) {
                            for (let s in L_.layersGroupSublayers[
                                L_.layersData[i].name
                            ]) {
                                const sublayer =
                                    L_.layersGroupSublayers[
                                        L_.layersData[i].name
                                    ][s]
                                if (sublayer.on) {
                                    if (sublayer.type === 'model') {
                                        L_.Globe_.litho.addLayer(
                                            'model',
                                            sublayer.modelOptions
                                        )
                                    } else {
                                        map.addLayer(sublayer.layer)
                                    }
                                }
                            }
                        }
                        map.addLayer(L_.layersGroup[L_.layersData[i].name])
                        // Set markerDiv based opacities if any
                        $(
                            `.leafletMarkerShape_${L_.layersData[i].name
                                .replace(/\s/g, '')
                                .toLowerCase()}`
                        ).css({
                            opacity:
                                L_.opacityArray[L_.layersData[i].name] || 0,
                        })
                    } catch (e) {
                        console.log(e)
                        console.warn(
                            'Warning: Failed to add layer to map: ' +
                                L_.layersData[i].name
                        )
                    }
                }

                // Add Globe layers
                const s = L_.layersData[i]
                let layerUrl = s.url
                if (!F_.isUrlAbsolute(layerUrl))
                    layerUrl = L_.missionPath + layerUrl
                if (
                    L_.layersData[i].type === 'tile' ||
                    L_.layersData[i].type === 'data'
                ) {
                    // Make sure all tile layers follow z-index order at start instead of element order
                    L_.layersGroup[L_.layersData[i].name].setZIndex(
                        L_.layersOrdered.length +
                            1 -
                            L_.layersOrdered.indexOf(L_.layersData[i].name)
                    )

                    let demUrl = s.demtileurl
                    if (!F_.isUrlAbsolute(demUrl))
                        demUrl = L_.missionPath + demUrl
                    if (s.demtileurl == undefined) demUrl = undefined
                    if (L_.layersData[i].type === 'tile')
                        L_.Globe_.litho.addLayer('tile', {
                            name: s.name,
                            order: 99999 - L_.layersIndex[s.name],
                            on: L_.opacityArray[s.name],
                            format: s.tileformat || 'tms',
                            formatOptions: {},
                            demFormat: s.tileformat || 'tms',
                            demFormatOptions: {
                                correctSeams: s.tileformat === 'wms',
                                wmsParams: {},
                            },
                            parser: s.demparser || null,
                            path: layerUrl,
                            demPath: demUrl,
                            opacity: L_.opacityArray[s.name],
                            minZoom: s.minZoom,
                            maxZoom: s.maxNativeZoom,
                            //boundingBox: s.boundingBox,
                            //time: s.time == null ? '' : s.time.end,
                        })
                } else if (L_.layersData[i].type === 'model') {
                    L_.Globe_.litho.addLayer('model', {
                        name: s.name,
                        order: 99999 - L_.layersIndex[s.name],
                        on: true,
                        path: layerUrl,
                        opacity: L_.opacityArray[s.name],
                        position: {
                            longitude: s.position?.longitude || 0,
                            latitude: s.position?.latitude || 0,
                            elevation: s.position?.elevation || 0,
                        },
                        scale: s.scale || 1,
                        rotation: {
                            // y-up is away from planet center. x is pitch, y is yaw, z is roll
                            x: s.rotation?.x || 0,
                            y: s.rotation?.y || 0,
                            z: s.rotation?.z || 0,
                        },
                    })
                } else if (L_.layersData[i].type != 'header') {
                    L_.Globe_.litho.addLayer(
                        L_.layersData[i].type == 'vector'
                            ? 'clamped'
                            : L_.layersData[i].type,
                        {
                            name: s.name,
                            order: 1000 - L_.layersIndex[s.name], // Since higher order in litho is on top
                            on: L_.opacityArray[s.name] ? true : false,
                            geojson: L_.layersGroup[s.name].toGeoJSON(),
                            onClick: (feature, lnglat, layer) => {
                                this.selectFeature(layer.name, feature)
                            },
                            useKeyAsHoverName: s.useKeyAsName,
                            style: {
                                // Prefer feature[f].properties.style values
                                letPropertiesStyleOverride: true, // default false
                                default: {
                                    fillColor: s.style.fillColor, //Use only rgb and hex. No css color names
                                    fillOpacity: parseFloat(
                                        s.style.fillOpacity
                                    ),
                                    color: s.style.color,
                                    weight: s.style.weight,
                                    radius: s.radius,
                                },
                                bearing: s.variables?.markerAttachments?.bearing
                                    ? s.variables.markerAttachments.bearing
                                    : null,
                            },
                            opacity: L_.opacityArray[s.name],
                            minZoom: 0, //s.minZoom,
                            maxZoom: 100, //s.maxNativeZoom,
                        }
                    )
                }
            }
        }
    },
    setStyle(layer, newStyle) {
        try {
            layer.setStyle(newStyle)
        } catch (err) {}
    },
    select(layer) {
        L_.setLastActivePoint(layer)
        L_.resetLayerFills()
        L_.highlight(layer)
        L_.Map_.activeLayer = layer
        Description.updatePoint(L_.Map_.activeLayer)

        L_.Globe_.highlight(
            L_.Globe_.findSpriteObject(
                layer.options.layerName,
                layer.feature.properties[layer.useKeyAsName]
            ),
            false
        )
        L_.Viewer_.highlight(layer)
    },
    highlight(layer) {
        const color =
            (L_.configData.look && L_.configData.look.highlightcolor) || 'red'
        try {
            if (layer.feature?.properties?.annotation) {
                // Annotation
                let id =
                    '#DrawToolAnnotation_' +
                    layer.feature.properties._.file_id +
                    '_' +
                    layer.feature.properties._.id
                d3.select(id).style('color', color)
            } else if (layer.hasOwnProperty('_layers')) {
                // Arrow
                var layers = layer._layers
                layers[Object.keys(layers)[0]].setStyle({ color })
                layers[Object.keys(layers)[1]].setStyle({ color })
            } else {
                layer.setStyle({
                    color: color,
                })
            }
        } catch (err) {
            if (layer._icon)
                layer._icon.style.filter = `drop-shadow(${color}  2px 0px 0px) drop-shadow(${color}  -2px 0px 0px) drop-shadow(${color}  0px 2px 0px) drop-shadow(${color} 0px -2px 0px)`
        }
        try {
            layer.bringToFront()
        } catch (err) {}
    },
    addArrowToMap: function (
        layerId,
        start,
        end,
        style,
        feature,
        index,
        indexedCallback
    ) {
        var line

        var length
        if (isNaN(style.length)) length = false
        else length = parseInt(style.length)

        line = new L.Polyline([end, start], {
            color: style.color,
            weight: style.width + style.weight,
        })
        var arrowBodyOutline
        if (length === false) {
            arrowBodyOutline = new L.Polyline([start, end], {
                color: style.color,
                weight: style.width + style.weight,
                dashArray: style.dashArray,
                lineCap: style.lineCap,
                lineJoin: style.lineJoin,
            })
        } else {
            arrowBodyOutline = L.polylineDecorator(line, {
                patterns: [
                    {
                        offset: length / 2 + 'px',
                        repeat: 0,
                        symbol: L.Symbol.dash({
                            pixelSize: style.length,
                            polygon: false,
                            pathOptions: {
                                stroke: true,
                                color: style.color,
                                weight: style.width + style.weight,
                                dashArray: style.dashArray,
                                lineCap: style.lineCap,
                                lineJoin: style.lineJoin,
                            },
                        }),
                    },
                ],
            })
        }
        line = new L.Polyline([start, end], {
            color: style.color,
            weight: style.width + style.weight,
        })
        var arrowHeadOutline = L.polylineDecorator(line, {
            patterns: [
                {
                    offset: '100%',
                    repeat: 0,
                    symbol: L.Symbol.arrowHead({
                        pixelSize: style.radius,
                        polygon: false,
                        pathOptions: {
                            stroke: true,
                            color: style.color,
                            weight: style.width + style.weight,
                            lineCap: style.lineCap,
                            lineJoin: style.lineJoin,
                        },
                    }),
                },
            ],
        })
        line = new L.Polyline([end, start], {
            color: style.fillColor,
            weight: style.width,
        })
        var arrowBody
        if (length === false) {
            arrowBody = new L.Polyline([start, end], {
                color: style.fillColor,
                weight: style.width,
                dashArray: style.dashArray,
                lineCap: style.lineCap,
                lineJoin: style.lineJoin,
            })
        } else {
            arrowBody = L.polylineDecorator(line, {
                patterns: [
                    {
                        offset: length / 2 + 'px',
                        repeat: 0,
                        symbol: L.Symbol.dash({
                            pixelSize: style.length,
                            polygon: false,
                            pathOptions: {
                                stroke: true,
                                color: style.fillColor,
                                weight: style.width,
                                dashArray: style.dashArray,
                                lineCap: style.lineCap,
                                lineJoin: style.lineJoin,
                            },
                        }),
                    },
                ],
            })
        }
        line = new L.Polyline([start, end], {
            color: style.fillColor,
            weight: style.width,
        })
        var arrowHead = L.polylineDecorator(line, {
            patterns: [
                {
                    offset: '100%',
                    repeat: 0,
                    symbol: L.Symbol.arrowHead({
                        pixelSize: style.radius,
                        polygon: false,
                        pathOptions: {
                            stroke: true,
                            color: style.fillColor,
                            weight: style.width,
                            lineCap: style.lineCap,
                            lineJoin: style.lineJoin,
                        },
                    }),
                },
            ],
        })

        if (layerId == null) {
            const arrowLayer = L.layerGroup([
                arrowBodyOutline,
                arrowHeadOutline,
                arrowBody,
                arrowHead,
            ])
            arrowLayer.start = start
            arrowLayer.end = end
            arrowLayer.feature = feature
            return arrowLayer
        }
        if (index != null) {
            L_.Map_.rmNotNull(L_.layersGroup[layerId][index])
            L_.layersGroup[layerId][index] = L.layerGroup([
                arrowBodyOutline,
                arrowHeadOutline,
                arrowBody,
                arrowHead,
            ]).addTo(L_.Map_.map)
            L_.layersGroup[layerId][index].start = start
            L_.layersGroup[layerId][index].end = end
            L_.layersGroup[layerId][index].feature = feature
            if (typeof indexedCallback === 'function') indexedCallback()
        } else {
            L_.layersGroup[layerId].push(
                L.layerGroup([
                    arrowBodyOutline,
                    arrowHeadOutline,
                    arrowBody,
                    arrowHead,
                ]).addTo(L_.Map_.map)
            )
            L_.layersGroup[layerId][L_.layersGroup[layerId].length - 1].start =
                start
            L_.layersGroup[layerId][L_.layersGroup[layerId].length - 1].end =
                end
            L_.layersGroup[layerId][
                L_.layersGroup[layerId].length - 1
            ].feature = feature
        }
    },
    createAnnotation: function (
        feature,
        className,
        layerId,
        id1,
        id2,
        andAddToMap
    ) {
        if (id2 == null) id2 = 0

        className = className.replace(/ /g, '_')
        //Remove previous annotation if any
        $(`#${className}_${id1}_${id2}`)
            .parent()
            .parent()
            .parent()
            .parent()
            .remove()

        const s = feature.properties.style
        const styleString =
            (s.color != null
                ? 'text-shadow: ' +
                  F_.getTextShadowString(s.color, s.strokeOpacity, s.weight) +
                  '; '
                : '') +
            (s.fillColor != null ? 'color: ' + s.fillColor + '; ' : '') +
            (s.fontSize != null ? 'font-size: ' + s.fontSize + '; ' : '') +
            (s.rotation != null
                ? 'transform: rotateZ(' +
                  parseInt(!isNaN(s.rotation) ? s.rotation : 0) * -1 +
                  'deg); '
                : '')

        // prettier-ignore
        const popup = L.popup({
            className: `leaflet-popup-annotation${!andAddToMap ? ' noPointerEvents' : ''}`,
            closeButton: false,
            autoClose: false,
            closeOnEscapeKey: false,
            closeOnClick: false,
            autoPan: false,
            offset: new L.point(0, 3),
        })
            .setLatLng(
                new L.LatLng(
                    feature.geometry.coordinates[1],
                    feature.geometry.coordinates[0]
                )
            )
            .setContent(
                "<div>" +
                    "<div id='" + className + '_' + id1 + '_' + id2 +
                    "' class='drawToolAnnotation " + className + '_' + id1 + "  blackTextBorder'" +
                    " layer='" + id1 +
                    (L_.layersGroup[layerId] != null ? "' index='" + L_.layersGroup[layerId].length : '') +
                    "' style='" + styleString + "'>" +
                    `${feature.properties.name.replace(/[<>;{}]/g, '')}`,
                    '</div>' +
                '</div>'
            )
        popup._isAnnotation = true
        popup._annotationParams = {
            feature,
            className,
            layerId,
            id1,
            id2,
            andAddToMap,
        }
        popup.feature = feature
        if (andAddToMap) {
            popup.addTo(L_.Map_.map)
            L_.layersGroup[layerId].push(popup)
        }

        return popup
    },
    setLayerOpacity: function (name, newOpacity) {
        newOpacity = parseFloat(newOpacity)
        if (L_.Globe_) L_.Globe_.litho.setLayerOpacity(name, newOpacity)
        let l = L_.layersGroup[name]

        if (l.options.initialFillOpacity == null)
            l.options.initialFillOpacity =
                L_.layersStyles[name]?.fillOpacity != null
                    ? parseFloat(L_.layersStyles[name]?.fillOpacity)
                    : 1
        if (l) {
            try {
                l.setOpacity(newOpacity)
            } catch (error) {
                l.setStyle({
                    opacity: newOpacity,
                    fillOpacity: newOpacity * l.options.initialFillOpacity,
                })
                $(
                    `.leafletMarkerShape_${name
                        .replace(/\s/g, '')
                        .toLowerCase()}`
                ).css({ opacity: newOpacity })
            }
            try {
                l.options.fillOpacity =
                    newOpacity * l.options.initialFillOpacity
                l.options.opacity = newOpacity
                l.options.style.fillOpacity =
                    newOpacity * l.options.initialFillOpacity
                l.options.style.opacity = newOpacity
            } catch (error) {
                l.options.fillOpacity =
                    newOpacity * l.options.initialFillOpacity
                l.options.opacity = newOpacity
            }
        }
        L_.opacityArray[name] = newOpacity
    },
    getLayerOpacity: function (name) {
        var l = L_.layersGroup[name]

        if (l == null) return 0

        var opacity
        try {
            opacity = l.options?.style.opacity
        } catch (error) {
            opacity = l.options?.opacity
        }
        return opacity
    },
    setLayerFilter: function (name, filter, value) {
        if (filter == 'clear') L_.layerFilters[name] = {}
        L_.layerFilters[name] = L_.layerFilters[name] || {}
        L_.layerFilters[name][filter] = value
        if (typeof L_.layersGroup[name].updateFilter === 'function') {
            var filterArray = []
            for (var f in L_.layerFilters[name]) {
                filterArray.push(f + ':' + L_.layerFilters[name][f])
            }
            L_.layersGroup[name].updateFilter(filterArray)
        }
    },
    resetLayerFills: function () {
        for (let key in this.layersGroup) {
            var s = key.split('_')
            var onId = s[1] != 'master' ? parseInt(s[1]) : s[1]
            if (
                (this.layersGroup[key] &&
                    this.layersNamed[key] &&
                    (this.layersNamed[key].type == 'point' ||
                        (key.toLowerCase().indexOf('draw') == -1 &&
                            (this.layersNamed[key].type === 'vector' ||
                                this.layersNamed[key].type === 'query')))) ||
                (s[0] == 'DrawTool' && !Number.isNaN(onId))
            ) {
                if (
                    this.layersGroup.hasOwnProperty(key) &&
                    this.layersGroup[key] != undefined &&
                    this.layersStyles.hasOwnProperty(key) &&
                    this.layersStyles[key] != undefined &&
                    this.layersStyles[key].hasOwnProperty('fillColor')
                ) {
                    this.layersGroup[key].eachLayer((layer) => {
                        let fillColor = this.layersStyles[key].fillColor
                        let opacity = layer.options.opacity
                        let fillOpacity = layer.options.fillOpacity
                        let weight = layer.options.weight
                        if (!layer._isAnnotation)
                            L_.layersGroup[key].resetStyle(layer)
                        try {
                            layer.setStyle({
                                opacity: opacity,
                                fillOpacity: fillOpacity,
                                fillColor: layer.options.fillColor || fillColor,
                                weight: parseInt(weight),
                            })
                        } catch (err) {
                            if (layer._icon) layer._icon.style.filter = ''
                        }
                    })
                } else if (s[0] == 'DrawTool') {
                    for (let k in this.layersGroup[key]) {
                        if (!this.layersGroup[key][k]) continue
                        if ('getLayers' in this.layersGroup[key][k]) {
                            let layer = this.layersGroup[key][k]
                            if (!layer?.feature?.properties?.arrow) {
                                // Polygons and lines
                                layer.eachLayer(function (l) {
                                    setLayerStyle(l)
                                })
                            } else {
                                // Arrow
                                let layers = this.layersGroup[key][k]._layers
                                const style =
                                    this.layersGroup[key][k].feature.properties
                                        .style
                                const color = style.color
                                layers[Object.keys(layers)[0]].setStyle({
                                    color,
                                })
                                layers[Object.keys(layers)[1]].setStyle({
                                    color,
                                })
                            }
                        } else if (
                            this.layersGroup[key][k].feature?.properties
                                ?.annotation
                        ) {
                            // Annotation
                            let layer = this.layersGroup[key][k]
                            let id =
                                '#DrawToolAnnotation_' +
                                layer.feature.properties._.file_id +
                                '_' +
                                layer.feature.properties._.id
                            d3.select(id).style(
                                'color',
                                layer.feature.properties.style.fillColor
                            )
                        } else if ('feature' in this.layersGroup[key][k]) {
                            // Points (that are not annotations)
                            let layer = this.layersGroup[key][k]
                            setLayerStyle(layer)
                        }
                    }

                    function setLayerStyle(layer) {
                        const style = layer.feature.properties.style
                        const color = style.color
                        layer.setStyle({
                            color: color,
                        })
                    }
                }
            }
        }
    },
    home() {
        L_.Map_.resetView(L_.configData.msv.view)
        L_.Globe_.litho.setCenter(L_.configData.msv.view)
    },
    hasTool: function (toolName) {
        for (var i = 0; i < L_.tools.length; i++) {
            if (
                L_.tools[i].hasOwnProperty('name') &&
                L_.tools[i].name.toLowerCase() == toolName
            )
                return true
        }
        return false
    },
    getToolVars: function (toolName, ignoreWarnings) {
        for (var i = 0; i < L_.tools.length; i++) {
            if (
                L_.tools[i].hasOwnProperty('name') &&
                L_.tools[i].name.toLowerCase() == toolName &&
                L_.tools[i].hasOwnProperty('variables')
            ) {
                return L_.tools[i].variables
            }
        }
        if (ignoreWarnings !== true)
            console.warn(
                'Warning: Tried to get Tool: ' +
                    toolName +
                    "'s config variables and failed."
            )
        return {}
    },
    /**
     * @param {object} layer - leaflet layer object
     */
    setLastActivePoint: function (layer) {
        var layerName = layer.hasOwnProperty('options')
            ? layer.options.layerName
            : null
        var lat = layer.hasOwnProperty('_latlng') ? layer._latlng.lat : null
        var lon = layer.hasOwnProperty('_latlng') ? layer._latlng.lng : null

        if (layerName != null && lat != null && layerName != null) {
            L_.lastActivePoint = {
                layerName: layerName,
                lat: lat,
                lon: lon,
            }
        } else {
            L_.lastActivePoint = {
                layerName: null,
                lat: null,
                lon: null,
            }
        }
    },
    selectFeature(layerName, feature) {
        const layer = L_.layersGroup[layerName]
        if (layer) {
            const layers = layer._layers
            for (let l in layers) {
                if (
                    F_.isEqual(
                        layers[l].feature.geometry,
                        feature.geometry,
                        true
                    ) &&
                    F_.isEqual(
                        layers[l].feature.properties,
                        feature.properties,
                        true
                    )
                ) {
                    layers[l].fireEvent('click')
                    return
                }
            }
        }
    },
    /**
     * @param {object} - activePoint { layerName: , lat: lon: }
     * @returns {bool} - true only if successful
     */
    selectPoint(activePoint) {
        if (
            activePoint &&
            activePoint.layerName != null &&
            activePoint.lat != null &&
            activePoint.lon != null
        ) {
            if (L_.layersGroup.hasOwnProperty(activePoint.layerName)) {
                let g = L_.layersGroup[activePoint.layerName]._layers
                for (let l in g) {
                    if (
                        g[l]._latlng.lat == activePoint.lat &&
                        g[l]._latlng.lng == activePoint.lon
                    ) {
                        g[l].fireEvent('click')
                        if (activePoint.view == 'go') {
                            let newView = []
                            if (g[l]._latlng) {
                                newView = [
                                    g[l]._latlng.lat,
                                    g[l]._latlng.lng,
                                    activePoint.zoom ||
                                        L_.Map_.mapScaleZoom ||
                                        L_.Map_.map.getZoom(),
                                ]
                            } else if (g[l]._latlngs) {
                                let lat = 0,
                                    lng = 0
                                let llflat = g[l]._latlngs.flat(Infinity)
                                for (let ll of llflat) {
                                    lat += ll.lat
                                    lng += ll.lng
                                }
                                newView = [
                                    lat / llflat.length,
                                    lng / llflat.length,
                                    parseInt(
                                        activePoint.zoom ||
                                            L_.Map_.mapScaleZoom ||
                                            L_.Map_.map.getZoom()
                                    ),
                                ]
                            }

                            L_.Map_.resetView(newView)
                            if (L_.hasGlobe) {
                                L_.Globe_.litho.setCenter(newView)
                            }
                        }
                        return true
                    }
                }
            }
        } else if (
            activePoint &&
            activePoint.layerName != null &&
            activePoint.key != null &&
            activePoint.value != null
        ) {
            if (L_.layersGroup.hasOwnProperty(activePoint.layerName)) {
                let g = L_.layersGroup[activePoint.layerName]._layers
                for (let l in g) {
                    if (g[l] && g[l].feature && g[l].feature.properties) {
                        if (
                            F_.getIn(
                                g[l].feature.properties,
                                activePoint.key.split('.')
                            ) == activePoint.value
                        ) {
                            g[l].fireEvent('click')
                            if (activePoint.view == 'go') {
                                let newView = []
                                if (g[l]._latlng) {
                                    newView = [
                                        g[l]._latlng.lat,
                                        g[l]._latlng.lng,
                                        activePoint.zoom ||
                                            L_.Map_.mapScaleZoom ||
                                            L_.Map_.map.getZoom(),
                                    ]
                                } else if (g[l]._latlngs) {
                                    let lat = 0,
                                        lng = 0
                                    let llflat = g[l]._latlngs.flat(Infinity)
                                    for (let ll of llflat) {
                                        lat += ll.lat
                                        lng += ll.lng
                                    }
                                    newView = [
                                        lat / llflat.length,
                                        lng / llflat.length,
                                        parseInt(
                                            activePoint.zoom ||
                                                L_.Map_.mapScaleZoom ||
                                                L_.Map_.map.getZoom()
                                        ),
                                    ]
                                }
                                setTimeout(() => {
                                    L_.Map_.resetView(newView)
                                }, 50)
                                if (L_.hasGlobe) {
                                    L_.Globe_.litho.setCenter(newView)
                                }
                            }
                            return true
                        }
                    }
                }
            }
        }
        return false
    },
    clearVectorLayer: function (layerName) {
        try {
            L_.layersGroup[layerName].clearLayers()
            L_.clearVectorLayerInfo()
        } catch (e) {
            console.log(e)
            console.warn('Warning: Unable to clear vector layer: ' + layerName)
        }
    },
    removeLayerHelper: function (updateLayer, removeLayer) {
        // If we remove a layer but its properties are displayed in the InfoTool
        // and description (i.e. it was clicked), clear the InfoTool and description
        const infoTool = ToolController_.getTool('InfoTool')
        if (infoTool.currentLayer === removeLayer) {
            L_.clearVectorLayerInfo()
        }

        // Remove the layer
        updateLayer.removeLayer(removeLayer)
    },
    trimVectorLayerKeepBeforeTime: function (layerName, keepBeforeTime, timePropPath) {
        L_.trimVectorLayerHelper(layerName, keepBeforeTime, timePropPath, "before")
    },
    trimVectorLayerKeepAfterTime: function (layerName, keepAfterTime, timePropPath) {
        L_.trimVectorLayerHelper(layerName, keepAfterTime, timePropPath, "after")
    },
    trimVectorLayerHelper: function (layerName, keepTime, timePropPath, trimType) {
        // Validate input parameters
        if (!keepTime) {
            console.warn(
                'Warning: The input for keep' + trimType.capitalizeFirstLetter() + 'Time is invalid: ' + keepTime
            )
            return
        }

        if (!timePropPath) {
            console.warn(
                'Warning: The input for timePropPath is invalid: ' + timePropPath
            )
            return
        }

        if (keepTime) {
            const keepAfterAsDate = new Date(keepTime)
            if (isNaN(keepAfterAsDate.getTime())) {
                console.warn(
                    'Warning: The input for keep' + trimType.capitalizeFirstLetter() + 'Time is invalid: ' + keepAfterTime
                )
                return
            }
        }

        if (layerName in L_.layersGroup) {
            const updateLayer = L_.layersGroup[layerName]

            if (keepTime) {
                const keepTimeAsDate = new Date(keepTime)

                var layers = updateLayer.getLayers()
                for (let i = layers.length - 1; i >= 0; i--) {
                    let layer = layers[i]
                    if (layer.feature.properties[timePropPath]) {
                        const layerDate = new Date(layer.feature.properties[timePropPath])
                        if (isNaN(layerDate.getTime())) {
                            console.warn(
                                'Warning: The time for the layer is invalid: ' + layer.feature.properties[timePropPath]
                            )
                            continue
                        }
                        if (trimType === "after") {
                            if (layerDate < keepTimeAsDate) {
                                console.log("if true")
                                L_.removeLayerHelper(updateLayer, layer)
                            }
                        } else if (trimType === "before") {
                            if (layerDate > keepTimeAsDate) {
                                console.log("if true")
                                L_.removeLayerHelper(updateLayer, layer)
                            }
                        }
                    }
                }
            }
        } else {
            console.warn(
                'Warning: Unable to trim vector layer as it does not exist: ' +
                    layerName
            )
        }
    },
    keepFirstN: function (layerName, keepFirstN) {
        L_.keepNHelper(layerName, keepFirstN, "first")
    },
    keepLastN: function (layerName, keepLastN) {
        L_.keepNHelper(layerName, keepLastN, "last")
    },
    keepNHelper: function (layerName, keepN, keepType) {
        // Validate input parameter
        const keepNum = parseInt(keepN)
        if (Number.isNaN(Number(keepNum))) {
            console.warn(
                'Warning: Unable to trim vector layer `' +
                    layerName +
                    '` as keep' + keepType.capitalizeFirstLetter() + 'N == ' +
                    keepN +
                    ' and is not a valid integer'
            )
            return
        }

        if (layerName in L_.layersGroup) {
            // Keep N elements if greater than 0 else keep all elements
            if (keepN && keepN > 0) {
                const updateLayer = L_.layersGroup[layerName]
                var layers = updateLayer.getLayers()

                if (keepType === "last") {
                    while (layers.length > keepN) {
                        const removeLayer = layers[0]
                        L_.removeLayerHelper(updateLayer, removeLayer)
                        layers = updateLayer.getLayers()
                    }
                } else if (keepType === "first") {
                    while (layers.length > keepN) {
                        const removeLayer = layers[layers.length - 1]
                        L_.removeLayerHelper(updateLayer, removeLayer)
                        layers = updateLayer.getLayers()
                    }
                }
            }
        } else {
            console.warn(
                'Warning: Unable to trim vector layer as it does not exist: ' +
                    layerName
            )
        }
    },
    updateVectorLayer: function (layerName, inputData) {
        if (layerName in L_.layersGroup) {
            const updateLayer = L_.layersGroup[layerName]

            try {
                // Add data
                updateLayer.addData(inputData)
            } catch (e) {
                console.log(e)
                console.warn(
                    'Warning: Unable to update vector layer as the input data is invalid: ' +
                        layerName
                )
            }
        } else {
            console.warn(
                'Warning: Unable to update vector layer as it does not exist: ' +
                    layerName
            )
        }
    },
    clearVectorLayerInfo: function () {
        // Clear the InfoTools data
        const infoTool = ToolController_.getTool('InfoTool')
        if (infoTool.hasOwnProperty('clearInfo')) {
            infoTool.clearInfo()
        }

        // Clear the description
        Description.clearDescription()
    },
}

//Takes in a configData object and does a depth-first search through its
// layers and sets L_ variables
function parseConfig(configData, urlOnLayers) {
    //Create parsed configData
    L_.configData = configData

    //find zero resolution
    if (
        L_.configData.projection &&
        L_.configData.projection.resunitsperpixel &&
        L_.configData.projection.reszoomlevel
    ) {
        var baseRes =
            L_.configData.projection.resunitsperpixel *
            Math.pow(2, L_.configData.projection.reszoomlevel)
        var res = []
        for (var i = 0; i < 32; i++) {
            res.push(baseRes / Math.pow(2, i))
        }
        L_.configData.projection.res = res
    }
    //Make bounds and origin floats
    if (L_.configData.projection && L_.configData.projection.bounds) {
        for (var i in L_.configData.projection.bounds)
            L_.configData.projection.bounds[i] = parseFloat(
                L_.configData.projection.bounds[i]
            )
    }
    if (L_.configData.projection && L_.configData.projection.origin) {
        for (var i in L_.configData.projection.origin)
            L_.configData.projection.origin[i] = parseFloat(
                L_.configData.projection.origin[i]
            )
    }

    L_.mission = L_.configData.msv.mission
    L_.recentMissions.unshift(L_.mission)
    L_.missionPath = 'Missions/' + L_.configData.msv.mission + '/'
    L_.site = L_.configData.msv.site

    L_.view = [
        parseFloat(L_.configData.msv.view[0]),
        parseFloat(L_.configData.msv.view[1]),
        parseInt(L_.configData.msv.view[2]),
    ]
    if (isNaN(L_.view[0])) L_.view[0] = 0
    if (isNaN(L_.view[1])) L_.view[1] = 0
    if (isNaN(L_.view[2])) L_.view[2] = 0

    L_.radius = L_.configData.msv.radius
    L_.masterdb = L_.configData.msv.masterdb || false

    L_.tools = L_.configData.tools

    L_.hasMap = L_.configData.panels.indexOf('map') > -1
    L_.hasMap = true //Should always have map;
    L_.hasViewer = L_.configData.panels.indexOf('viewer') > -1
    L_.hasGlobe = L_.configData.panels.indexOf('globe') > -1
    //We only care about the layers now
    var layers = L_.configData.layers
    //Create parsed layers
    L_.layers = layers

    //Because we want overall indecies and not local
    let layerIndex = 0

    //Begin recursively going through those layers
    expandLayers(layers, 0, null)

    function expandLayers(d, level, prevName) {
        //Iterate over each layer
        for (var i = 0; i < d.length; i++) {
            //Create parsed layers named
            L_.layersNamed[d[i].name] = d[i]
            //Save the prevName for easy tracing back
            L_.layersParent[d[i].name] = prevName
            //Save the i
            L_.layersIndex[d[i].name] = layerIndex

            layerIndex++

            //Check if it's not a header and thus an actual layer with data
            if (d[i].type != 'header') {
                //Create parsed layers ordered
                L_.layersOrdered.push(d[i].name)
                //Create parsed layers loaded
                if (d[i].type != 'data' && d[i].type != 'model')
                    //No load checking for model since it's globe only
                    L_.layersLoaded.push(false)
                else L_.layersLoaded.push(true)
                //Create parsed layers styles
                L_.layersStyles[d[i].name] = d[i].style
                //Create parsed layers legends
                L_.layersLegends[d[i].name] = d[i].legend

                //relative or full path?
                var legendPath = L_.layersLegends[d[i].name]
                if (legendPath != undefined) {
                    if (!F_.isUrlAbsolute(legendPath))
                        legendPath = L_.missionPath + legendPath
                    $.get(
                        legendPath,
                        (function (name) {
                            return function (data) {
                                data = F_.csvToJSON(data)
                                L_.layersLegendsData[name] = data
                            }
                        })(d[i].name)
                    )
                }
                //Create parsed expand array
                L_.expandArray[d[i].name] = true
                //Create parsed expanded
                L_.expanded[d[i].name] = false
            } else {
                //If it is a header, keep it closed
                //Create parsed expand array
                L_.expandArray[d[i].name] = false
                //Create parsed expanded
                L_.expanded[d[i].name] = true
            }

            //Create parsed layers data
            L_.layersData.push(d[i])
            //And by name
            L_.layersDataByName[d[i].name] = d[i]
            //Create parsed indent array
            L_.indentArray.push(level)
            //Create parsed toggled array based on config layer visibility
            L_.toggledArray[d[i].name] =
                d[i].visibility == undefined ? true : d[i].visibility

            //Create parsed opacity array
            let io = d[i].initialOpacity
            L_.opacityArray[d[i].name] = io == null || io < 0 || io > 1 ? 1 : io

            //Set visibility if we have all the on layers listed in the url
            if (urlOnLayers) {
                //this is null if we've no url layers
                if (urlOnLayers.onLayers.hasOwnProperty(d[i].name)) {
                    L_.toggledArray[d[i].name] = true
                    L_.opacityArray[d[i].name] =
                        urlOnLayers.onLayers[d[i].name].opacity || 1
                } else if (urlOnLayers.method == 'replace')
                    L_.toggledArray[d[i].name] = false
            }
            //Get the current layers sublayers (returns 0 if none)
            var dNext = getSublayers(d[i])
            //If they are sublayers, call this function again and move up a level
            if (dNext != 0) {
                expandLayers(dNext, level + 1, d[i].name)
            }
        }

        //Save the order of the layers
        L_.layersOrderedFixed = L_.layersOrdered
    }
    //Get the current layers sublayers (returns 0 if none)
    function getSublayers(d) {
        //If object d has a sublayers property, return it
        if (d.hasOwnProperty('sublayers')) {
            return d.sublayers
        }
        //Otherwise return 0
        return 0
    }
}

export default L_
