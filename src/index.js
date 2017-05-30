import * as d3 from 'd3';
// import _ from 'lodash';
import $ from 'jquery';

import './style/style.scss';

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

const photoContainer = d3.select('.container').append('ul')
                        .attr('id', 'rudr_instafeed');

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
  const relatedTags = [];
  rawData.data.forEach((img) => {
    const arrayTags = img.tags;
    const realDate = new Date(img.created_time * 1000);
    dataArray.push([arrayTags, realDate]);
    arrayTags.forEach((tag) => {
      findMatchTags(tag, relatedTags);
    });
  });
  console.log(dataArray);
  console.log('Information are loaded!');
});

loadInformation.fail(() => {
  console.log("Information aren't loaded");
});

function findMatchTags(tag, arrayTags) {
  const matchTags = $.ajax({
    type: 'GET',
    dataType: 'jsonp',
    url: 'http://api.flickr.com/services/feeds/photos_public.gne',
    data: 'tags=' + tag + '&tagmode=any&format=json&lang=fr-fr&jsoncallback=?'
  });

  matchTags.done((rawData) => {
    console.log(rawData);
  });

  loadInformation.fail(() => {
    console.log('No tags match');
  });
}
