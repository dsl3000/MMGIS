import $ from 'jquery'
import * as d3 from 'd3'
import F_ from '../../Basics/Formulae_/Formulae_'
import L_ from '../../Basics/Layers_/Layers_'
import Viewer_ from '../../Basics/Viewer_/Viewer_'
import Map_ from '../../Basics/Map_/Map_'
import Globe_ from '../../Basics/Globe_/Globe_'
import CursorInfo from '../../Ancillary/CursorInfo'
import calls from '../../../pre/calls'

import metricsGraphics from '../../../external/MetricsGraphics/metricsgraphics.min'

import ReactDOM from 'react-dom'
import React, { useState, useEffect, useRef } from 'react'

import { Line } from 'react-chartjs-2'
import * as zoom from 'chartjs-plugin-zoom'

import './MeasureTool.css'

// Hacky solution to exposing setState externally
let updateProfileData = function () {}
let toolLayer = []
let measureToolLayer = null
let clickedLatLngs = []
let distLineToMouse = null
let distMousePoint = null
let distDisplayUnit = 'meters'
let mode = 'segment'
let steps = 100
let profileData = []
let elevPoints = []
let profileDivId = 'measureToolProfile'
let rAm = 100 //roundAmount
let globeMouseDownXY = {}

const Measure = () => {
    const [profileData, setProfileData] = useState([])
    const refLine = useRef(null)

    useEffect(() => {
        updateProfileData = setProfileData
        // code to run on component mount
        Map_.map
            .on('click', MeasureTool.clickMap)
            .on('mousemove', MeasureTool.moveMap)
            .on('mouseout', MeasureTool.mouseOutMap)

        const globeCont = Globe_.litho.getContainer()
        globeCont.addEventListener(
            'mousedown',
            MeasureTool.mouseDownGlobe,
            false
        )
        globeCont.addEventListener('mouseup', MeasureTool.clickGlobe, false)
        globeCont.addEventListener('mousemove', MeasureTool.moveGlobe, false)
        globeCont.addEventListener('mouseout', MeasureTool.mouseOutMap, false)

        Viewer_.imageViewerMap.addHandler(
            'canvas-click',
            MeasureTool.clickViewer
        )
        Viewer_.imageViewer.style('cursor', 'default')
    }, [])

    return (
        <div className='MeasureTool'>
            <div id='measureLeft'>
                <div id='measureTop'>
                    <div id='measureTitle'>Measure</div>
                    <div id='measureIcons'>
                        <div
                            id='measureUndo'
                            title='Undo'
                            onClick={MeasureTool.undo}
                        >
                            <i className='mdi mdi-undo mdi-18px'></i>
                        </div>
                        <div
                            id='measureReset'
                            title='Reset'
                            onClick={MeasureTool.reset}
                        >
                            <i className='mdi mdi-refresh mdi-18px'></i>
                        </div>
                    </div>
                </div>
                <div id='measureMode'>
                    <div>Mode</div>
                    <select
                        className='dropdown'
                        defaultValue='segment'
                        onChange={MeasureTool.changeMode}
                    >
                        <option value='segment'>Segment</option>
                        <option value='continuous'>Continuous</option>
                        <option value='continuous_color'>
                            Continuous Color
                        </option>
                    </select>
                </div>
                <div id='measureSamples'>
                    <div>Samples</div>
                    <select
                        className='dropdown'
                        defaultValue='100'
                        onChange={MeasureTool.changeSamples}
                    >
                        <option value='100'>100</option>
                        <option value='250'>250</option>
                        <option value='500'>500</option>
                        <option value='1000'>1000</option>
                        <option value='2000'>2000</option>
                    </select>
                </div>
                <div id='measureUnit'>
                    <div>Unit</div>
                    <select
                        className='dropdown'
                        defaultValue='meters'
                        onChange={MeasureTool.changeDistDisplayUnit}
                    >
                        <option value='meters'>M</option>
                        <option value='kilometers'>KM</option>
                    </select>
                </div>
            </div>
            <div
                id='measureGraph'
                onMouseLeave={() => {
                    MeasureTool.clearFocusPoint()
                }}
            >
                <Line
                    ref={refLine}
                    data={{
                        labels: MeasureTool.lastData.map((d) => {
                            const xAxes = parseInt(d[2], 10)
                            return distDisplayUnit == 'kilometers'
                                ? (xAxes / 1000).toFixed(2)
                                : xAxes
                        }),
                        datasets: [
                            {
                                label: 'Profile',
                                data: profileData,
                                segment: {
                                    backgroundColor: (ctx) => {
                                        const i =
                                            MeasureTool.datasetMapping[
                                                ctx.p0DataIndex
                                            ] - 1
                                        if (mode === 'continuous_color') {
                                            return MeasureTool.getColor(i, 0.1)
                                        } else
                                            return i % 2 === 0
                                                ? 'rgba(255, 0, 47, 0.2)'
                                                : 'rgba(255, 0, 47, 0.1)'
                                    },
                                    borderColor: (ctx) => {
                                        const i =
                                            MeasureTool.datasetMapping[
                                                ctx.p0DataIndex
                                            ] - 1
                                        if (mode === 'continuous_color')
                                            return MeasureTool.getColor(i)
                                        else
                                            return i % 2
                                                ? 'rgba(255, 80, 112, 1)'
                                                : 'rgba(255, 0, 47, 1)'
                                    },
                                },
                                spanGaps: true,
                                borderWidth: 1,
                                fill: 'start',
                                pointRadius: 6,
                                pointHitRadius: 6,
                                pointBackgroundColor: 'rgba(0,0,0,0)',
                                pointBorderColor: 'rgba(0,0,0,0)',
                                pointHoverBackgroundColor: 'yellow',
                                pointHoverBorderColor: '#1f1f1f',
                            },
                        ],
                    }}
                    height={150}
                    options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false,
                            },
                            tooltip: {
                                intersect: false,
                                mode: 'nearest',
                                titleAlign: 'left',
                                bodyAlign: 'right',
                                callbacks: {
                                    title: (item) =>
                                        `${MeasureTool.lastData[
                                            item[0].parsed.x
                                        ][2].toFixed(2)}${
                                            distDisplayUnit === 'meters'
                                                ? 'm'
                                                : 'km'
                                        } From Start (2D)\n${MeasureTool.lastData[
                                            item[0].parsed.x
                                        ][3].toFixed(2)}${
                                            distDisplayUnit === 'meters'
                                                ? 'm'
                                                : 'km'
                                        } (3D)`,
                                    label: (item) =>
                                        `Elevation: ${item.parsed.y.toFixed(
                                            3
                                        )}m`,
                                    labelColor: () => {
                                        return {
                                            backgroundColor: 'yellow',
                                            borderColor: 'black',
                                            borderRadius: 6,
                                        }
                                    },
                                },
                            },
                        },
                        layout: {
                            padding: {
                                top: 16,
                                left: 4,
                                right: 4,
                                bottom: 0,
                            },
                        },
                        scales: {
                            y: {
                                grid: {
                                    color: 'rgba(255,255,255,0.05)',
                                },
                                ticks: {
                                    callback: function (value, index, values) {
                                        return `${value}m`
                                    },
                                    lineHeight: 1.5,
                                },
                            },
                        },
                        onHover: (e, el, el2) => {
                            if (el[0]) {
                                const d = MeasureTool.lastData[el[0].index]
                                MeasureTool.makeFocusPoint(d[1], d[0], d[4])
                            } else if (refLine && e.x != null) {
                                const chartArea = refLine.current.chartArea
                                const bestIndex = Math.round(
                                    F_.linearScale(
                                        [chartArea.left, chartArea.right],
                                        [0, profileData.length],
                                        e.x
                                    )
                                )
                                if (
                                    bestIndex >= 0 &&
                                    bestIndex < MeasureTool.lastData.length
                                ) {
                                    const d = MeasureTool.lastData[bestIndex]
                                    MeasureTool.makeFocusPoint(d[1], d[0], d[4])
                                }
                            }
                        },
                        pan: {
                            enabled: true,
                            mode: 'x',
                        },
                        zoom: {
                            enabled: true,
                            mode: 'x',
                            speed: 1 / steps,
                            threshold: 0,
                            sensitivity: 0,
                        },
                    }}
                />
            </div>
            <div id='measureToolBar'>
                <div
                    id='measureReset'
                    title='Reset Graph'
                    onClick={() => {
                        if (refLine) refLine.current.chartInstance.resetZoom()
                    }}
                >
                    <i className='mdi mdi-restore mdi-18px'></i>
                </div>
                <div
                    id='measureDownload'
                    title='Download'
                    onClick={MeasureTool.download}
                >
                    <i className='mdi mdi-download mdi-18px'></i>
                </div>
            </div>
        </div>
    )
}

