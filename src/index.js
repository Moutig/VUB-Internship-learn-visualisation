import * as d3 from 'd3';
import $ from 'jquery';
import d3radial from 'd3-radial';
import { cloud as d3cloud } from 'd3-v4-cloud';
import { bboxCollide as d3collide } from 'd3-bboxCollide';
import './style/style.scss';

const makeViz = (data) => {
  data.forEach((d) => {
    d.floorDate = d3.timeHour.offset(d3.timeYear.floor(d.date), 2);
  });

  const nestedData = d3.nest()
    .key((d) => {
      return d.floorDate;
    })
    .key((d) => {
      return d.image;
    })
    .entries(data);

  const svg = d3.select('#app').append('svg')
                .attr('width', window.innerWidth - 10)
                .attr('height', window.innerHeight - 35);

  const margin = { top: 60, right: 0, bottom: 20, left: 0 };

  const width = +svg.attr('width') - margin.left - margin.right;

  const height = +svg.attr('height') - margin.top - margin.bottom;

  let active = d3.select(null);

  function zoomed() {
    svg.style('stroke-width', `${1 / d3.event.transform.k}px`);
    svg.attr('transform', d3.event.transform);
  }

  const zoom = d3.zoom()
    .scaleExtent([0.5, 5])
    .on('zoom', zoomed);

  function reset() {
    active.classed('active', false);
    active = d3.select(null);
    svg.transition()
      .duration(1000)
      .call(zoom.transform, d3.zoomIdentity);
  }

  const g = svg
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

  const xDomain = d3.extent(nestedData, (d) => { return new Date(Date.parse(d.key)); });

  const dateFormat = d3.timeFormat('%Y');

  const dateFormatMonth = d3.timeFormat('%B%Y');

  const xScale = d3.scaleTime()
    .domain(xDomain)
    .nice()
    .range([height, margin.top]);

  const xMonthsAxis = d3.axisLeft(xScale)
    .ticks(d3.timeYear)
    .tickFormat(dateFormat);

  const dotSize = height /
    (d3.timeYear.count(new Date(Date.parse(nestedData[nestedData.length - 1].key)),
    new Date(Date.parse(nestedData[0].key))) * 4.5);

  /* const arc = d3.arc()
    .innerRadius((width/200))
    .outerRadius((width/300))
    .startAngle(0)
    .endAngle(Math.PI);

  g.append('path')
    .attr('id', 'arc')
    .attr('d', arc)
    .style('display', 'none');
*/

  g.attr('class', 'xaxis')
    .attr('transform', `translate(${((width / 2) + 3)},0)`)
    .call(xMonthsAxis);

  g.selectAll('.xaxis text')
    .attr('transform', function() {
      return `translate(${(((this.getBBox().height * (-0.5)) - (dotSize * 2)))},0) rotate(20)`;
    })
    .attr('class', 'ticktext');

  g.selectAll('.tick')
    .append('text')
      .attr('id', (d) => {
        return dateFormatMonth(d);
      })
      .attr('class', 'curvedtext')
      .style('display', 'none')
    .append('textPath')
    .attr('xlink:href', '#arc')
    .style('text-anchor', 'middle')
    .attr('startOffset', '28%')
    .text((d) => {
      return dateFormat(d);
    });

  const circleContainer = svg.selectAll('.circleContainer')
    .data(nestedData)
    .enter()
    .append('g')
    .attr('class', 'circleContainer')
    .attr('year', (d) => {
      return dateFormat(new Date(d.key));
    });

  circleContainer.append('circle')
    .attr('id', (d) => {
      return dateFormatMonth(Date.parse(d.key));
    })
    .attr('class', 'yearPoint')
    .attr('r', () => {
      return dotSize;
    })
    .attr('cx', (width / 2))
    .attr('cy', (d) => {
      return xScale(new Date(Date.parse(d.key)));
    })
    .attr('fill', 'white')
    .attr('stroke', 'green')
    .attr('stroke-width', 1.5)
    .on('click', function () {
      const x = d3.select(this).attr('cx');
      const y = d3.select(this).attr('cy');
      const scale = 1.6;
      if (active.node() === this) {
        reset();
        svg.select('.xaxis')
          .style('display', 'block');
        svg.selectAll('circle')
          .style('display', 'block')
          .attr('transform', 'translate(0,0)')
          .attr('stroke-width', 1.5);
        svg.selectAll('.tick line')
          .style('display', 'block');
        svg.selectAll('.ticktext')
          .style('display', 'block');
        svg.select('.curvedtext')
          .style('display', 'none');
      } else {
        active.classed('active', false);
        active = d3.select(this).classed('active', true);
        const translate = [((width / 2) - (scale * x)),
          ((height / 2) - (y * scale)) + (margin.top / 2)];
        svg.transition()
          .duration(800)
          .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
        svg.selectAll('circle')
          .style('display', 'none')
          .attr('stroke-width', d3.select(this).attr('stroke-width') / (scale / 4));
        svg.selectAll('.tick line')
          .style('display', 'none');
        svg.selectAll('.tick text')
          .style('display', 'none');
        svg.select('.active')
          .style('display', 'block');
        svg.selectAll('.ring')
          .style('display', 'block');
      }
    });

  const cloudContainer = circleContainer.append('g')
    .attr('class', 'wordcloudContainer')
    .attr('year', (d) => {
      return dateFormat(new Date(d.key));
    })
    .attr('transform', (d) => {
      return `translate(${(width / 2)},${xScale(new Date(Date.parse(d.key)))})`;
    });

  const radialData = nestedData.map((d) => {
    const radial = d3radial.radial()
      .center([(width / 2), xScale(new Date(Date.parse(d.key)))])
      .size([dotSize + 18, dotSize + 18]);
    return radial(d.values);
  });

  const imageWidth = 5;
  const imageHeight = 5;

  const collide = d3collide(() => {
    return [[-imageWidth, -imageHeight], [imageWidth, imageHeight]];
  })
    .strength(0.25)
    .iterations(5);

  const color = d3.scaleOrdinal(d3.schemeCategory20b);

  const concatRadialData = [];

  radialData.forEach((d) => {
    d.forEach((d2) => {
      concatRadialData.push(d2);
    });
  });

  const circle = svg.selectAll('.circleContainer')
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
    .attr('width', 10)
    .attr('height', 10);

  const imageEnterUpdate = image.merge(imageEnter);
  function updateNetwork() {
    imageEnterUpdate
      .attr('transform', (d) => { return `translate(${(d.x - imageWidth)},${(d.y - imageHeight)})`; });
  }

  d3.forceSimulation(concatRadialData)
    .velocityDecay(0.6)
    .force('collide', collide)
    .on('tick', updateNetwork);

  const wordsArray = [];
  radialData.forEach((c) => {
    let tmpArray = [];
    let tmpYear = null;
    c.forEach((d) => {
      d.values.forEach((d2) => {
        tmpYear = dateFormat(d2.date);
        tmpArray.push({ tag: d2.relatedTag, frequency: d2.frequency, image: d2.image });
      });
    });
    tmpArray = tmpArray.slice(0, 15);
    wordsArray.push({ words: tmpArray, date: tmpYear });
  });

  cloudContainer.each(function () {
    const self = d3.select(this);
    const year = d3.select(this).attr('year');
    let tmpArray = null;
    wordsArray.forEach((o) => {
      if (year === o.date) {
        tmpArray = o.words;
      }
    });

    const layout = d3cloud()
      .size([dotSize * 1.9, dotSize * 2])
      .words(tmpArray.map((w) => {
        return { text: w.tag, size: dotSize / (tmpArray.length) };
      }))
      .rotate(() => { return 0; })
      .fontSize(() => { return 5; })
      .padding(0.6)
      .spiral('rectangular')
      .on('end', (words) => {
        self.selectAll('text')
          .data(words)
          .enter()
          .append('text')
          .style('font-size', () => { return `${5}px`; })
          .style('font-family', 'Comic Sans MS')
          .style('fill', (d, i) => { return color(i); })
          .attr('text-anchor', 'middle')
          .attr('transform', (d) => {
            return `translate(${[d.x * 0.9, d.y * 0.9]}) rotate(${d.rotate})`;
          })
          .text((d) => {
            if (d.text.length > 8) {
              return `${d.text.substring(0, 8)}...`;
            }
            return d.text;
          });
      });

    layout.start();
  });
};

const token = '2004513296.1677ed0.7712065e2d5a4ab79aac2e8c9df4cf91';
const numPhotos = 10;

const loadInformation = $.ajax({
  url: 'https://api.instagram.com/v1/users/self/media/recent',
  dataType: 'jsonp',
  method: 'GET',
  data: { access_token: token, count: numPhotos }
});

loadInformation.done((rawData) => {
  const dataArray = [];
  const originalTagsArray = [];
  const tagDateArray = [];
  rawData.data.forEach((img) => {
    const arrayTags = img.tags;
    const realDate = new Date(img.created_time * 1000);
    arrayTags.forEach((tag) => {
      originalTagsArray.push(tag);
      tagDateArray.push(realDate);
      dataArray.push({
        relatedTag: tag,
        date: realDate,
        image: img.images.standard_resolution.url,
        frequency: 1
      });
    });
  });

  const findMatchTags = $.map(originalTagsArray, (tag) => {
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
              date: tagDateArray[i]
            });
          }
        });
      });
    }
    makeViz(dataArray);
  });
  console.log('Information are loaded!');
});

loadInformation.fail(() => {
  console.log("Information aren't loaded");
});
