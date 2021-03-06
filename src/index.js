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

// Module node.js d3cloud to make wordcloud
import { cloud as d3cloud } from 'd3-v4-cloud';

// Style sheet
import './style/style.scss';

// Json access token file
import json from './access_token.json';

// Function to create a radio group button
// Indeed, it allows you to change the scale of the timeline
function createRadioGroup() {
  const radioGroupButton = d3.select('#app').append('div')
    .attr('id', 'rgb');

  radioGroupButton.append('input')
    .attr('id', 'r1')
    .attr('type', 'radio')
    .attr('name', 'radioButton')
    .attr('value', 'Year')
    .attr('checked', 'checked');

  radioGroupButton.append('label')
    .attr('for', 'r1')
    .text('Year');

  radioGroupButton.append('input')
    .attr('id', 'r2')
    .attr('type', 'radio')
    .attr('name', 'radioButton')
    .attr('value', 'Month');

  radioGroupButton.append('label')
    .attr('for', 'r2')
    .text('Month');

  radioGroupButton.append('input')
    .attr('id', 'r3')
    .attr('type', 'radio')
    .attr('name', 'radioButton')
    .attr('value', 'Week');

  radioGroupButton.append('label')
    .attr('for', 'r3')
    .text('Week');
}

// Function to nest by date and image all the data from Instagram and Flickr Ajax calls
// To use it, you need an array which contains all your json data
// Moreover, you also need the scale value to determine with which scale you want to nest your data
// At the end, you obtain a new data array nested by date first, and by photos then.
function nestData (dataArray, scaleValue) {
  let res = null;

  // Definition of floor date for each available scale
  dataArray.forEach((d) => {
    d.floorYearDate = d3.timeHour.offset(d3.timeYear.floor(d.date), 2);
    d.floorMonthDate = d3.timeHour.offset(d3.timeMonth.floor(d.date), 2);
    d.floorWeekDate = d3.timeHour.offset(d3.timeWeek.floor(d.date), 2);
  });

  // Group Instagram and Flickr data by (selected scale) date and image.
  if (scaleValue === 'Year') {
    res = d3.nest().key((d) => {
      return d.floorYearDate;
    })
    .key((d) => {
      return d.image;
    })
    .entries(dataArray);
  } else if (scaleValue === 'Month') {
    res = d3.nest().key((d) => {
      return d.floorMonthDate;
    })
    .key((d) => {
      return d.image;
    })
    .entries(dataArray);
  } else if (scaleValue === 'Week') {
    res = d3.nest().key((d) => {
      return d.floorWeekDate;
    })
    .key((d) => {
      return d.image;
    })
    .entries(dataArray);
  }

  return res;
}

