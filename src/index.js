import * as d3 from 'd3';
import $ from 'jquery';
import { bboxCollide as d3collide } from 'd3-bboxCollide';
import d3radial from 'd3-radial';
import './style/style.scss';

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

function makeDataviz (dataArray) {
  const form = d3.select('#app').append('div')
    .attr('id', 'form');

  const radioButtonYear = form.append('input')
    .attr('id', 'r1')
    .attr('type', 'radio')
    .attr('name', 'radioButton')
    .attr('value', 'Year')
    .attr('checked', 'checked');

  const labelYear = form.append('label')
    .attr('for', 'r1')
    .text('Year');

  const radioButtonMonth = form.append('input')
    .attr('id', 'r2')
    .attr('type', 'radio')
    .attr('name', 'radioButton')
    .attr('value', 'Month');

  const labelMonth = form.append('label')
    .attr('for', 'r2')
    .text('Month');

  const radioButtonWeek = form.append('input')
    .attr('id', 'r3')
    .attr('type', 'radio')
    .attr('name', 'radioButton')
    .attr('value', 'Week');

  const labelDay = form.append('label')
    .attr('for', 'r3')
    .text('Week');

  let eventValue = d3.selectAll('input[type=radio]').attr('value');

  let nestedData = nestData(dataArray, eventValue);

  let svg = d3.select('#app').append('svg')
    .attr('id', 'main_svg')
    .attr('width', window.innerWidth - 10)
    .attr('height', window.innerHeight - 70);

  createNavButtonUp();

  createNavButtonDown();

  const margin = { top: 100, right: 0, bottom: 30, left: 0 };

  const width = +svg.attr('width') - margin.left - margin.right;

  const height = +svg.attr('height') - margin.top - margin.bottom;

  createTimeline(eventValue, null, null, nestedData, height, width, margin, null);

  d3.selectAll('input[type=radio]').on('change', function () {
    nestedData = nestData(dataArray, this.value);

    d3.select('#main_svg').remove();
    d3.select('.up').remove();
    d3.select('.down').remove();

    svg = d3.select('#app').append('svg')
      .attr('id', 'main_svg')
      .attr('width', window.innerWidth - 10)
      .attr('height', window.innerHeight - 70);

    createNavButtonUp();

    createNavButtonDown();

    eventValue = this.value;

    createTimeline(eventValue, null, null, nestedData, height, width, margin, null);
  });
}

function createNavButtonUp () {
  d3.select('#app')
    .append('a')
    .attr('href', '#')
    .attr('class', 'arrow up');
}

function createNavButtonDown() {
  d3.select('#app')
    .append('a')
    .attr('href', '#')
    .attr('class', 'arrow down');
}

function nestData (dataArray, eventValue) {
  dataArray.forEach((d) => {
    d.floorYearDate = d3.timeHour.offset(d3.timeYear.floor(d.date), 2);
    d.floorMonthDate = d3.timeHour.offset(d3.timeMonth.floor(d.date), 2);
    d.floorDayDate = d3.timeHour.offset(d3.timeDay.floor(d.date), 2);
  });

  if (eventValue === 'Year') {
    return d3.nest().key((d) => {
      return d.floorYearDate;
    })
    .key((d) => {
      return d.image;
    })
    .entries(dataArray);
  } else if (eventValue === 'Month') {
    return d3.nest().key((d) => {
      return d.floorMonthDate;
    })
    .key((d) => {
      return d.image;
    })
    .entries(dataArray);
  } else if (eventValue === 'Week') {
    return d3.nest().key((d) => {
      return d.floorDayDate;
    })
    .key((d) => {
      return d.image;
    })
    .entries(dataArray);
  }
}

