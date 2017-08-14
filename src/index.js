// Web Application to purpose match contents from Instagram data
// Author : Pierre PETILLON, 4th year student at the graduate school of engineering
// University of Nantes (Polytech Nantes)
// Property : Vrije Universiteit Brussel, in Brussels, Belgium.

// Import of necessary modules and style sheet.

// Library D3.js (https://d3js.org/)
import * as d3 from 'd3';

// Library jQuery (https://jquery.com/)
import $ from 'jquery';

// Module node.js d3bboxCollide to manage collision detection
import { bboxCollide as d3collide } from 'd3-bboxCollide';

// Module node.js d3radial to make a circle with graphic elements
import d3radial from 'd3-radial';

// Style sheet
import './style/style.scss';

// Function to load your personal data from instagram
// It needs the access token of your account to make it works fine.
// In that function, there are a function call to load Flickr relative data
function loadInstagramData (token) {
  const loadInformation = $.ajax({
    url: 'https://api.instagram.com/v1/users/self/media/recent',
    dataType: 'jsonp',
    method: 'GET',
    data: { access_token: token }
  });

  loadInformation.done((d) => {
    const instagramDataArray = [];
    const instagramTagsArray = [];
    const instagramTagsDateArray = [];
    d.data.forEach((img) => {
      const tmpTagsArray = img.tags;
      const realDate = new Date(img.created_time * 1000);
      tmpTagsArray.forEach((tag) => {
        instagramTagsArray.push(tag);
        instagramTagsDateArray.push(realDate);
        instagramDataArray.push({
          relatedTag: tag,
          date: realDate,
          image: img.images.standard_resolution.url,
          frequency: 1
        });
      });
    });
    loadFlickrData(instagramDataArray, instagramTagsArray, instagramTagsDateArray);
    console.log('Instagram data are loaded!');
  });

  loadInformation.fail(() => {
    console.log("Instagram aren't loaded");
  });
}

// Function to load a relative set of photos from Flickr
// You need to have an array for each important piece of information :
// - dataArray : Contains all the Instagram object you obtain with ajax call
// - tagsArray : Contains only all the tags from your Instagram posts
// - tagsDateArray : Contains only all the date for each of your Instagram posts
// At the end of this function, there is a function call to begin datavisualisation building
function loadFlickrData(dataArray, tagsArray, tagsDateArray) {
  const findMatchTags = $.map(tagsArray, (tag) => {
    return $.ajax({
      type: 'GET',
      dataType: 'jsonp',
      url: 'http://api.flickr.com/services/feeds/photos_public.gne',
      data: `tags=${tag}&tagmode=any&format=json&jsoncallback=?`
    });
  });

  $.when(...findMatchTags).done(function() {
    for (let i = 0; i < arguments.length; i++) {
      arguments[i][0].items.forEach((photos) => {
        const tmpStringTagsArray = photos.tags.split(' ');
        tmpStringTagsArray.forEach((stringTag) => {
          const result = dataArray.filter((obj) => {
            return obj.relatedTag === stringTag;
          });
          if (result.length > 0) {
            dataArray.forEach((obj) => {
              obj.frequency++;
            });
          } else {
            dataArray.push({
              relatedTag: stringTag,
              frequency: 1,
              image: photos.media.m,
              date: tagsDateArray[i],
              floorYearDate: d3.timeHour.offset(d3.timeYear.floor(tagsDateArray[i]), 2),
              floorMonthDate: d3.timeHour.offset(d3.timeMonth.floor(tagsDateArray[i]), 2),
              floorDayDate: d3.timeHour.offset(d3.timeDay.floor(tagsDateArray[i]), 2)
            });
          }
        });
      });
    }
    makeDataviz(dataArray);
  });
}

// Function to create a radio group button
// Indeed, it allows you to change the scale of the timeline
function createRadioGroup() {
  const form = d3.select('#app').append('div')
    .attr('id', 'form');

  form.append('input')
    .attr('id', 'r1')
    .attr('type', 'radio')
    .attr('name', 'radioButton')
    .attr('value', 'Year')
    .attr('checked', 'checked');

  form.append('label')
    .attr('for', 'r1')
    .text('Year');

  form.append('input')
    .attr('id', 'r2')
    .attr('type', 'radio')
    .attr('name', 'radioButton')
    .attr('value', 'Month');

  form.append('label')
    .attr('for', 'r2')
    .text('Month');

  form.append('input')
    .attr('id', 'r3')
    .attr('type', 'radio')
    .attr('name', 'radioButton')
    .attr('value', 'Week');

  form.append('label')
    .attr('for', 'r3')
    .text('Week');
}

