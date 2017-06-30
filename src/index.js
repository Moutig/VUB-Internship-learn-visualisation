import * as d3 from 'd3';
import $ from 'jquery';
import d3radial from 'd3-radial';
import { cloud as d3cloud } from 'd3-v4-cloud';
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

  const margin = { top: 35, right: 0, bottom: 35, left: 0 };
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

  const dotSize = height / (d3.timeYear.count(new Date(Date.parse(nestedData[nestedData.length - 1].key)), new Date(Date.parse(nestedData[0].key))) * 6);

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
    .attr('transform', 'translate(' + $(window).width() / 2 + ',0)')
    .call(xMonthsAxis);

  g.selectAll('.xaxis text')  // select all the text elements for the xaxis
    .attr('transform', function() {
      return 'translate(' + ((this.getBBox().height * (-0.5)) - dotSize) + ',0) rotate(20)';
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

  const circles = svg.selectAll('.xaxis circle')
    .data(nestedData)
    .enter()
    .append('circle')
    .attr('id', function(d) {
      return dateFormatMonth(Date.parse(d.key));
    })
    .attr('r', function() {
      return dotSize;
    })
    .attr('cx', $(window).width() / 2.009)
    .attr('cy', function(d) {
      return xScale(new Date(Date.parse(d.key)));
    })
    .attr('fill', 'yellow')
    .attr('stroke', 'green')
    .attr('stroke-width', 1.5)
    .on('click', function () {
      const x = d3.select(this).attr('cx');
      const y = d3.select(this).attr('cy');
      const scale = 3;
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
        const translate = [((width / 2) - (scale * x)), (height / 2) - (y * scale)];
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
        // svg.select('#wordcloud')
        //  .attr('transform', 'translate(' + width / 2 + ', ' + (y + 15) + ')');
      }
    });

  svg.selectAll('.xaxis circle')
    .data(nestedData)
    .enter()
    .append('circle')
    .attr('class', 'ring')
    .attr('r', function() {
      return dotSize + 12;
    })
    .attr('cx', $(window).width() / 2.009)
    .attr('cy', function(d) {
      return xScale(new Date(Date.parse(d.key)));
    });

  const nestedDataValues = svg.selectAll('.xaxis circle')
    .data(nestedData)
    .enter()

  nestedDataValues.selectAll('.xaxis circle')
    .data(function (d) {
      return d.values;
    })
    .enter()
    .append('text')
    .attr('transform', 'translate(' + circles.attr('cx') + ', ' + circles.attr('cy') + ')')

  nestedDataValues.selectAll('.xaxis circle')
    .data(function (d) {
      const radial = d3radial.radial()
        .center([($(window).width() / 2.009), xScale(new Date(Date.parse(d.key)))])
        .size([dotSize + 12, dotSize + 12]);
      return radial(d.values);
    })
    .enter()
    .append('image')
    .attr('xlink:href', function (d) {
      return d.key;
    })
    .attr('width', 10)
    .attr('height', 10)
    .attr('x', function(d) { return d.x - 5; })
    .attr('y', function(d) { return d.y - 5; })
    .attr('class', 'tagIcon')
    .on('mouseover', function () {
      d3.selectAll('.tagIcon').attr('visibility', 'hidden')
      d3.select(this).attr('visibility', 'visible');
      d3.select(this).attr('width', 80);
      d3.select(this).attr('height', 80);
    })
    .on('mouseout', function () {
      d3.selectAll('.tagIcon').attr('visibility', 'visible');
      d3.select(this).attr('width', 10);
      d3.select(this).attr('height', 10);
    });

  const test = ['Hello', 'world', 'normally', 'you', 'want', 'more', 'words',
    'than', 'this'];
  const fill = d3.scaleOrdinal(d3.schemeCategory20);
  const layout = d3cloud()
    .size([dotSize * 4.3, dotSize * 4.3])
    .words(test.map(function(d) {
        return { text: d, size: dotSize * 2 / test.length };
    }))
    .rotate(function() { return (~~(Math.random() * 6) - 3) * 30; })
    .fontSize(function(d) { return d.size; })
    .padding(.75)
    .on("end", draw);

  layout.start();

  function draw(words) {
    svg
      .append("g")
      .attr('id', 'wordcloud')
      .selectAll("text")
      .data(words)
      .enter().append("text")
      .style("font-size", function(d) { return d.size + "px"; })
      .style("font-family", "Comic Sans MS")
      .style("fill", function(d, i) { return fill(i); })
      .attr("text-anchor", "middle")
      .attr("transform", function(d) {
        return "translate(" + [d.x * .75, d.y * .75] + ")rotate(" + d.rotate + ")";
      })
      .text(function(d) { return d.text; });
  }
};

const token = '2004513296.1677ed0.7712065e2d5a4ab79aac2e8c9df4cf91';
const numPhotos = 30;

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
        tag: tag,
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
      const relatedTagsArray = [];
      arguments[i][0].items.forEach((photos) => {
        const tmpStringTagsArray = photos.tags.split(' ');
        tmpStringTagsArray.forEach((stringTag) => {
          const result = relatedTagsArray.filter(function(obj) {
            return obj.relatedTag === stringTag;
          });
          if (result.length > 0) {
            relatedTagsArray.forEach((obj) => {
              obj.frequency++;
            })
          } else {
            relatedTagsArray.push({
              relatedTag: stringTag,
              frequency: 1,
              image: photos.media.m,
              date: tagDateArray[i]
            });
          }
        });
      });
      relatedTagsArray.forEach((obj) => {
        dataArray.push(obj);
      });
    }
    window.onload = makeViz(dataArray);
  });
  console.log('Information are loaded!');
});

loadInformation.fail(() => {
  console.log("Information aren't loaded");
});