// Function to nest by date all the data from Instagram and Flickr Ajax calls
// To use it, you need an array which contains all your json data
// Moreover, you also need the scale value to determine with which scale you want to nest your data
// At the end, you obtain a new data array nested by date first, and by photos then.
function nestDataByDate (dataArray, scaleValue) {
  let res = null;

  // Definition of floor date for each available scale
  dataArray.forEach((d) => {
    d.floorYearDate = d3.timeHour.offset(d3.timeYear.floor(d.date), 2);
    d.floorMonthDate = d3.timeHour.offset(d3.timeMonth.floor(d.date), 2);
    d.floorWeekDate = d3.timeHour.offset(d3.timeWeek.floor(d.date), 2);
  });

  // Group Instagram and Flickr data by (selected scale) date and image.
  if (scaleValue === 'Year') {
    res = d3.nest().key((d) => {
      return d.floorYearDate;
    })
    .entries(dataArray);
  } else if (scaleValue === 'Month') {
    res = d3.nest().key((d) => {
      return d.floorMonthDate;
    })
    .entries(dataArray);
  } else if (scaleValue === 'Week') {
    res = d3.nest().key((d) => {
      return d.floorWeekDate;
    })
    .entries(dataArray);
  }
  return res;
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

// Function to define the scope you use in your timeline.
// To do it properly, you have use your nested data array.
function defineScope(nestedData) {
  return d3.extent(nestedData, (d) => { return new Date(Date.parse(d.key)); });
}

// Function to get the d3 time scale function from the scale value
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

// Function to define the domain you want to show in your datavisualisation
// For that, you need the scope of your nested data and the scale value
function defineDomain(scope, scaleValue) {
  return [scope[0], getD3TimeScale(scaleValue).offset(scope[0], 1)];
}

// Function to get the format date from the selected scale value
// This function is used to display dates in the datavisualisation
function getDateFormat (scaleValue) {
  if (scaleValue === 'Year') {
    return d3.timeFormat('%Y');
  } else if (scaleValue === 'Month') {
    return d3.timeFormat('%m/%y');
  } else if (scaleValue === 'Week') {
    return d3.timeFormat('W.%W %y');
  }
  return null;
}

// Function used to get css selector for the selected circle container
// To get it, you need the date of the circle and the scale value selected.
function getDateFormatSelector (scaleValue, d) {
  if (scaleValue === 'Month') {
    return `cc${(getDateFormat(scaleValue)(d)).replace('/', '')}`;
  } else if (scaleValue === 'Week') {
    return `cc${(getDateFormat(scaleValue)(d)).replace(/[\s.]/g, '')}`;
  }
  return `cc${getDateFormat(scaleValue)(d)}`;
}

// Function to adjust domain
// Indeed, it prevents infinite date which trigger some errors
// You need the domain of your timeline and the selected scale value
function adjustDomain (scaleValue, yDomain) {
  // Condition to check if there is only one picture posted on instagram.
  // In this case, we need to increase the original domain to avoid infinite date errors
  if (getDateFormat(scaleValue)(yDomain[0]) === getDateFormat(scaleValue)(yDomain[1])) {
    yDomain[1] = getD3TimeScale(scaleValue).offset(yDomain[1], 1);
  }
}

// Function to create ticks which display date labels
// To use it, you need the graphical axis and the selected scale value
function createTicks(yAxis, scaleValue) {
  return yAxis.ticks(getD3TimeScale(scaleValue)).tickFormat(getDateFormat(scaleValue));
}

// Function to update the style of the up button
// It allows you to change the style of all button after a click on it.
function updateStyleButtonUp (scaleValue, scope, yDomain) {
  if (getD3TimeScale(scaleValue).offset(yDomain[1], 1) <= scope[1]) {
    d3.select('.up').style('border-bottom', '15px solid green');
  } else {
    d3.select('.up').style('border-bottom', '15px solid red');
  }
}

// Function to update the style of the down button
// It allows you to change the style of all button after a click on it.
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
        return 'translate(-125,0) rotate(20)';
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
        return 'translate(-101,0) rotate(20)';
      })
      .attr('class', 'ticktext');
  }
}

// Function to create the nested data for the domain which are visible in the datavisualisation
function createDomainNestedData (domainNestedData, nestedData, yDomain) {
  domainNestedData = [];

  // Loop to obtain only nested data which are in the selected domain
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
      return getDateFormatSelector(scaleValue, new Date(d.key));
    })
    .attr('year', (d) => {
      return getDateFormat('Year')(new Date(d.key));
    });
}

// Function to determine of the circle from the nested Data
// Indeed, the size is proportional to the number of photos
// Moreover, there is a threshold to define a minimal and a maximal scale
function getCircleSize(nestedData, scaleValue) {
  let sizeAdapt = 0;

  // Definition of a variable used to adapt the change of scale
  if (scaleValue === 'Year') {
    sizeAdapt = 1;
  } else if (scaleValue === 'Month') {
    sizeAdapt = 1.3;
  } else if (scaleValue === 'Week') {
    sizeAdapt = 1.3;
  }

  // Condition to adapt the circle size between a 40 and 70 px threshold
  if (nestedData.values.length > 70) {
    return 70 * sizeAdapt;
  } else if (nestedData.values.length < 40) {
    return 40 * sizeAdapt;
  }
  return nestedData.values.length * sizeAdapt;
}

// Function used to add circles which represent the date when you have posted photos on Instagram
function addCircle (height, width, yScale, circleContainer, scaleValue, margin) {
  circleContainer
    .append('circle')
    .attr('id', (d) => {
      return `c${getDateFormat(scaleValue)(Date.parse(d.key))}`;
    })
    .attr('class', 'dateCircle')
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

  // Animation to move circles in the same time than click on arrow button
  d3.selectAll('circle')
    .transition()
      .duration(1000)
      .attr('cy', (d) => {
        return yScale(new Date(Date.parse(d.key)));
      });
}

