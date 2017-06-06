import * as d3 from 'd3';
// import _ from 'lodash';
import $ from 'jquery';
import './style/style.scss';
import d3_radial from 'd3-radial';

const svg = d3.select('#app').append('svg')
            .attr('width', 960)
            .attr('height', 800);

const margin = { top: 80, right: 80, bottom: 80, left: 80 };
const centerMargin = 100;

const width = +svg.attr('width') - margin.left - margin.right;
const height = +svg.attr('height') - margin.top - margin.bottom;

const g = svg
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

const makeViz = (data) => {
  var radial = d3_radial.radial()
  .center([500, 400])
  .size([120, 120]);

  svg.selectAll('circle')
  .data(radial(data)).enter()
  .append("circle")
  .attr("cx", function(d) { return d.x; })
  .attr("cy", function(d) { return d.y; })
  .attr("r", 20)
  .attr("fill", "#228822")
  .on('mouseover', function(d) {
    d3.select(this).style('fill', '#143245');
    console.log(d);
    })
  .on('mouseout', function(){
    d3.select(this).style('fill', '#228822')
  })
};


/*  matchTags.done((rawData) => {
    rawData.items.forEach((relatedImg) => {
      const tmpStringTagsArray = relatedImg.tags.split(' ');
      tmpStringTagsArray.forEach((stringTag) => {
        if (relatedTagsArray.indexOf(stringTag) === -1) {
          const tagItem = { tag: stringTag };
          relatedTagsArray.push(tagItem);
        }
      });
    });
  });

  matchTags.fail(() => {
    console.log('No tags match');
  });*/

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
          if (relatedTagsArray.indexOf(stringTag) === -1){
            relatedTagsArray.push(stringTag);
          }
        });
      });
      const tagObject = { tag: originalTagsArray[i], date: tagDateArray[i], relatedTags: relatedTagsArray };
      dataArray.push(tagObject);
    }
    window.onload = makeViz(dataArray);
  });
  console.log('Information are loaded!');
});

loadInformation.fail(() => {
  console.log("Information aren't loaded");
});