let MeasureTool = {
    height: 150,
    width: 'full',
    disableLayerInteractions: true,
    vars: {},
    data: [],
    lastData: [],
    mapFocusMarker: null,
    colorRamp: [
        '#e60049',
        '#0bb4ff',
        '#50e991',
        '#e6d800',
        '#9b19f5',
        '#ffa300',
        '#dc0ab4',
        '#b3d4ff',
        '#00bfa0',
        '#f0cccc',
        //Same as above but with +25% lightness (mostly)
        '#ff6696',
        '#8adcff',
        '#bff7d7',
        '#fff566',
        '#d093fb',
        '#ffd080',
        '#f86ddf',
        '#ffffff',
        '#3dffdf',
        '#cc5200',
    ],
    init: function () {},
    make: function () {
        Map_.rmNotNull(measureToolLayer)
        MeasureTool.data = []
        MeasureTool.lastData = []
        MeasureTool.datasetMapping = []
        distDisplayUnit = 'meters'
        mode = 'segment'
        steps = 100

        //Get tool variables
        this.vars = L_.getToolVars('measure')

        ReactDOM.render(<Measure />, document.getElementById('tools'))
    },
    destroy: function () {
        ReactDOM.unmountComponentAtNode(document.getElementById('tools'))

        Map_.map
            .off('click', MeasureTool.clickMap)
            .off('mousemove', MeasureTool.moveMap)
            .off('mouseout', MeasureTool.mouseOutMap)

        const globeCont = Globe_.litho.getContainer()
        globeCont.removeEventListener(
            'mousedown',
            MeasureTool.mouseDownGlobe,
            false
        )
        globeCont.removeEventListener('mouseup', MeasureTool.clickGlobe, false)
        globeCont.removeEventListener('mousemove', MeasureTool.moveGlobe, false)
        globeCont.removeEventListener(
            'mouseout',
            MeasureTool.mouseOutMap,
            false
        )

        Viewer_.imageViewerMap.removeHandler(
            'canvas-click',
            MeasureTool.clickViewer
        )
        $('#map').css({ cursor: 'grab' })
        Viewer_.imageViewer.style('cursor', 'map')

        Map_.rmNotNull(distLineToMouse)
        Map_.rmNotNull(distMousePoint)
        Map_.rmNotNull(measureToolLayer)

        Globe_.litho.removeLayer('_measure')
        Globe_.litho.removeLayer('_measurePoint')
        Globe_.litho.removeLayer('_measurePolyline')

        CursorInfo.hide()

        MeasureTool.clearFocusPoint()
    },
    clickMap: function (e) {
        if (mode === 'segment' && clickedLatLngs.length >= 2) {
            clickedLatLngs = []
            profileData = []
            updateProfileData(profileData)
            MeasureTool.data = []
            MeasureTool.lastData = []
            MeasureTool.datasetMapping = []
            MeasureTool.clearFocusPoint()
            Map_.rmNotNull(distLineToMouse)
            Map_.rmNotNull(distMousePoint)
        }
        CursorInfo.hide()
        MeasureTool.clearFocusPoint()

        var xy = { x: e.latlng.lat, y: e.latlng.lng }
        clickedLatLngs.push(xy)

        makeMeasureToolLayer()
        makeProfile()
    },
    moveMap: function (e) {
        if (
            mode === 'continuous' ||
            mode === 'continuous_color' ||
            clickedLatLngs.length === 1
        )
            makeGhostLine(e.latlng.lng, e.latlng.lat)
    },
    mouseOutMap: function (e) {
        if (distLineToMouse != null) {
            Map_.map.removeLayer(distLineToMouse)
            Globe_.litho.removeLayer('_measure')
            distLineToMouse = null
        }
        if (distMousePoint != null) {
            Map_.map.removeLayer(distMousePoint)
            distMousePoint = null
        }
        CursorInfo.hide()
    },
    mouseDownGlobe: function (e) {
        globeMouseDownXY = { x: e.x, y: e.y }
    },
    clickGlobe: function (e) {
        // Make sure the click isn't a drag
        if (
            Math.abs(globeMouseDownXY.x - e.x) > 3 ||
            Math.abs(globeMouseDownXY.y - e.y) > 3
        )
            return
        if (mode === 'segment' && clickedLatLngs.length >= 2) {
            clickedLatLngs = []
            profileData = []
            updateProfileData(profileData)
            MeasureTool.data = []
            MeasureTool.lastData = []
            MeasureTool.clearFocusPoint()
            Map_.rmNotNull(distLineToMouse)
            Map_.rmNotNull(distMousePoint)
        }
        CursorInfo.hide()
        MeasureTool.clearFocusPoint()

        var xy = { x: Globe_.litho.mouse.lat, y: Globe_.litho.mouse.lng }
        clickedLatLngs.push(xy)

        makeMeasureToolLayer()
        makeProfile()
    },
    moveGlobe: function (e) {
        if (
            (mode === 'continuous' ||
                mode === 'continuous_color' ||
                clickedLatLngs.length === 1) &&
            Globe_.litho.mouse.lng != null &&
            Globe_.litho.mouse.lat != null
        ) {
            makeGhostLine(Globe_.litho.mouse.lng, Globe_.litho.mouse.lat)
        }
    },
    clickViewer: function (e) {
        // Convert that to viewport coordinates, the lingua franca of OpenSeadragon coordinates.
        var viewportPoint = Viewer_.imageViewerMap.viewport.pointFromPixel(
            e.position
        )
        // Convert from viewport coordinates to image coordinates.
        var xy =
            Viewer_.imageViewerMap.viewport.viewportToImageCoordinates(
                viewportPoint
            )
        xy.x = parseInt(xy.x)
        xy.y = parseInt(xy.y)
        makeBandProfile(xy)
    },
    makeFocusPoint(lat, lng, z) {
        MeasureTool.clearFocusPoint()
        MeasureTool.mapFocusMarker = new L.circleMarker([lat, lng], {
            fillColor: 'yellow',
            fillOpacity: 1,
            color: '#0f0f0f',
            weight: 2,
        })
            .setRadius(6)
            .addTo(Map_.map)
        Globe_.litho.addLayer(
            'vector',
            {
                name: '_measurePoint',
                id: '_measurePoint',
                on: true,
                opacity: 1,
                order: 2,
                minZoom: 0,
                maxZoom: 30,
                style: {
                    default: {
                        fillColor: 'yellow',
                        color: '#000',
                        weight: 2,
                        radius: 8,
                    },
                },
                geojson: {
                    type: 'FeatureCollection',
                    features: [
                        {
                            type: 'Feature',
                            geometry: {
                                type: 'Point',
                                coordinates: [[lng, lat, 2 + z]],
                            },
                        },
                    ],
                },
            },
            1
        )
    },
    clearFocusPoint() {
        Map_.rmNotNull(MeasureTool.mapFocusMarker)
        Globe_.litho.removeLayer('_measurePoint')
    },
    undo: function (e) {
        clickedLatLngs.pop()
        if (profileData.length - steps >= 0)
            profileData = profileData.slice(0, profileData.length - steps)

        if (MeasureTool.data.length - steps >= 0)
            MeasureTool.data = MeasureTool.data.slice(
                0,
                MeasureTool.data.length - steps
            )
        // Twice because we also want to replace the last last data seg
        if (MeasureTool.data.length - steps >= 0)
            MeasureTool.data = MeasureTool.data.slice(
                0,
                MeasureTool.data.length - steps
            )

        makeMeasureToolLayer()
        Globe_.litho.removeLayer('_measure')
        Globe_.litho.removeLayer('_measurePoint')
        Globe_.litho.removeLayer('_measurePolyline')

        MeasureTool.clearFocusPoint()

        makeProfile()
    },
    reset: function () {
        clickedLatLngs = []
        profileData = []
        MeasureTool.data = []
        MeasureTool.lastData = []
        MeasureTool.datasetMapping = []
        distDisplayUnit = 'meters'

        Map_.rmNotNull(distLineToMouse)
        Map_.rmNotNull(distMousePoint)
        Map_.rmNotNull(measureToolLayer)
        Globe_.litho.removeLayer('_measure')
        Globe_.litho.removeLayer('_measurePoint')
        Globe_.litho.removeLayer('_measurePolyline')

        d3.select('#' + profileDivId)
            .selectAll('*')
            .remove()
        d3.select('#' + profileDivId)
            .append('div')
            .style('text-align', 'center')
            .style('line-height', '140px')
            .style('font-size', '20px')
            .html('Click on the map!')

        MeasureTool.clearFocusPoint()

        updateProfileData([])
    },
    changeMode: function (e) {
        MeasureTool.reset()
        mode = e.target.value || 'segment'
    },
    changeSamples: function (e) {
        if (clickedLatLngs.length > 2) {
            MeasureTool.reset()
        }
        steps = parseInt(e.target.value, 10) || 100
        makeProfile()
    },
    changeDistDisplayUnit: function (e) {
        MeasureTool.reset()
        distDisplayUnit = e.target.value
    },
    download: function (e) {
        F_.downloadArrayAsCSV(
            ['longitude', 'latitude', 'distance', 'distance_3d', 'elevation'],
            MeasureTool.lastData,
            'profiledata'
        )
    },
    getColor: function (idx, alpha) {
        if (alpha != null) {
            const rgb = F_.hexToRGB(
                MeasureTool.colorRamp[idx % MeasureTool.colorRamp.length] ||
                    '#FFFFFF'
            ) || { r: 255, g: 255, b: 255 }
            return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
        } else
            return (
                MeasureTool.colorRamp[idx % MeasureTool.colorRamp.length] ||
                '#FFFFFF'
            )
    },
}