// Function used to zoom into a specific circle (specific date)
function zoomEvent(circleContainer, height, width, margin) {
  // Variable used to define on which circle we zoom in
  let active = d3.select(null);

  // Function used after a zoom event
  function zoomed() {
    d3.select('#main_svg').style('stroke-width', `${1 / d3.event.transform.k}px`);
    d3.select('#main_svg').attr('transform', d3.event.transform);
  }

  const zoom = d3.zoom()
    .scaleExtent([0.5, 5])
    .on('zoom', zoomed);

  // Function used to zoom out after a click on an active circle
  function reset() {
    active.classed('active', false);
    active = d3.select(null);
    d3.select('#main_svg').transition()
      .duration(1000)
      .call(zoom.transform, d3.zoomIdentity);
  }

  // Several actions relative to zoom event
  d3.selectAll('.dateCircle').on('click', function () {
    // Definition of circle position and scale we will use to zoom in
    const x = d3.select(this).attr('cx');
    const y = d3.select(this).attr('cy');
    const scale = width / (3.9 * d3.select(this).attr('r'));
    // Actions to zoom out
    if (active.node() !== null) {
      reset();
      // Change circle border and display again non active circles
      d3.select('#main_svg').selectAll('circle')
        .style('display', 'block')
        .attr('stroke-width', 1.5);
      // Enable action on radio group button
      d3.select('#none1')
        .attr('id', 'r1');
      d3.select('#none2')
        .attr('id', 'r2');
      d3.select('#none3')
        .attr('id', 'r3');
      // Display arrow buttons
      d3.select('.arrow_inactive_up')
        .attr('class', 'arrow up');
      d3.select('.arrow_inactive_down')
        .attr('class', 'arrow down');
      // Display date labels
      d3.select('#main_svg').selectAll('.ticktext')
        .style('display', 'block');
    } else {
      // Change the active node
      active.classed('active', false);
      active = d3.select(this).classed('active', true);
      const translate = [((width / 2) - (scale * x)),
        ((height / 2) - (y * scale)) + (margin.top / 2)];
      // Zoom transition
      d3.select('#main_svg').transition()
        .duration(800)
        .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
      // Disable radio Group Button
      d3.select('#r1')
        .attr('id', 'none1');
      d3.select('#r2')
        .attr('id', 'none2');
      d3.select('#r3')
        .attr('id', 'none3');
      // Hide arrow buttons
      d3.select('.up')
        .attr('class', 'arrow_inactive_up');
      d3.select('.down')
        .attr('class', 'arrow_inactive_down');
      // Hide date labels
      d3.selectAll('.ticktext')
        .attr('display', 'none');
    }
  });
}

// Function used to zoom into a specific image
function zoomEventPic(height, width, margin) {
  // Variable used to define on which image we zoom in
  let active = d3.select(null);

  // Function used after a zoom event
  function zoomed() {
    d3.select('#main_svg').style('stroke-width', `${1 / d3.event.transform.k}px`);
    d3.select('#main_svg').attr('transform', d3.event.transform);
  }

  const zoom = d3.zoom()
    .scaleExtent([0.5, 5])
    .on('zoom', zoomed);

  // Function used to zoom out after a click on an active image
  function reset() {
    active.classed('active', false);
    active = d3.select(null);
    d3.select('#main_svg').transition()
      .duration(1000)
      .call(zoom.transform, d3.zoomIdentity);
  }

  // Several actions relative to click event
  d3.selectAll('.pic').on('click', function () {
    // Definition of image position and scale we will use to zoom in
    const x = d3.select(this).node().getBoundingClientRect().x;
    const y = d3.select(this).node().getBoundingClientRect().y - (margin.top / 3);
    const scale = 12;
    // Actions to zoom out
    if (active.node() !== null) {
      reset();
      // Display all pictures hidden
      d3.selectAll('.pic')
        .attr('display', 'block');
      // Enable actions on radio group button
      d3.select('#none1')
        .attr('id', 'r1');
      d3.select('#none2')
        .attr('id', 'r2');
      d3.select('#none3')
        .attr('id', 'r3');
      // Display arrow buttons
      d3.select('.arrow_inactive_up')
        .attr('class', 'arrow up');
      d3.select('.arrow_inactive_down')
        .attr('class', 'arrow down');
      // Display timeline
      d3.select('.axis')
        .attr('display', 'block');
      // Display all circles
      d3.selectAll('circle')
        .attr('display', 'block');
      // Display wordcloud and date labels
      d3.selectAll('text')
        .attr('display', 'block');
    } else {
      // Change the active node
      active.classed('active', false);
      active = d3.select(this).classed('active', true);
      const translate = [((width / 2) - ((scale * x) + 10)),
        ((height / 2) - (y * scale)) + (margin.top / 2)];
      // Zoom in pictures
      d3.select('#main_svg').transition()
        .duration(800)
        .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
      // Hide all pictures
      d3.selectAll('.pic')
        .attr('display', 'none');
      // Show only the active one
      d3.select('.active')
        .attr('display', 'block');
      // Disable actions on radio group button
      d3.select('#r1')
        .attr('id', 'none1');
      d3.select('#r2')
        .attr('id', 'none2');
      d3.select('#r3')
        .attr('id', 'none3');
      // Hide arrow buttons
      d3.select('.up')
        .attr('class', 'arrow_inactive_up');
      d3.select('.down')
        .attr('class', 'arrow_inactive_down');
      // Hide timeline
      d3.select('.axis')
        .attr('display', 'none');
      // Hide all circles
      d3.selectAll('circle')
        .attr('display', 'none');
      // Hide wordcloud and date labels
      d3.selectAll('text')
        .attr('display', 'none');
    }
  });
}