function createTimeline (eventValue, scope, domainNestedData, nestedData, height, width, margin, yDomain) {
  const g = d3.select('#main_svg')
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

  const dateFormatYear = d3.timeFormat('%Y');

  const dateFormatMonthYear = d3.timeFormat('%m/%y');

  const dateFormatWeekYear = d3.timeFormat('W.%W %Y');

  if (scope === null) {
    scope = d3.extent(nestedData, (d) => { return new Date(Date.parse(d.key)); });
    if (eventValue === 'Year') {
      yDomain = [scope[0], d3.timeYear.offset(scope[0], 1)];
    } else if (eventValue === 'Month') {
      yDomain = [scope[0], d3.timeMonth.offset(scope[0], 1)];
    } else if (eventValue === 'Week') {
      yDomain = [scope[0], d3.timeWeek.offset(scope[0], 2)];
    }
  }

  if ((eventValue === 'Year') && (dateFormatYear(yDomain[0]) === dateFormatYear(yDomain[1]))) {
    yDomain[1] = d3.timeYear.offset(yDomain[1], 1);
  } else if ((eventValue === 'Month') && (dateFormatMonthYear(yDomain[0]) === dateFormatMonthYear(yDomain[1]))) {
    yDomain[1] = d3.timeMonth.offset(yDomain[1], 1);
  } else if ((eventValue === 'Week') && (dateFormatWeekYear(yDomain[0]) === dateFormatWeekYear(yDomain[1]))) {
    yDomain[1] = d3.timeWeek.offset(yDomain[1], 1);
  }

  const yScale = d3.scaleTime()
    .domain(yDomain)
    .nice()
    .range([height, margin.top]);

  const yAxis = d3.axisLeft(yScale);

  if (eventValue === 'Year') {
    yAxis.ticks(d3.timeYear)
    .tickFormat(dateFormatYear);

    if (d3.timeYear.offset(yDomain[1], 1) <= scope[1]) {
      d3.select('.up').style('border-bottom', '15px solid green');
    } else {
      d3.select('.up').style('border-bottom', '15px solid red');
    }

    if (d3.timeYear.offset(yDomain[0], -1) >= scope[0]) {
      d3.select('.down').style('border-top', '15px solid green');
    } else {
      d3.select('.down').style('border-top', '15px solid red');
    }
  } else if (eventValue === 'Month') {
    yAxis.ticks(d3.timeMonth)
    .tickFormat(dateFormatMonthYear);

    if (d3.timeMonth.offset(yDomain[1], 1) <= scope[1]) {
      d3.select('.up').style('border-bottom', '15px solid green');
    } else {
      d3.select('.up').style('border-bottom', '15px solid red');
    }

    if (d3.timeMonth.offset(yDomain[0], -1) >= scope[0]) {
      d3.select('.down').style('border-top', '15px solid green');
    } else {
      d3.select('.down').style('border-top', '15px solid red');
    }
  } else if (eventValue === 'Week') {
    yAxis.ticks(d3.timeWeek)
      .tickFormat(dateFormatWeekYear);

    if (d3.timeWeek.offset(yDomain[1], 1) <= scope[1]) {
      d3.select('.up').style('border-bottom', '15px solid green');
    } else {
      d3.select('.up').style('border-bottom', '15px solid red');
    }

    if (d3.timeWeek.offset(yDomain[0], -1) >= scope[0]) {
      d3.select('.down').style('border-top', '15px solid green');
    } else {
      d3.select('.down').style('border-top', '15px solid red');
    }
  }

  g.attr('class', 'xaxis')
    .attr('transform', `translate(${((width / 2) + 3)},0)`)
    .call(yAxis);

  if (eventValue === 'Year') {
    g.selectAll('.tick text')
      .attr('transform', () => {
        return 'translate(-115,0) rotate(20)';
      })
      .attr('class', 'ticktext');
  } else if (eventValue === 'Month') {
    g.selectAll('.tick text')
      .attr('transform', () => {
        return 'translate(-110,0) rotate(20)';
      })
      .attr('class', 'ticktext');
  } else if (eventValue === 'Week') {
    g.selectAll('.tick text')
      .attr('transform', () => {
        return 'translate(-80,0) rotate(20)';
      })
      .attr('class', 'ticktext');
  }

  g.selectAll('.tick')
    .append('text')
      .attr('id', (d) => {
        return dateFormatMonthYear(d);
      })
      .attr('class', 'curvedtext')
      .style('display', 'none')
    .append('textPath')
    .attr('xlink:href', '#arc')
    .style('text-anchor', 'middle')
    .attr('startOffset', '28%')
    .text((d) => {
      return dateFormatMonthYear(d);
    });

  domainNestedData = [];

  nestedData.forEach((d) => {
    if ((new Date(Date.parse(d.key)) >= yDomain[0]) &&
      ((new Date(Date.parse(d.key))) <= yDomain[1])) {
      domainNestedData.push(d);
    }
  });

  const circleContainer = d3.select('#main_svg').selectAll('.circleContainer')
    .data(domainNestedData)
    .enter()
    .append('g')
    .attr('class', 'circleContainer')
    .attr('year', (d) => {
      return dateFormatYear(new Date(d.key));
    });

  if (eventValue === 'Year') {
    d3.select('.up')
      .on('click', () => {
        if (d3.timeYear.offset(yDomain[1], 1) <= scope[1]) {
          yDomain[0] = d3.timeYear.offset(yDomain[0], 1);
          yDomain[1] = d3.timeYear.offset(yDomain[1], 1);
          d3.selectAll('.circleContainer').remove();
          d3.selectAll('.xaxis').remove();
          domainNestedData = [];
          nestedData.forEach((d) => {
            if ((new Date(Date.parse(d.key)) >= yDomain[0]) &&
              ((new Date(Date.parse(d.key))) <= yDomain[1])) {
              domainNestedData.push(d);
            }
          });
          createTimeline(eventValue, scope, domainNestedData,
            nestedData, height, width, margin, yDomain);
        }
      });
    d3.select('.down')
      .on('click', () => {
        if (d3.timeYear.offset(yDomain[0], -1) >= scope[0]) {
          yDomain[0] = d3.timeYear.offset(yDomain[0], -1);
          yDomain[1] = d3.timeYear.offset(yDomain[1], -1);
          d3.selectAll('.circleContainer').remove();
          d3.selectAll('.xaxis').remove();
          domainNestedData = [];
          nestedData.forEach((d) => {
            if ((new Date(Date.parse(d.key)) >= yDomain[0]) &&
              ((new Date(Date.parse(d.key))) <= yDomain[1])) {
              domainNestedData.push(d);
            }
          });
          createTimeline(eventValue, scope, domainNestedData,
            nestedData, height, width, margin, yDomain);
        }
      });
  } else if (eventValue === 'Month') {
    d3.select('.up')
      .on('click', () => {
        if (d3.timeMonth.offset(yDomain[1], 1) <= scope[1]) {
          yDomain[0] = d3.timeMonth.offset(yDomain[0], 1);
          yDomain[1] = d3.timeMonth.offset(yDomain[1], 1);
          d3.selectAll('.circleContainer').remove();
          d3.selectAll('.xaxis').remove();
          domainNestedData = [];
          nestedData.forEach((d) => {
            if ((new Date(Date.parse(d.key)) >= yDomain[0]) &&
              ((new Date(Date.parse(d.key))) <= yDomain[1])) {
              domainNestedData.push(d);
            }
          });
          createTimeline(eventValue, scope, domainNestedData,
            nestedData, height, width, margin, yDomain);
        }
      });
    d3.select('.down')
      .on('click', () => {
        if (d3.timeMonth.offset(yDomain[0], -1) >= scope[0]) {
          yDomain[0] = d3.timeMonth.offset(yDomain[0], -1);
          yDomain[1] = d3.timeMonth.offset(yDomain[1], -1);
          d3.selectAll('.circleContainer').remove();
          d3.selectAll('.xaxis').remove();
          domainNestedData = [];
          nestedData.forEach((d) => {
            if ((new Date(Date.parse(d.key)) >= yDomain[0]) &&
              ((new Date(Date.parse(d.key))) <= yDomain[1])) {
              domainNestedData.push(d);
            }
          });
          createTimeline(eventValue, scope, domainNestedData,
            nestedData, height, width, margin, yDomain);
        }
      });
  } else if (eventValue === 'Week') {
    d3.select('.up')
      .on('click', () => {
        if (d3.timeWeek.offset(yDomain[1], 1) <= scope[1]) {
          yDomain[0] = d3.timeWeek.offset(yDomain[0], 2);
          yDomain[1] = d3.timeWeek.offset(yDomain[1], 2);
          d3.selectAll('.circleContainer').remove();
          d3.selectAll('.xaxis').remove();
          domainNestedData = [];
          nestedData.forEach((d) => {
            if ((new Date(Date.parse(d.key)) >= yDomain[0]) &&
              ((new Date(Date.parse(d.key))) <= yDomain[1])) {
              domainNestedData.push(d);
            }
          });
          createTimeline(eventValue, scope, domainNestedData,
            nestedData, height, width, margin, yDomain);
        }
      });
    d3.select('.down')
      .on('click', () => {
        if (d3.timeWeek.offset(yDomain[0], -1) >= scope[0]) {
          yDomain[0] = d3.timeWeek.offset(yDomain[0], -2);
          yDomain[1] = d3.timeWeek.offset(yDomain[1], -2);
          d3.selectAll('.circleContainer').remove();
          d3.selectAll('.xaxis').remove();
          domainNestedData = [];
          nestedData.forEach((d) => {
            if ((new Date(Date.parse(d.key)) >= yDomain[0]) &&
              ((new Date(Date.parse(d.key))) <= yDomain[1])) {
              domainNestedData.push(d);
            }
          });
          createTimeline(eventValue, scope, domainNestedData,
            nestedData, height, width, margin, yDomain);
        }
      });
  }

  addCircle(dateFormatYear, dateFormatMonthYear, width, yScale, circleContainer, eventValue);
  zoomEvent(circleContainer, height, width, margin);
  addSmallPicture(nestedData, domainNestedData, width, yScale, eventValue);
}