function makeMeasureToolLayer() {
    Map_.rmNotNull(measureToolLayer)

    var pointsAndPathArr = []
    var polylinePoints = []
    var temp
    for (var i = 0; i < clickedLatLngs.length; i++) {
        temp = new L.circleMarker([clickedLatLngs[i].x, clickedLatLngs[i].y], {
            fillColor: i == 0 ? 'lime' : 'black',
            fillOpacity: 1,
            color: i == 0 ? 'black' : 'white',
            weight: 2,
        }).setRadius(i == 0 ? 6 : 4)
        if (i > 0) {
            var roundedDist =
                Math.round(
                    F_.lngLatDistBetween(
                        clickedLatLngs[i].y,
                        clickedLatLngs[i].x,
                        clickedLatLngs[i - 1].y,
                        clickedLatLngs[i - 1].x
                    ) * rAm
                ) / rAm
            if (F_.dam)
                roundedDist =
                    Math.round(
                        F_.distanceFormula(
                            clickedLatLngs[i].y,
                            clickedLatLngs[i].x,
                            clickedLatLngs[i - 1].y,
                            clickedLatLngs[i - 1].x
                        ) * rAm
                    ) / rAm
            var roundedTotalDist =
                Math.round(totalDistToIndex(i + 1) * rAm) / rAm
            var distAzimuth =
                Math.round(
                    F_.bearingBetweenTwoLatLngs(
                        clickedLatLngs[0].x,
                        clickedLatLngs[0].y,
                        clickedLatLngs[i].x,
                        clickedLatLngs[i].y
                    ) * rAm
                ) / rAm
            if (distAzimuth < 0) distAzimuth = 360 + distAzimuth //Map to 0 to 360 degrees
            if (i == clickedLatLngs.length - 1) {
                if (distDisplayUnit == 'meters') {
                    temp.bindTooltip(
                        '' + roundedTotalDist + 'm ' + distAzimuth + '&deg;',
                        {
                            permanent: true,
                            direction: 'right',
                            className: 'distLabel',
                            offset: [4, 0],
                        }
                    )
                } else if (distDisplayUnit == 'kilometers') {
                    temp.bindTooltip(
                        '' +
                            (roundedTotalDist / 1000).toFixed(2) +
                            'km ' +
                            distAzimuth +
                            '&deg;',
                        {
                            permanent: true,
                            direction: 'right',
                            className: 'distLabel',
                            offset: [4, 0],
                        }
                    )
                }
            }
        }
        pointsAndPathArr.push(temp)
        polylinePoints.push(
            new L.LatLng(clickedLatLngs[i].x, clickedLatLngs[i].y)
        )
    }
    const segments = []
    for (let i = 1; i < polylinePoints.length; i++) {
        segments.push(
            new L.Polyline([polylinePoints[i - 1], polylinePoints[i]], {
                color:
                    mode === 'continuous_color'
                        ? MeasureTool.getColor(i - 1)
                        : mode === 'continuous'
                        ? i % 2
                            ? '#ff002f'
                            : '#ff5070'
                        : '#ff002f',
                weight: 3,
            })
        )
    }
    pointsAndPathArr.unshift(...segments)
    measureToolLayer = L.featureGroup(pointsAndPathArr).addTo(Map_.map)

    makeGlobePolyline(polylinePoints)
}
function makeProfile() {
    var numOfPts = clickedLatLngs.length
    if (numOfPts > 1 && MeasureTool.vars.dem) {
        var pathDEM = 'Missions/' + L_.mission + '/' + MeasureTool.vars.dem
        //elevPoints.push([{"x": clickedLatLngs[numOfPts - 2].x, "y": clickedLatLngs[numOfPts - 2].y}, {"x": clickedLatLngs[numOfPts - 1].x, "y": clickedLatLngs[numOfPts - 1].y}]);
        elevPoints = [
            {
                x: clickedLatLngs[numOfPts - 2].x,
                y: clickedLatLngs[numOfPts - 2].y,
            },
            {
                x: clickedLatLngs[numOfPts - 1].x,
                y: clickedLatLngs[numOfPts - 1].y,
            },
        ]
        var ePLast = elevPoints.length - 1

        var axes = 'z'
        if (
            MeasureTool.vars.hasOwnProperty('axes') &&
            MeasureTool.vars.axes.toLowerCase() == 'xyz'
        ) {
            axes = 'xyz'
        }

        $.ajax({
            type: calls.getprofile.type,
            url: calls.getprofile.url,
            data: {
                type: '2pts',
                lat1: elevPoints[0].x,
                lon1: elevPoints[0].y,
                lat2: elevPoints[1].x,
                lon2: elevPoints[1].y,
                steps: steps,
                path: calls.getprofile.pathprefix + pathDEM,
                axes: axes,
            },
            success: function (data) {
                d3.select('#' + profileDivId)
                    .selectAll('*')
                    .remove()
                if (data.length < 3) {
                    console.warn(
                        'Warning: MeasureTool: No elevation data found in ' +
                            pathDEM
                    )
                    MeasureTool.reset()
                    return
                }
                try {
                    data = data.replace(/[\n\r]/g, '')
                    data = JSON.parse(data)
                } catch (err) {
                    console.log(err)
                    // Fake a line between the most then
                    data = [
                        [elevPoints[0].y, elevPoints[0].x, 0],
                        [elevPoints[1].y, elevPoints[1].x, 0],
                    ]
                }

                if (mode === 'segment') MeasureTool.data = F_.clone(data)
                else {
                    MeasureTool.data = MeasureTool.data || []
                    MeasureTool.data = MeasureTool.data.concat(F_.clone(data))
                }

                MeasureTool.lastData = F_.clone(MeasureTool.data)
                MeasureTool.datasetMapping = MeasureTool.datasetMapping || []
                MeasureTool.datasetMapping = MeasureTool.datasetMapping.concat(
                    new Array(steps).fill(numOfPts - 1)
                )

                let currentDataset = 0
                let currentDatasetStart = 0
                let lastDistance = 0
                let lastDistance3d = 0
                let currentDatasetDistanceStart = 0

                for (let i = 0; i < MeasureTool.lastData.length; i++) {
                    let distance = 0
                    let distance3d = 0
                    if (MeasureTool.datasetMapping[i] - 1 !== currentDataset) {
                        currentDataset = MeasureTool.datasetMapping[i] - 1
                        currentDatasetStart = i
                        currentDatasetDistanceStart = lastDistance
                    }
                    if (i > 0 && i < MeasureTool.lastData.length) {
                        distance =
                            F_.lngLatDistBetween(
                                MeasureTool.lastData[i][0],
                                MeasureTool.lastData[i][1],
                                MeasureTool.lastData[currentDatasetStart][0],
                                MeasureTool.lastData[currentDatasetStart][1]
                            ) + currentDatasetDistanceStart
                        // Pythag theorem
                        // Calculates the hypotenuse between each sample point
                        // 2d distance is one leg and elevation difference is the second leg
                        // 4 in lastData[i - 1] because we're shifting the distances to 2 and 3
                        distance3d = Math.sqrt(
                            Math.pow(
                                F_.lngLatDistBetween(
                                    MeasureTool.lastData[i][0],
                                    MeasureTool.lastData[i][1],
                                    MeasureTool.lastData[i - 1][0],
                                    MeasureTool.lastData[i - 1][1]
                                ),
                                2
                            ) +
                                Math.pow(
                                    Math.abs(
                                        MeasureTool.lastData[i][2] -
                                            MeasureTool.lastData[i - 1][4]
                                    ),
                                    2
                                )
                        )
                        distance3d += lastDistance3d

                        lastDistance3d = distance3d
                        if (F_.dam) {
                            distance = F_.metersToDegrees(distance)
                            distance3d = F_.metersToDegrees(distance3d)
                        }
                    }
                    lastDistance = distance
                    MeasureTool.lastData[i].splice(2, 0, distance)
                    MeasureTool.lastData[i].splice(3, 0, distance3d)
                }

                profileData = []
                for (var i = 0; i < MeasureTool.data.length; i++) {
                    profileData.push(MeasureTool.data[i][2])
                }
                //profileData = profileData.concat(data);
                //var latestDistPerStep = latLongDistBetween(elevPoints[0].y, elevPoints[0].x, elevPoints[1].y, elevPoints[1].x) / steps;
                var usedData = profileData
                //if(profileMode == "slope") {
                //  usedData = elevsToSlope
                var multiplyElev = MeasureTool.vars.multiplyelev || 1

                updateProfileData(profileData)

                Globe_.litho.removeLayer('_measurePoint')

                makeMeasureToolLayer()
                //getCorrectedProfileData();
                //isComplete = true;
            },
        })
    }
}
function makeBandProfile(xy) {
    $.ajax({
        type: calls.getbands.type,
        url: calls.getbands.url,
        data: {
            type: 'band',
            path: Viewer_.masterImg,
            x: xy.x,
            y: xy.y,
            xyorll: 'xy',
            bands: '[[1,489]]',
        },
        success: function (data) {
            d3.select('#' + profileDivId)
                .selectAll('*')
                .remove()
            //Convert python's Nones to nulls
            data = data.replace(/none/gi, 'null')
            try {
                data = JSON.parse($.parseJSON(data))
            } catch (e) {
                console.warn('Failed to query image: ' + Viewer_.masterImg)
                return
            }
            var newData = []
            for (var i = 0; i < data.length; i++) {
                newData.push({ Wavelength: data[i][0], Value: data[i][1] })
            }
            metricsGraphics.data_graphic({
                chart_type: 'line',
                data: newData,
                area: false,
                missing_is_hidden: true,
                interpolate: d3.curveLinearClosed,
                full_height: true,
                full_width: true,
                left: 95,
                right: 30,
                top: 20,
                target: document.getElementById(profileDivId),
                x_label: 'Wavelength',
                xax_format: function (d) {
                    return d + ' nm'
                },
                y_label: 'I/F',
                x_accessor: 'Wavelength',
                y_accessor: 'Value',
            })
            //ugly hack to reopen chart path
            $('.mg-main-line').each(function (idx) {
                var path = $(this).attr('d')
                if (path != null) {
                    path = path.replace(/z/gi, '')
                    $(this).attr('d', path)
                }
            })
        },
    })
}