// Function to add pictures around a circle for a defined date
// This function use radial and collision detection modules
function addSmallPicture(nestedData, domainNestedData, width, yScale, scaleValue, height, margin) {
  const imageWidth = 7;
  const imageHeight = 7;

  // Collision detection is active for a square
  const collide = d3collide(() => {
    return [[-imageWidth, -imageHeight], [imageWidth, imageHeight]];
  })
    .strength(0.1)
    .iterations(5);

  const concatRadialData = [];

  // ConcatRadialData : data for pictures in the right domain
  domainNestedData.forEach((d) => {
    d.values.forEach((d2) => {
      concatRadialData.push(d2);
    });
  });

  const circle = d3.select('#main_svg')
    .selectAll('.circleContainer')
    .append('g')
    .attr('class', 'pictures');

  const picture = circle
    .selectAll('.pictures')
    .data((d) => {
      // Condition to start circles animations
      if (yScale(new Date(Date.parse(d.key))) > (height / 2)) {
        const radial = d3radial.radial()
          .center([(width / 2), margin.top])
          .size([getCircleSize(d, scaleValue) + 20, getCircleSize(d, scaleValue) + 20]);
        return radial(d.values).map((e) => {
          e.tx = e.x;
          e.ty = e.y;
          return e;
        });
      }
      const radial = d3radial.radial()
        .center([(width / 2), height - margin.bottom])
        .size([getCircleSize(d, scaleValue) + 20, getCircleSize(d, scaleValue) + 20]);
      return radial(d.values).map((e) => {
        e.tx = e.x;
        e.ty = e.y;
        return e;
      });
    });


  const circleEnter = picture.enter();

  // Creation of all pictures
  const imageEnter = circleEnter
    .append('image')
    .attr('class', 'pic')
    .attr('xlink:href', (d) => {
      return d.key;
    })
    .attr('width', 20)
    .attr('height', 20);

  // Function called when ticks event is triggered
  function updateNetwork() {
    imageEnter
      .attr('transform', (d) => { return `translate(${(d.x - (imageWidth * 1.5))},${(d.y - (imageHeight * 1.5))})`; });
  }

  // Application of forces (collision detection)
  d3.forceSimulation(concatRadialData)
    .velocityDecay(0.8)
    .force('collide', collide)
    .on('tick', updateNetwork);

  // Animation for circles
  domainNestedData.map((d) => {
    if (yScale(new Date(Date.parse(d.key))) > (height / 2)) {
      return d3.select(`#${getDateFormatSelector(scaleValue, new Date(d.key))}`)
        .selectAll('.pictures')
        .transition()
        .duration(1000)
        .attr('transform', `translate(0,${yScale(new Date(Date.parse(d.key))) - margin.top})`);
    }
    return d3.select(`#${getDateFormatSelector(scaleValue, new Date(d.key))}`)
      .selectAll('.pictures')
      .transition()
      .duration(1000)
      .attr('transform', `translate(0,${yScale(new Date(Date.parse(d.key))) - (height - margin.bottom)})`);
  });

  zoomEventPic(height, width, margin);
}

