// const axios = window.axios;

var dataList;          // holds json for both requests

/// API Requests for dataList ///

// data for county info
var url = 'https://raw.githubusercontent.com/no-stack-dub-sack/testable-projects-fcc/master/src/data/choropleth_map/for_user_education.json';

// data for map coordinates
var coordUrl = 'https://raw.githubusercontent.com/no-stack-dub-sack/testable-projects-fcc/master/src/data/choropleth_map/counties.json'

async function apiRequests() {  // synchronize API calls

    const response = await Promise.all([ fetch(`${url}`), fetch(`${coordUrl}`) ]);      // wait for each fetch to return a response in that order
    const json = await Promise.all(response.map( obj => obj.json() ) );                 // convert each response to json obj

    return json;

}

// main script will go here and execute after requests are done
(async () => {
    dataList = await apiRequests().catch(alert);

    let countyData = dataList[0];

    /// D3 Implementation ///

    const min = d3.min(countyData, d => d.bachelorsOrHigher);
    const max = d3.max(countyData, d => d.bachelorsOrHigher);

    // height and width for svg //
    const w = 1100;
    const h = 700;

    /// D3 Projection ///

    // Define Path Generator. Renders a GeoJSON (or in this case TopoJSON) object(s): 
    // Polygon, Multipolygon, and GeometryCollection
    const path = d3.geoPath();                
                    
    // main graph container //
    const svg = d3.select('#main')
                .append('svg')
                .attr('width', w)
                .attr('height', h);

    // color interpolater //
    const color = d3.scaleQuantize()        // note use d3 color scales when refactoring D3 projects
                    .domain([3,75])         // set the range from lowest to highest range
                    .range(d3.schemeOranges[8]);

    // scaling of legend items //
    const x = d3.scaleLinear()
                .domain(d3.extent(color.domain() ) )
                .rangeRound( [600, 850] );

    // create squares of legend using <rect>
    const g = svg.append('g')   // group element containing legend
                .attr('id', 'legend')

    // draw rect elements for legend
    g.attr('transform', 'translate(0,40)')
    .selectAll('rect')
    .data( color.range().map( d => color.invertExtent(d) ) )     // treat each individual color as a data entry point 
    .enter()
    .append('rect')
    .attr('height', 10)
    .attr('width', d => x(d[1]) - x(d[0]) )         // each color holds a value 1-8 and is scaled by x from 600-850
    .attr('x', d => x(d[0]))                        // set beginning of each block at the scaled location of color
    .attr('fill', d => color(d[0]));
    
    // define xAxis to legend
    const xAxis = d3.axisBottom(x)
                    .tickFormat(d => d + '%')
                    .tickValues( color.range().slice(0).map(d => color.invertExtent(d)[0]) )    // iterates through indices of color array
                    .tickSize(10);
    // call xAxis
    g.call(xAxis)
        .select('.domain')  // removes horizontal line of xAxis
        .remove();

    // tooltip //
    let tooltip = d3.select('body')
                    .append('div')
                    .attr('id', 'tooltip')
                    .style('z-index', '10')
                    .style('visibility', 'hidden');

    // TopoJSON will drawing pathway of TopoJSON objects  //
    d3.json(coordUrl).then( (data) => {

        // counties //
        svg.append('g')
            .selectAll('path')
            .data( topojson.feature(data, data.objects.counties).features ) // returns GeoJSON Feature or FeatureCollection (latter in this case). 
            .enter()
            .append('path')
            .attr('data-fips', d => d.id)
            .attr('data-education', d => {
                let match = countyData.find( (elem) => {
                    return elem.fips === d.id;
                })
                // console.log(match)
                return match.bachelorsOrHigher;
            })
            .attr("d", path)
            .attr('class', 'county')
            .attr('fill', function(d) {
                // formula for calculating index of color
                let index = Math.floor( (d3.select(this).attr('data-education') - 3) / 9 );
                if(index === -1)   // workaround. one value is below 3%
                    return 'white';
                return color.range()[index];
            })
            .on('mouseover', d => {
                let match = countyData.find( (elem) => { // not very efficient, but match county obj and use that data for tooltip
                    return elem.fips === d.id;
                });

                let content = `${match.area_name}, ${match.state}: ${match.bachelorsOrHigher}%`;

                return tooltip.html(content)
                        .attr('data-education', match.bachelorsOrHigher) 
                        .style("top", d3.event.pageY - 15 + "px")
                        .style("left", d3.event.pageX + 5 + "px")
                        .style('visibility', 'visible');
            })
            .on('mouseout', () => {
                return tooltip.style('visibility', 'hidden');
            })

        // states (for boundaries) //                                                                    
        svg.append("path")
            .datum(topojson.mesh(data, data.objects.states, (a, b) => a !== b)) // draws state borders. if path is shared, it is ignored
            .attr("fill", "none")
            .attr("stroke", "white")
            .attr("stroke-linejoin", "round")   // rounds out corners of paths when they are stroked (MDN)
            .attr("d", path);

    });

})();