function makeGhostLine(lng, lat) {
    if (clickedLatLngs.length > 0) {
        if (distLineToMouse != null) {
            Map_.map.removeLayer(distLineToMouse)
            distLineToMouse = null
        }
        if (distMousePoint != null) {
            Map_.map.removeLayer(distMousePoint)
            distMousePoint = null
        }

        var i1 = clickedLatLngs.length - 1
        var endDC = clickedLatLngs[i1]

        var distAzimuth =
            Math.round(
                F_.bearingBetweenTwoLatLngs(
                    clickedLatLngs[0].x,
                    clickedLatLngs[0].y,
                    lat,
                    lng
                ) * rAm
            ) / rAm
        if (distAzimuth < 0) distAzimuth = 360 + distAzimuth //Map to 0 to 360 degrees
        var roundedDist =
            Math.round(
                F_.lngLatDistBetween(
                    clickedLatLngs[i1].y,
                    clickedLatLngs[i1].x,
                    lng,
                    lat
                ) * rAm
            ) / rAm
        if (F_.dam)
            roundedDist =
                Math.round(
                    F_.distanceFormula(
                        clickedLatLngs[i1].y,
                        clickedLatLngs[i1].x,
                        lng,
                        lat
                    ) * rAm
                ) / rAm
        //using actual latlng as meters:
        //var roundedDist = Math.round(Math.sqrt(Math.pow(clickedLatLngs[i1].x - e.latlng.lat, 2) + Math.pow(clickedLatLngs[i1].y - e.latlng.lng, 2)) * 10)/10;
        var roundedTotalDist =
            Math.round(
                (totalDistToIndex(clickedLatLngs.length) + roundedDist) * rAm
            ) / rAm
        distLineToMouse = new L.Polyline(
            [new L.LatLng(endDC['x'], endDC['y']), { lat: lat, lng: lng }],
            {
                className: 'noPointerEvents',
                color: 'white',
                dashArray: '3, 15',
            }
        ).addTo(Map_.map)
        distMousePoint = new L.circleMarker(
            { lat: lat, lng: lng },
            { className: 'noPointerEvents', color: 'red' }
        ).setRadius(3)

        Globe_.litho.removeLayer('_measure')

        Globe_.litho.addLayer(
            'vector',
            {
                name: '_measure',
                id: '_measure',
                on: true,
                order: 2,
                opacity: 1,
                minZoom: 0,
                maxZoom: 30,
                style: {
                    default: {
                        fillColor: 'white',
                        weight: 5,
                    },
                },
                geojson: {
                    type: 'FeatureCollection',
                    features: [
                        {
                            type: 'Feature',
                            geometry: {
                                type: 'LineString',
                                coordinates: [
                                    [
                                        endDC['y'],
                                        endDC['x'],
                                        3 +
                                            Globe_.litho.getElevationAtLngLat(
                                                endDC['y'],
                                                endDC['x']
                                            ),
                                    ],
                                    [
                                        lng,
                                        lat,
                                        3 +
                                            Globe_.litho.getElevationAtLngLat(
                                                lng,
                                                lat
                                            ),
                                    ],
                                ],
                            },
                        },
                    ],
                },
            },
            null,
            1
        )
        //distMousePoint.bindTooltip("" + roundedTotalDist + "m\n (+" + roundedDist + "m) " + distAzimuth + "&deg;",
        //  {permanent: true, direction: 'right', className: "distLabel", className: "noPointerEvents", offset: [15,-15]})
        //distMousePoint.addTo(Map_.map);
        if (distDisplayUnit == 'meters') {
            CursorInfo.update(
                `${roundedTotalDist}m ${
                    mode === 'continuous' ? `(+${roundedDist}m)` : ''
                } ${distAzimuth}&deg;`,
                null,
                false,
                null,
                null,
                null,
                true
            )
        } else if (distDisplayUnit == 'kilometers') {
            CursorInfo.update(
                `${(roundedTotalDist / 1000).toFixed(2)}km ${
                    mode === 'continuous'
                        ? `(+${(roundedDist / 1000).toFixed(2)}km)`
                        : ''
                } ${distAzimuth}&deg;`,
                null,
                false,
                null,
                null,
                null,
                true
            )
        }
    }
}