// Function to show related pictures from the selected word in the wordcloud
function hilightWordsAndPictures() {
  let wordSelected = null;
  let opacity = null;
  let active = d3.select(null);

  // Define actions after a click on an element form the wordcloud
  d3.selectAll('.wordcloudContainer text')
    .on('click', function () {
      // Click on the same word and reset to orginal style
      if (d3.select(this).attr('class') === 'active') {
        active.classed('active', false);
        active = d3.select(null);
        d3.selectAll('.pic')
          .attr('opacity', 1);
        d3.selectAll('.wordcloudContainer text')
          .attr('opacity', 1);
      } else {
        // Click for the first time or on a different word
        d3.selectAll('.wordcloudContainer text')
          .attr('opacity', 0.1);
        d3.select(this)
          .attr('opacity', 1);
        active.classed('active', false);
        active = d3.select(this).classed('active', true);
        wordSelected = d3.select(this).attr('value');
        d3.selectAll('.pic')
          .attr('opacity', (d) => {
            const tmpArray = [];
            d.values.forEach((d2) => {
              tmpArray.push(d2.originalTag)
              tmpArray.push(d2.relatedTag);
            });
            if (tmpArray.indexOf(wordSelected) !== -1 || wordSelected === null) {
              opacity = 1;
            } else {
              opacity = 0.1;
            }
            return opacity;
          });
      }
    });
}

// Function to create a word cloud
// To create it, we need to determine the TOP 7 frequency word for each circle
function createWordcloud(domainNestedData, scaleValue, nestedDataDate,
  circleContainer, yScale, width, height, margin) {

  // Wordcloud Container creation
  const cloudContainer = circleContainer.append('g')
    .attr('class', 'wordcloudContainer')
    .attr('date', (d) => {
      return getDateFormatSelector(scaleValue, new Date(d.key));
    })
    .attr('transform', (d) => {
      if (yScale(new Date(Date.parse(d.key))) > (height / 2)) {
        return `translate(${(width / 2)},${margin.top})`;
      }
      return `translate(${(width / 2)},${height - margin.bottom})`;
    });

  // Color used for the words
  const color = d3.scaleOrdinal(d3.schemeCategory20);

  const wordsArray = [];

  const tmpArray = [];

  // Selection of the 7 more frequent words per date
  nestedDataDate.forEach((d) => {
    tmpArray.push(d.values.slice(0, 7));
  });

  let tmpYear = null;

  tmpArray.forEach((d) => {
    const tmpWordsArray = [];
    d.forEach((d2) => {
      tmpYear = getDateFormatSelector(scaleValue, getD3TimeScale(scaleValue).floor(d2.date));
      tmpWordsArray.push({ tag: d2.relatedTag });
    });
    wordsArray.push({ words: tmpWordsArray, date: tmpYear });
  });

  // Match top 7 more frequent words with the right circle
  cloudContainer.each(function() {
    const self = d3.select(this);
    const date = d3.select(this).attr('date');
    let tmpArrayBis = null;
    wordsArray.forEach((o) => {
      if (date === o.date) {
        tmpArrayBis = o.words;
      }
    });

    // Creation of the word cloud for each circle
    const layout = d3cloud()
      .size([110, 110])
      .words(tmpArrayBis.map((w) => {
        return { text: w.tag, size: 8 };
      }))
      .rotate(() => { return 0; })
      .fontSize(() => { return 8; })
      .padding(1.5)
      .spiral('rectangular')
      .on('end', (words) => {
        self.selectAll('text')
          .data(words)
          .enter()
          .append('text')
          .style('font-size', () => { return `${9}px`; })
          .style('font-family', 'Comic Sans MS')
          .style('fill', (d, i) => { return color(i); })
          .attr('text-anchor', 'middle')
          .attr('transform', (d) => {
            return `translate(${[d.x * 0.95, d.y * 0.95]}) rotate(${d.rotate})`;
          })
          .attr('value', (d) => {
            return d.text;
          })
          .text((d) => {
            // Splitting words when they're too long
            if (d.text.length > 6) {
              return `${d.text.substring(0, 6)}...`;
            }
            return d.text;
          });
      });
    layout.start();
  });

  // Animation for all Wordcloud Container
  domainNestedData.map((d) => {
    if (yScale(new Date(Date.parse(d.key))) > (height / 2)) {
      return d3.select(`#${getDateFormatSelector(scaleValue, new Date(d.key))}`)
        .selectAll('.wordcloudContainer')
        .transition()
        .duration(1000)
        .attr('transform', `translate(${(width / 2)},${yScale(new Date(Date.parse(d.key)))})`);
    }
    return d3.select(`#${getDateFormatSelector(scaleValue, new Date(d.key))}`)
      .selectAll('.wordcloudContainer')
      .transition()
      .duration(1000)
      .attr('transform', `translate(${(width / 2)},${yScale(new Date(Date.parse(d.key)))})`);
  });

  hilightWordsAndPictures();
}