function addCircle (dateFormatYear, dateFormatMonthYear, width, yScale, circleContainer, eventValue) {
  circleContainer.append('circle')
    .attr('id', (d) => {
      return dateFormatMonthYear(Date.parse(d.key));
    })
    .attr('class', 'yearPoint')
    .attr('r', (d) => {
      return getCircleSize(d, eventValue);
    })
    .attr('cx', (width / 2))
    .attr('cy', (d) => {
      return yScale(new Date(Date.parse(d.key)));
    })
    .attr('fill', 'white')
    .attr('stroke', 'green')
    .attr('stroke-width', 1.5);
}

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
      d3.select('#main_svg').select('.xaxis')
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

function getCircleSize(nestedData, eventValue) {
  let sizeAdapt = 0;

  if (eventValue === 'Year') {
    sizeAdapt = 1;
  } else if (eventValue === 'Month') {
    sizeAdapt = 1.5;
  } else if (eventValue === 'Week') {
    sizeAdapt = 1.5;
  }
  if (nestedData.values.length > 90) {
    return 90 * sizeAdapt;
  } else if (nestedData.values.length < 30) {
    return 30 * sizeAdapt;
  }
  return nestedData.values.length * sizeAdapt;
}

function addSmallPicture(nestedData, domainNestedData, width, yScale, eventValue) {
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
      .size([getCircleSize(d, eventValue) + 14, getCircleSize(d, eventValue) + 14]);
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

function main() {
  // Jan access_token
  // const token = '3168846451.1677ed0.73c8db6fb18f44bc9e7be911f549fa5c';
  // Pierre access_token
  const token = '2004513296.1677ed0.7712065e2d5a4ab79aac2e8c9df4cf91';
  loadInstagramData(token);
}

main();