// Function to create an arrow up button
// It allows you to move to the farthest date in the timeline
function createNavButtonUp () {
  d3.select('#app')
    .append('a')
    .attr('href', '#')
    .attr('class', 'arrow up');
}

// Function to create an arrow down button
// It allows you to move to the clothest date in the timeline
function createNavButtonDown() {
  d3.select('#app')
    .append('a')
    .attr('href', '#')
    .attr('class', 'arrow down');
}

// Function to nest all the data from Instagram and Flickr Ajax calls
// To use it, you need an array which contains all your json data
// Moreover, you also need the scale value to determine with which scale you want to nest your data
// At the end, you have a new data array nested by date first, and by photos then.
function nestData (dataArray, scaleValue) {
  dataArray.forEach((d) => {
    d.floorYearDate = d3.timeHour.offset(d3.timeYear.floor(d.date), 2);
    d.floorMonthDate = d3.timeHour.offset(d3.timeMonth.floor(d.date), 2);
    d.floorDayDate = d3.timeHour.offset(d3.timeDay.floor(d.date), 2);
  });

  if (scaleValue === 'Year') {
    return d3.nest().key((d) => {
      return d.floorYearDate;
    })
    .key((d) => {
      return d.image;
    })
    .entries(dataArray);
  } else if (scaleValue === 'Month') {
    return d3.nest().key((d) => {
      return d.floorMonthDate;
    })
    .key((d) => {
      return d.image;
    })
    .entries(dataArray);
  } else if (scaleValue === 'Week') {
    return d3.nest().key((d) => {
      return d.floorDayDate;
    })
    .key((d) => {
      return d.image;
    })
    .entries(dataArray);
  }
}

// Function to define the scope you use in your timeline.
// To do it properly, you have use your nested data array.
function defineScope(nestedData) {
  return d3.extent(nestedData, (d) => { return new Date(Date.parse(d.key)); });
}

// Function to define the domain you want to show in your datavisualisation
// For that, you need the scope of your nested data and the scale value
function defineDomain(scope, scaleValue) {
  if (scaleValue === 'Year') {
    return [scope[0], d3.timeYear.offset(scope[0], 1)];
  } else if (scaleValue === 'Month') {
    return [scope[0], d3.timeMonth.offset(scope[0], 1)];
  } else if (scaleValue === 'Week') {
    return [scope[0], d3.timeWeek.offset(scope[0], 2)];
  }
}

// Major function to build the datavisualisation
// To build it, you need your nested data array
// and all the functions used to create graphic elements
function makeDataviz (dataArray) {
  createRadioGroup();

  let scaleValue = d3.selectAll('input[type=radio]').attr('value');

  let nestedData = nestData(dataArray, scaleValue);

  const svg = d3.select('#app').append('svg')
    .attr('id', 'main_svg')
    .attr('width', window.innerWidth - 10)
    .attr('height', window.innerHeight - 70);

  createNavButtonUp();

  createNavButtonDown();

  const margin = { top: 100, right: 0, bottom: 30, left: 0 };

  const width = +svg.attr('width') - margin.left - margin.right;

  const height = +svg.attr('height') - margin.top - margin.bottom;

  createTimeline(scaleValue, null, null, nestedData, height, width, margin, null);

  d3.selectAll('input[type=radio]').on('change', function () {
    nestedData = nestData(dataArray, this.value);

    console.log(nestedData)

    d3.select('.axis').remove();
    d3.selectAll('.circleContainer').remove();

    scaleValue = this.value;

    createTimeline(scaleValue, null, null, nestedData, height, width, margin, null);
  });
}

// Function to get the format date from the selected scale value
// This function is used to display dates in the datavisualisation
function getDateFormat (scaleValue) {
  if (scaleValue === 'Year') {
    return d3.timeFormat('%Y');
  } else if (scaleValue === 'Month') {
    return d3.timeFormat('%m%y');
  } else if (scaleValue === 'Week') {
    return d3.timeFormat('W.%W %Y');
  }
  return null;
}

