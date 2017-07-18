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
    svg.style('stroke-width', (1 / d3.event.transform.k) + 'px');
    svg.attr('transform', d3.event.transform); // updated for d3 v4
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

  const dotSize = height / (d3.timeYear.count(new Date(Date.parse(nestedData[nestedData.length - 1].key)),
  new Date(Date.parse(nestedData[0].key))) * 4.5);

  const arc = d3.arc()
    .innerRadius((width/200))
    .outerRadius((width/300))
    .startAngle(0)
    .endAngle(Math.PI);

  g.append('path')
    .attr('id', 'arc')
    .attr('d', arc)
    .style('display', 'none');

  g.attr('class', 'xaxis')
    .attr('transform', 'translate(' + ((width / 2) + 3) + ',0)')
    .call(xMonthsAxis);

  g.selectAll('.xaxis text')
    .attr('transform', function() {
      return 'translate(' + ((this.getBBox().height * (-0.5) - (dotSize * 2))) + ',0) rotate(20)';
    })
    .attr('class', 'ticktext');

  g.selectAll('.tick')
    .append('text')
      .attr('id',function(d) {
        return dateFormatMonth(d);
      })
      .attr('class', 'curvedtext')
      .style('display', 'none')
    .append('textPath')
    .attr('xlink:href', '#arc')
    .style('text-anchor', 'middle')
    .attr('startOffset', '28%')
    .text(function(d) {
      return dateFormat(d);
    });

  const circleContainer = svg.selectAll('.circleContainer')
    .data(nestedData)
    .enter()
    .append('g')
    .attr('class', 'circleContainer')
    .attr('year', function(d) {
      return dateFormat(new Date(d.key));
    });

  circleContainer.append('circle')
    .attr('id', function(d) {
      return dateFormatMonth(Date.parse(d.key));
    })
    .attr('class', 'yearPoint')
    .attr('r', function() {
      return dotSize;
    })
    .attr('cx', (width/2))
    .attr('cy', function(d) {
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
        const translate = [((width / 2) - (scale * x)), (height / 2) - (y * scale) + (margin.top / 2)];
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
      .attr('year', function(d) {
        console.log(d)
        return dateFormat(new Date(d.key));
      })
      .attr('transform', function (d) {
        return 'translate(' + (width / 2)+ ', ' + xScale(new Date(Date.parse(d.key))) + ')';
      });

  const radialData = nestedData.map(function (d) {
    const radial = d3radial.radial()
      .center([(width / 2), xScale(new Date(Date.parse(d.key)))])
      .size([dotSize + 18, dotSize + 18]);
    return radial(d.values)
  });

  const imageWidth = 5;
  const imageHeight = 5;

  const collide = d3collide(function (d) {
    return [[-imageWidth, -imageHeight], [imageWidth, imageHeight]]
  })
    .strength(0.25)
    .iterations(5)

  const color = d3.scaleOrdinal(d3.schemeCategory20b)

  const concatRadialData = [];

  radialData.forEach((d) => {
    d.forEach((d2) => {
      concatRadialData.push(d2);
    })
  })

  d3.forceSimulation(concatRadialData)
    .velocityDecay(0.6)
    .force('collide', collide)
    .on('tick', updateNetwork);


  const circle = svg.selectAll('.circleContainer')
  .append('g')
  .attr('class', 'pictures')
  .selectAll('.pictures')
  .data(radialData);

  const circleEnter = circle.enter();

  const image = circleEnter.selectAll('image.base')
  .data(function (d) {
    return d;
  });

  const imageEnter = image.enter()
  .append('image')
    .attr('class', 'base')
    .attr('xlink:href', function (d) {
      return d.key;
    })
    .attr('width', 10)
    .attr('height', 10);

  const imageEnterUpdate = image.merge(imageEnter);
  function updateNetwork() {
    imageEnterUpdate
      .attr('transform', function (d) { return 'translate(' + (d.x - imageWidth) + ',' + (d.y - imageHeight) + ')'; });
  }

  const wordsArray = [];
  radialData.forEach((c) => {
    let tmpArray = [];
    let tmpYear = null;
    c.forEach((d) => {
      d.values.forEach((d2) => {
        tmpYear = dateFormat(d2.date);
        tmpArray.push({ tag: d2.relatedTag, frequency: d2.frequency, image: d2.image});
      });
    });
    console.log(tmpArray)
    tmpArray = tmpArray.slice(0, 15);
    wordsArray.push({ words: tmpArray, date: tmpYear })
  })

  cloudContainer.each(function(d) {
    const self = d3.select(this);
    const year = d3.select(this).attr('year');
    let tmpArray = null;
    wordsArray.forEach((o) => {
      if (year === o.date) {
        tmpArray = o.words;
      }
    });

    const layout = d3cloud()
      .size([dotSize * 1.8, dotSize * 1.8])
      .words(tmpArray.map(function(w) {
        return { text: w.tag, size: dotSize / (tmpArray.length) };
      }))
      .rotate(function() { return 0; })
      .fontSize(function(d) { return 6; })
      .padding(1)
      .spiral('rectangular')
      .on("end", function (d){
        return draw(d, self)
      })

    layout.start();
  });

  function draw(words, self) {
    self.selectAll('text')
      .data(words)
      .enter()
      .append('text')
      .style("font-size", function(d) { return 6 + "px"; })
      .style("font-family", "Comic Sans MS")
      .style("fill", function(d, i) { return color(i); })
      .attr("text-anchor", "middle")
      .attr("transform", function(d) {
        return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
      })
      .text(function(d) {
        if (d.text.length > 8) {
          return d.text.substring(0, 8) + '...';
        } else {
          return d.text;
        }
      });
  }
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
      })
    });
  });
  const findMatchTags = $.map(originalTagsArray, (tag) => {
    return $.ajax({
      type: 'GET',
      dataType: 'jsonp',
      url: 'http://api.flickr.com/services/feeds/photos_public.gne',
      data: 'tags=' + tag + '&tagmode=any&format=json&jsoncallback=?'
    });
  });
  $.when(...findMatchTags).done(function() {
    for (let i = 0; i < arguments.length; i++) {
      arguments[i][0].items.forEach((photos) => {
        console.log(photos)
        const tmpStringTagsArray = photos.tags.split(' ');
        tmpStringTagsArray.forEach((stringTag) => {
          const result = dataArray.filter(function(obj) {
            return obj.relatedTag === stringTag;
          });
          if (result.length > 0) {
            dataArray.forEach((obj) => {
              obj.frequency++;
            })
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
    window.onload = makeViz(dataArray);
  });
  console.log('Information are loaded!');
});

loadInformation.fail(() => {
  console.log("Information aren't loaded");
});