// Function used to update the timeline after a click levent on a button
// So we split the data in three part, old, same and new data in the domain
function updateTimeline (nestedData, oldDomainNestedData, domainNestedData,
  scaleValue, yAxis, yScale, yDomain, width, height, margin, dataArray) {
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

  sameDomainData.forEach((d) => {
    d3.select(`#c${d}`)
      .attr('transform', 'translate(-100, 0)');
  });

  oldDomainData.forEach((d) => {
    if (scaleValue === 'Month') {
      d3.select(`#cc${d.replace('/', '')}`).remove();
    } else if (scaleValue === 'Week') {
      d3.select(`#cc${d.replace(/[\s.]/g, '')}`).remove();
    } else {
      d3.select(`#cc${d}`).remove();
    }
  });

  yScale.domain(yDomain).nice();
  d3.select('.axis').call(yAxis);
  updateTicksPosition(d3.select('.axis'), scaleValue);

  newDomainData.forEach(() => {
    const circleContainer = createCircleContainer(domainNestedData, yDomain, scaleValue);
    const nestedDataDate = nestDataByDate(dataArray, scaleValue);
    addCircle(height, width, yScale, circleContainer, scaleValue, margin);
    zoomEvent(circleContainer, height, width, margin);
    addSmallPicture(nestedData, domainNestedData, width, yScale, scaleValue, height, margin);
    createWordcloud(domainNestedData, scaleValue, nestedDataDate,
      circleContainer, yScale, width, height, margin);
  });
}

// Function to implement the event behaviour of each arrow button (up and down)
function eventButton(yDomain, scope, domainNestedData, scaleValue, nestedData,
  yAxis, yScale, width, height, margin, dataArray) {
  d3.select('.up')
    .on('click', () => {
      if (getD3TimeScale(scaleValue).offset(yDomain[1], 1) <= scope[1]) {
        const oldDomainNestedData = domainNestedData;
        yDomain[0] = getD3TimeScale(scaleValue).offset(yDomain[0], 1);
        yDomain[1] = getD3TimeScale(scaleValue).offset(yDomain[1], 1);
        updateStyleButtonUp(scaleValue, scope, yDomain);
        updateStyleButtonDown(scaleValue, scope, yDomain);
        domainNestedData = createDomainNestedData(domainNestedData, nestedData, yDomain);
        updateTimeline(nestedData, oldDomainNestedData, domainNestedData, scaleValue,
          yAxis, yScale, yDomain, width, height, margin, dataArray);
      }
    });
  d3.select('.down')
    .on('click', () => {
      if (getD3TimeScale(scaleValue).offset(yDomain[0], -1) >= scope[0]) {
        const oldDomainNestedData = domainNestedData;
        yDomain[0] = getD3TimeScale(scaleValue).offset(yDomain[0], -1);
        yDomain[1] = getD3TimeScale(scaleValue).offset(yDomain[1], -1);
        updateStyleButtonUp(scaleValue, scope, yDomain);
        updateStyleButtonDown(scaleValue, scope, yDomain);
        domainNestedData = createDomainNestedData(domainNestedData, nestedData, yDomain);
        updateTimeline(nestedData, oldDomainNestedData, domainNestedData, scaleValue,
          yAxis, yScale, yDomain, width, height, margin, dataArray);
      }
    });
}

// Function to create the timeline displayed in the datavisualisation
function createTimeline (dataArray, scaleValue, scope, domainNestedData,
  nestedData, height, width, margin, yDomain) {
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

  const nestedDataDate = nestDataByDate(dataArray, scaleValue);

  eventButton(yDomain, scope, domainNestedData, scaleValue, nestedData,
    yAxis, yScale, width, height, margin, dataArray);

  addCircle(height, width, yScale, circleContainer, scaleValue, margin);
  zoomEvent(circleContainer, height, width, margin);
  addSmallPicture(nestedData, domainNestedData, width, yScale, scaleValue, height, margin);
  createWordcloud(domainNestedData, scaleValue, nestedDataDate,
    circleContainer, yScale, width, height, margin);
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

  createTimeline(dataArray, scaleValue, null, null, nestedData, height, width, margin, null, null);

  d3.selectAll('input[type=radio]').on('change', function () {
    nestedData = nestData(dataArray, this.value);

    d3.select('.axis').remove();
    d3.selectAll('.circleContainer').remove();

    scaleValue = this.value;

    createTimeline(dataArray, scaleValue, null, null, nestedData,
      height, width, margin, null, null);
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
              originalTag: tagsArray[i],
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

// Main function to execute this code

function main() {
  loadInstagramData(json.pierre_petillon);
}

main();