// Function to get the d3 time scale from the scale value
function getD3TimeScale (scaleValue) {
  if (scaleValue === 'Year') {
    return d3.timeYear;
  } else if (scaleValue === 'Month') {
    return d3.timeMonth;
  } else if (scaleValue === 'Week') {
    return d3.timeWeek;
  }
  return null;
}

// Function to adjust domain
// Indeed, it prevents infinite date which trigger some errors
// You need the domain of your timeline and the selected scale value
function adjustDomain (scaleValue, yDomain) {
  if (getDateFormat(scaleValue)(yDomain[0]) === getDateFormat(scaleValue)(yDomain[1])) {
    yDomain[1] = getD3TimeScale(scaleValue).offset(yDomain[1], 1);
  }
}

// Function to create ticks which display date labels
// To use it, you need the graphical axis and the selected scale value
function createTicks(yAxis, scaleValue) {
  return yAxis.ticks(getD3TimeScale(scaleValue))
    .tickFormat(getDateFormat(scaleValue));
}

// Function to update the style of the up button
// It allows you to change the style of the button after a click on it.
function updateStyleButtonUp (scaleValue, scope, yDomain) {
  if (getD3TimeScale(scaleValue).offset(yDomain[1], 1) <= scope[1]) {
    d3.select('.up').style('border-bottom', '15px solid green');
  } else {
    d3.select('.up').style('border-bottom', '15px solid red');
  }
}

// Function to update the style of the down button
// It allows you to change the style of the button after a click on it.
function updateStyleButtonDown (scaleValue, scope, yDomain) {
  if (getD3TimeScale(scaleValue).offset(yDomain[0], -1) >= scope[0]) {
    d3.select('.down').style('border-top', '15px solid green');
  } else {
    d3.select('.down').style('border-top', '15px solid red');
  }
}

// Function to adjust the position of the date label and display them in nice way
function updateTicksPosition (g, scaleValue) {
  if (scaleValue === 'Year') {
    g.selectAll('.tick text')
      .attr('transform', () => {
        return 'translate(-115,0) rotate(20)';
      })
      .attr('class', 'ticktext');
  } else if (scaleValue === 'Month') {
    g.selectAll('.tick text')
      .attr('transform', () => {
        return 'translate(-110,0) rotate(20)';
      })
      .attr('class', 'ticktext');
  } else if (scaleValue === 'Week') {
    g.selectAll('.tick text')
      .attr('transform', () => {
        return 'translate(-80,0) rotate(20)';
      })
      .attr('class', 'ticktext');
  }
}

// Function to create the nested data for the domain which are visible in the datavisualisation

function createDomainNestedData (domainNestedData, nestedData, yDomain) {
  domainNestedData = [];

  nestedData.forEach((d) => {
    if ((new Date(Date.parse(d.key)) >= yDomain[0]) &&
      ((new Date(Date.parse(d.key))) <= yDomain[1])) {
      domainNestedData.push(d);
    }
  });
  return domainNestedData;
}

// Function to create the circle container to display circles
// which indicate that you have pasted photos on instagram
function createCircleContainer (domainNestedData, yDomain, scaleValue) {
  return d3.select('#main_svg').selectAll('.circleContainer')
    .data(domainNestedData)
    .enter()
    .append('g')
    .attr('class', 'circleContainer')
    .attr('id', (d) => {
      return `cc${getDateFormat(scaleValue)(new Date(d.key))}`;
    })
    .attr('year', (d) => {
      return getDateFormat('Year')(new Date(d.key));
    });
}