function totalDistToIndex(l) {
    var totalDistance = 0
    for (var i = 1; i < l; i++) {
        //Sum up segment distance
        if (F_.dam) {
            totalDistance += F_.distanceFormula(
                clickedLatLngs[i].y,
                clickedLatLngs[i].x,
                clickedLatLngs[i - 1].y,
                clickedLatLngs[i - 1].x
            )
        } else {
            totalDistance += F_.lngLatDistBetween(
                clickedLatLngs[i].y,
                clickedLatLngs[i].x,
                clickedLatLngs[i - 1].y,
                clickedLatLngs[i - 1].x
            )
        }
        //using actual latlng as meters:
        //totalDistance += Math.sqrt(Math.pow(clickedLatLngs[i].x - clickedLatLngs[i-1].x, 2) + Math.pow(clickedLatLngs[i].y - clickedLatLngs[i-1].y, 2));
    }
    return totalDistance
}

function makeGlobePolyline(polylinePoints) {
    const features = []
    for (let i = 1; i < polylinePoints.length; i++) {
        features.push({
            type: 'Feature',
            properties: {
                color:
                    mode === 'continuous_color'
                        ? MeasureTool.getColor(i - 1)
                        : mode === 'continuous'
                        ? i % 2
                            ? '#ff002f'
                            : '#ff5070'
                        : '#ff002f',
            },
            geometry: {
                type: 'LineString',
                coordinates: [
                    [polylinePoints[i - 1].lng, polylinePoints[i - 1].lat],
                    [polylinePoints[i].lng, polylinePoints[i].lat],
                ],
            },
        })
    }

    const globeBCR = Globe_.litho.getContainer()?.getBoundingClientRect() || {}
    if (globeBCR.width > 0)
        Globe_.litho.addLayer('clamped', {
            name: '_measurePolyline',
            id: '_measurePolyline',
            on: true,
            order: 10,
            opacity: 1,
            minZoom: 0,
            maxZoom: 30,
            style: {
                default: {
                    weight: 3,
                    color: 'prop=color',
                },
            },
            geojson: {
                type: 'FeatureCollection',
                features: features,
            },
        })
}

MeasureTool.init()

export default MeasureTool