// Function used to update the timeline after a click levent on a button
function updateTimeline (oldDomainNestedData, domainNestedData, scaleValue, yAxis, yScale, yDomain, width, height, margin) {
  const sameDomainData = [];
  const oldDomainData = [];
  const newDomainData = [];

  oldDomainNestedData.forEach((d) => {
    if (domainNestedData.indexOf(d.key) !== -1) {
      sameDomainData.push(getDateFormat(scaleValue)(d.key));
    } else {
      oldDomainData.push(getDateFormat(scaleValue)(new Date(Date.parse(d.key))));
    }
  });

  domainNestedData.forEach((d) => {
    if (oldDomainNestedData.indexOf(d.key) === -1) {
      newDomainData.push(d);
    }
  });

  console.log(sameDomainData);
  console.log(oldDomainData);
  console.log(newDomainData);

  sameDomainData.forEach((d) => {
    d3.select(`#c${d}`)
      .attr('transform', 'translate(-100, 0)');
  });

  oldDomainData.forEach((d) => {
    d3.select(`#cc${d}`).remove();
    yScale.domain(yDomain).nice();
    d3.select('.axis').call(yAxis);
    updateTicksPosition(d3.select('.axis'), scaleValue);
  });

  newDomainData.forEach(() => {
    const circleContainer = createCircleContainer(domainNestedData, yDomain, scaleValue);
    addCircle(height, width, yScale, circleContainer, scaleValue, margin);
  });
}

// Function to create the timeline displayed in the datavisualisation
function createTimeline (scaleValue, scope, domainNestedData, nestedData, height, width, margin, yDomain) {
  const g = d3.select('#main_svg')
            .append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(${((width / 2) + 3)},0)`);

  if (scope === null) {
    scope = defineScope(nestedData);
    yDomain = defineDomain(scope, scaleValue);
  }

  adjustDomain(scaleValue, yDomain);

  const yScale = d3.scaleTime()
    .domain(yDomain)
    .nice()
    .range([height, margin.top]);

  const yAxis = d3.axisLeft(yScale);

  createTicks(yAxis, scaleValue);

  updateStyleButtonUp(scaleValue, scope, yDomain);

  updateStyleButtonDown(scaleValue, scope, yDomain);

  g.call(yAxis);

  updateTicksPosition(g, scaleValue);

  domainNestedData = createDomainNestedData(domainNestedData, nestedData, yDomain);

  const circleContainer = createCircleContainer(domainNestedData, yDomain, scaleValue);

  if (scaleValue === 'Year') {
    d3.select('.up')
      .on('click', () => {
        if (d3.timeYear.offset(yDomain[1], 1) <= scope[1]) {
          const oldDomainNestedData = domainNestedData;
          yDomain[0] = d3.timeYear.offset(yDomain[0], 1);
          yDomain[1] = d3.timeYear.offset(yDomain[1], 1);
          updateStyleButtonUp(scaleValue, scope, yDomain);
          updateStyleButtonDown(scaleValue, scope, yDomain);
          domainNestedData = createDomainNestedData(domainNestedData, nestedData, yDomain);
          updateTimeline(oldDomainNestedData, domainNestedData, scaleValue,
            yAxis, yScale, yDomain, width, height, margin);
        }
      });
    d3.select('.down')
      .on('click', () => {
        if (d3.timeYear.offset(yDomain[0], -1) >= scope[0]) {
          const oldDomainNestedData = domainNestedData;
          yDomain[0] = d3.timeYear.offset(yDomain[0], -1);
          yDomain[1] = d3.timeYear.offset(yDomain[1], -1);
          updateStyleButtonUp(scaleValue, scope, yDomain);
          updateStyleButtonDown(scaleValue, scope, yDomain);
          domainNestedData = createDomainNestedData(domainNestedData, nestedData, yDomain);
          updateTimeline(oldDomainNestedData, domainNestedData, scaleValue,
            yAxis, yScale, yDomain, width, height, margin);
        }
      });
  } else if (scaleValue === 'Month') {
    d3.select('.up')
      .on('click', () => {
        if (d3.timeMonth.offset(yDomain[1], 1) <= scope[1]) {
          const oldDomainNestedData = domainNestedData;
          yDomain[0] = d3.timeMonth.offset(yDomain[0], 1);
          yDomain[1] = d3.timeMonth.offset(yDomain[1], 1);
          updateStyleButtonUp(scaleValue, scope, yDomain);
          updateStyleButtonDown(scaleValue, scope, yDomain);
          domainNestedData = createDomainNestedData(domainNestedData, nestedData, yDomain);
          updateTimeline(oldDomainNestedData, domainNestedData, scaleValue,
            yAxis, yScale, yDomain, width, height, margin);
        }
      });
    d3.select('.down')
      .on('click', () => {
        if (d3.timeMonth.offset(yDomain[0], -1) >= scope[0]) {
          const oldDomainNestedData = domainNestedData;
          yDomain[0] = d3.timeMonth.offset(yDomain[0], -1);
          yDomain[1] = d3.timeMonth.offset(yDomain[1], -1);
          updateStyleButtonUp(scaleValue, scope, yDomain);
          updateStyleButtonDown(scaleValue, scope, yDomain);
          domainNestedData = createDomainNestedData(domainNestedData, nestedData, yDomain);
          updateTimeline(oldDomainNestedData, domainNestedData, scaleValue,
            yAxis, yScale, yDomain, width, height, margin);
        }
      });
  } else if (scaleValue === 'Week') {
    d3.select('.up')
      .on('click', () => {
        if (d3.timeWeek.offset(yDomain[1], 1) <= scope[1]) {
          const oldDomainNestedData = domainNestedData;
          yDomain[0] = d3.timeWeek.offset(yDomain[0], 1);
          yDomain[1] = d3.timeWeek.offset(yDomain[1], 1);
          updateStyleButtonUp(scaleValue, scope, yDomain);
          updateStyleButtonDown(scaleValue, scope, yDomain);
          domainNestedData = createDomainNestedData(domainNestedData, nestedData, yDomain);
          updateTimeline(oldDomainNestedData, domainNestedData, scaleValue,
            yAxis, yScale, yDomain, width, height, margin);
        }
      });
    d3.select('.down')
      .on('click', () => {
        if (d3.timeWeek.offset(yDomain[0], -1) >= scope[0]) {
          const oldDomainNestedData = domainNestedData;
          yDomain[0] = d3.timeWeek.offset(yDomain[0], -1);
          yDomain[1] = d3.timeWeek.offset(yDomain[1], -1);
          updateStyleButtonUp(scaleValue, scope, yDomain);
          updateStyleButtonDown(scaleValue, scope, yDomain);
          domainNestedData = createDomainNestedData(domainNestedData, nestedData, yDomain);
          updateTimeline(oldDomainNestedData, domainNestedData, scaleValue,
            yAxis, yScale, yDomain, width, height, margin);
        }
      });
  }

  addCircle(height, width, yScale, circleContainer, scaleValue, margin);
  // zoomEvent(circleContainer, height, width, margin);
  // addSmallPicture(nestedData, domainNestedData, width, yScale, scaleValue);
}

// Function used to add circles which represent the date when you have posted photos on Instagram
function addCircle (height, width, yScale, circleContainer, scaleValue, margin) {
  circleContainer
    .append('circle')
    .attr('id', (d) => {
      return `c${getDateFormat(scaleValue)(Date.parse(d.key))}`;
    })
    .attr('class', 'yearPoint')
    .attr('r', (d) => {
      return getCircleSize(d, scaleValue);
    })
    .attr('cx', (width / 2))
    .attr('cy', (d) => {
      if (yScale(new Date(Date.parse(d.key))) > (height / 2)) {
        return margin.top;
      }
      return height - margin.bottom;
    })
    .attr('fill', 'white')
    .attr('stroke', 'green')
    .attr('stroke-width', 1.5);

  d3.selectAll('circle')
    .transition()
      .duration(700)
      .attr('cy', (d) => {
        return yScale(new Date(Date.parse(d.key)));
      });
}

// Function used to zoom into a specific circle (specific date)
function zoomEvent(circleContainer, height, width, margin) {
  let active = d3.select(null);

  function zoomed() {
    d3.select('#main_svg').style('stroke-width', `${1 / d3.event.transform.k}px`);
    d3.select('#main_svg').attr('transform', d3.event.transform);
  }

  const zoom = d3.zoom()
    .scaleExtent([0.5, 5])
    .on('zoom', zoomed);

  function reset() {
    active.classed('active', false);
    active = d3.select(null);
    d3.select('#main_svg').transition()
      .duration(1000)
      .call(zoom.transform, d3.zoomIdentity);
  }

  d3.selectAll('.yearPoint').on('click', function () {
    const x = d3.select(this).attr('cx');
    const y = d3.select(this).attr('cy');
    const scale = width / (3 * d3.select(this).attr('r'));
    if (active.node() === this) {
      reset();
      d3.select('#main_svg').select('.axis')
        .style('display', 'block');
      d3.select('#main_svg').selectAll('circle')
        .style('display', 'block')
        .attr('transform', 'translate(0,0)')
        .attr('stroke-width', 1.5);
      d3.select('#main_svg').selectAll('.tick line')
        .style('display', 'block');
      d3.select('#main_svg').selectAll('.ticktext')
        .style('display', 'block');
      d3.select('#main_svg').select('.curvedtext')
        .style('display', 'none');
    } else {
      active.classed('active', false);
      active = d3.select(this).classed('active', true);
      const translate = [((width / 2) - (scale * x)),
        ((height / 2) - (y * scale)) + (margin.top / 2)];
      d3.select('#main_svg').transition()
        .duration(800)
        .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
      d3.select('#main_svg').selectAll('circle')
        .style('display', 'none')
        .attr('stroke-width', d3.select(this).attr('stroke-width') / (scale / 4));
      d3.select('#main_svg').selectAll('.tick line')
        .style('display', 'none');
      d3.select('#main_svg').selectAll('.tick text')
        .style('display', 'none');
      d3.select('#main_svg').select('.active')
        .style('display', 'block');
      d3.select('#main_svg').selectAll('.ring')
        .style('display', 'block');
    }
  });
}

// Function to determine of the circle from the nested Data
// Indeed, the size is proportional to the number of photos
// Moreover, there is a threshold to define a minimal and a maximal scale
function getCircleSize(nestedData, scaleValue) {
  let sizeAdapt = 0;

  if (scaleValue === 'Year') {
    sizeAdapt = 1;
  } else if (scaleValue === 'Month') {
    sizeAdapt = 1.5;
  } else if (scaleValue === 'Week') {
    sizeAdapt = 1.5;
  }
  if (nestedData.values.length > 90) {
    return 90 * sizeAdapt;
  } else if (nestedData.values.length < 30) {
    return 30 * sizeAdapt;
  }
  return nestedData.values.length * sizeAdapt;
}

// Function to add pictures around a circle for a defined date
// This function use radial and collision detection modules
function addSmallPicture(nestedData, domainNestedData, width, yScale, scaleValue) {
  const imageWidth = 3.5;
  const imageHeight = 3.5;

  const collide = d3collide(() => {
    return [[-imageWidth, -imageHeight], [imageWidth, imageHeight]];
  })
    .strength(0.25)
    .iterations(5);

  const concatRadialData = [];

  nestedData.forEach((d) => {
    d.values.forEach((d2) => {
      concatRadialData.push(d2);
    });
  });

  const radialData = domainNestedData.map((d) => {
    const radial = d3radial.radial()
      .center([(width / 2), yScale(new Date(Date.parse(d.key)))])
      .size([getCircleSize(d, scaleValue) + 14, getCircleSize(d, scaleValue) + 14]);
    return radial(d.values);
  });

  const circle = d3.select('#main_svg')
    .selectAll('.circleContainer')
    .append('g')
    .attr('class', 'pictures')
    .selectAll('.pictures')
    .data(radialData);

  const circleEnter = circle.enter();

  const image = circleEnter.selectAll('image.base')
    .data((d) => {
      return d;
    });

  const imageEnter = image.enter()
    .append('image')
    .attr('class', 'base')
    .attr('xlink:href', (d) => {
      return d.key;
    })
    .attr('width', 7)
    .attr('height', 7);

  const imageEnterUpdate = image.merge(imageEnter);
  function updateNetwork() {
    imageEnterUpdate
      .attr('transform', (d) => { return `translate(${(d.x - imageWidth)},${(d.y - imageHeight)})`; });
  }

  d3.forceSimulation(concatRadialData)
    .velocityDecay(0.6)
    .force('collide', collide)
    .on('tick', updateNetwork);
}

// Main function to execute this code
function main() {
  // Jan access_token
  // const token = '3168846451.1677ed0.73c8db6fb18f44bc9e7be911f549fa5c';
  // Pierre access_token
  const token = '2004513296.1677ed0.7712065e2d5a4ab79aac2e8c9df4cf91';
  loadInstagramData(token);
}

main();
