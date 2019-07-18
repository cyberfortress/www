/*
Sample URL parameters

CyberFortress:
?id=f58f0b44-7b20-5fed-b0aa-dc353b89c630

Codeup:
?id=b1049048-ef36-5d15-85e3-33f1c6dd3518

*/

// Append script to the bottom of the body to call genRiskscore after the document is ready
/*
(function () {
	var s = document.createElement ('script');
	s.text = 'genRiskscore ();';
	document.getElementsByTagName ("body")[0].append (s);
})();
*/

(function() {
  'use strict';

  // Retrieve a specific URL parameter.
  function getURLParameter(sParam) {
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++) {
      var sParameterName = sURLVariables[i].split('=');
      if (sParameterName[0] == sParam) {
        return sParameterName[1];
      }
    }
  };

  // Attempt to read the "id" parameter.
  // If it is available, update Local Storage and call the API function to populate the RS data.
  // If not, attempt to read from Local Storage.
  // If still unavailable, present the user with an error.
  var _domain_id = getURLParameter('id');
  if (_domain_id) {
    // Call API function to populate RS data with id = _domain_id
    localStorage.setItem('_domain_id', _domain_id);
    var data = {
      id: _domain_id
    }
    getData(data);
  } else {
    var _domain_id = localStorage.getItem('_domain_id')
    if (_domain_id) {
      var data = {
        id: _domain_id
      }
      getData(data);
    } else {
      $('#jumbotron-loading').addClass('d-none');
      $('#jumbotron-error').removeClass('d-none');
    }
  }

  // get score info
  function getData(data) {
    $.ajax({
      method: "POST",
      url: "https://us-central1-cyberfortress-sandbox.cloudfunctions.net/rs",
      contentType: "application/json",
      data: JSON.stringify(data),
    }).done(function(response) {
      populate(response);
      $('#jumbotron-loading').addClass('d-none');
      $('#jumbotron-score').removeClass('d-none');
      $('#summary-div').removeClass('d-none');
      $('#whatsgood-div').removeClass('d-none');
    }).fail(function(e) {
      console.log(e)
      $('#jumbotron-loading').addClass('d-none');
      $('#jumbotron-error').removeClass('d-none');
    });
  }

  // populate fields with info from json obj
  function populate(result) {
    var result = result,
      domain = result.domain,
      score = result.score,
      date = new Date(result.ts_p * 1000),
      conts = result.top_contributions,
      url = document.location.host + document.location.pathname + '?id=' + _domain_id,
      timestamp = result.ts_p;

    // Tags of user's most important factors, positive & negative //
    var positiveTags = Array(),
      negativeTags = Array();

    // Names of users technologies by tag
    var sortedByTags = {
      'ads': [],
      'analytics': [],
      'cdn': [],
      'cms': [],
      'copyright': [],
      'css': [],
      'feeds': [],
      'framework': [],
      'hosting': [],
      'javascript': [],
      'link': [],
      'mapping': [],
      'media': [],
      'mx': [],
      'mobile': [],
      'payment': [],
      'server': [],
      'shipping': [],
      'shop': [],
      'ssl': [],
      'webmaster': [],
      'webserver': [],
      'widgets': []
    };

    fillRook(score);
    topFactors(conts, positiveTags, negativeTags);
    popFactorSummary(conts);
    groupByTag(conts, sortedByTags);
    getWhatsGood(result, sortedByTags, positiveTags, negativeTags);

    $('#domain').text(domain);
    $('#score').html('<span>' + score + '</span> / 10 ');
    $('#score-message').text('as of ' + date.toLocaleDateString());
    $('#copy-url').text(url);

    // console.log(sortedByTags);
  }

  // get top positively and negatively contributing factors
  function topFactors(conts, positiveTags, negativeTags) {
    var positiveFactors = Array();
    var negativeFactors = Array();

    conts.forEach(function(item) {
      if (item.weight <= 0) {
        positiveFactors.push(item);
      } else {
        negativeFactors.push(item);
      }
    });

    // Sort & slice appropriately
    var limit = 3;
    positiveFactors = positiveFactors.sort(function(a, b) {
      return a.weight - b.weight
    }).slice(0, 3);
    negativeFactors = negativeFactors.sort(function(a, b) {
      return b.weight - a.weight
    }).slice(0, 3);

    if (positiveFactors.length) {
      $(positiveFactors).each(function(i) {
        var name = this.name,
          tag = this.tag,
          desc = this.description,
          summary = this.summary,
          weight = this.weight_normalized,
          icon = getIcon(tag),
          color = getColor(weight),
          collapseId = i + 't-collapse';

        if ($.inArray(tag, positiveTags) === -1) {
          positiveTags.push(tag);
        }

        $('#top-factors').append(
          '<div class="d-flex flex-row flex-nowrap align-items-start">' +
          '<div class="icon-div pt-2">' +
          '<p class="icon ' + color + ' text-center">' +
          '<span class="fa-stack">' +
          '<i class="fa fa-circle fa-stack-2x icon-background"></i>' +
          '<i class="' + icon + ' fa-stack-1x"></i></span></p></div>' +
          '<div class="text-div">' +
          '<p class="f-name">' + name + ' <span>[ ' + tag + ' ]</span>' +
          '</p>' +
          '<p class="f-desc">' + summary + '</p>' +
          '</div></div>'
        );
      });
    } else { // if no positive factors exist
      $('#top-factors').append(
        '<div class="d-flex flex-row flex-nowrap align-items-start">' +
        '<div class="icon-div pt-2">' +
        '<p class="icon none text-center">' +
        '<span class="fa-stack">' +
        '<i class="fa fa-circle fa-stack-2x icon-background"></i>' +
        '<i class="fal fa-times fa-stack-1x"></i></span></p></div>' +
        '<div class="text-div">' +
        '<p class="f-name">None</p>' +
        '<p class="f-desc">When calculating your score, no significant positive contributions were included.</p>' +
        '</div>' +
        '</div>'
      );
    }

    if (negativeFactors.length) {
      $(negativeFactors).each(function(i) {
        var name = this.name,
          tag = this.tag,
          desc = this.description,
          summary = this.summary,
          weight = this.weight_normalized,
          icon = getIcon(tag),
          color = getColor(weight),
          collapseId = i + 't-collapse';

        if ($.inArray(tag, negativeTags) === -1) {
          negativeTags.push(tag);
        }

        $('#bottom-factors').append(
          '<div class="d-flex flex-row flex-nowrap align-items-start">' +
          '<div class="icon-div pt-2">' +
          '<p class="icon ' + color + ' text-center">' +
          '<span class="fa-stack">' +
          '<i class="fa fa-circle fa-stack-2x icon-background"></i>' +
          '<i class="' + icon + ' fa-stack-1x"></i></span></p></div>' +
          '<div class="text-div">' +
          '<p class="f-name">' + name + ' <span>[ ' + tag + ' ]</span>' +
          '</p>' +
          '<p class="f-desc">' + summary + '</p>' +
          '</div></div>'
        );
      });
    } else { // if no negative factors exist
      $('#bottom-factors').append(
        '<div class="d-flex flex-row flex-nowrap align-items-start">' +
        '<div class="icon-div pt-2">' +
        '<p class="icon none text-center">' +
        '<span class="fa-stack">' +
        '<i class="fa fa-circle fa-stack-2x icon-background"></i>' +
        '<i class="fal fa-times fa-stack-1x"></i></span></p></div>' +
        '<div class="text-div">' +
        '<p class="f-name">None</p>' +
        '<p class="f-desc">When calculating your score, no significant negative contributions were included.</p>' +

        '</div>' +
        '</div>'
      );
    }

  }

  // populate full list of factors (all contributing factors)
  function popFactorSummary(conts) {
    $(conts).each(function() {
      var desc = this.description,
        name = this.name,
        summary = this.summary,
        tag = this.tag,
        weight = this.weight_normalized,
        icon = getIcon(tag),
        color = getColor(weight),
        id = name.replace(/\s+/g, '-').toLowerCase();

      if (name != null) {
        $('#factor-info').append(
          "<div id='" + id + "' class='factor-sum d-flex flex-row justify-content-start'>" +
          "<div class='icon-div'>" +
          "<p class='icon " + color + " text-center'>" +
          "<span class='fa-stack'>" +
          "<i class='fa fa-circle fa-stack-2x icon-background'></i>" +
          "<i class='" + icon + " fa-stack-1x'></i>" +
          "</span></p>" +
          "</div>" +
          "<div class='text-div d-flex flex-column " + color + "'>" +
          "<div class='name-div'>" +
          "<p class='f-title'>" + name + " <span class='f-tag'>[ " + tag + " ]</span></p>" +
          "</div>" +
          "<div class='desc-div'>" +
          "<p class='f-sum'>" + summary + "</p>" +
          "<p class='f-desc'>" + desc + "</p>" +
          "</div></div></div>");
      }
    });
  }

  // group user's technologies by tags
  function groupByTag(conts, obj) {

    var widgetsList = Array(),
      sslList = Array(),
      hostingList = Array(),
      cdnList = Array(),
      frameworkList = Array(),
      cmsList = Array(),
      shopList = Array(),
      mxList = Array(),
      paymentList = Array(),
      serverList = Array(),
      webserverList = Array();

    $(conts).each(function() { // make array of relevent tags
      var tag = this.tag,
        name = this.name;

      switch (tag) {
        case 'widgets':
          widgetsList.push(name);
          break;
        case 'ssl':
          sslList.push(name);
          break;
        case 'hosting':
          hostingList.push(name);
          break;
        case 'cdn':
          cdnList.push(name);
          break;
        case 'framework':
          frameworkList.push(name);
          break;
        case 'cms':
          cmsList.push(name);
          break;
        case 'shop':
          shopList.push(name);
          break;
        case 'mx':
          mxList.push(name);
          break;
        case 'payment':
          paymentList.push(name);
          break;
        case 'server':
          serverList.push(name);
          break;
        case 'web-server':
          webserverList.push(name);
          break;
      }

    });

    if (widgetsList.length !== 0) {
      obj.widgets = widgetsList;
    }
    if (sslList.length !== 0) {
      obj.ssl = sslList;
    }
    if (hostingList.length !== 0) {
      obj.hosting = hostingList;
    }
    if (cdnList.length !== 0) {
      obj.cdn = cdnList;
    }
    if (frameworkList.length !== 0) {
      obj.framework = frameworkList;
    }
    if (cmsList.length !== 0) {
      obj.cms = cmsList;
    }
    if (shopList.length !== 0) {
      obj.shop = shopList;
    }
    if (shopList.length !== 0) {
      obj.shop = shopList;
    }
    if (mxList.length !== 0) {
      obj.mx = mxList;
    }
    if (paymentList.length !== 0) {
      obj.payment = paymentList;
    }
    if (serverList.length !== 0) {
      obj.server = serverList;
    }
    if (webserverList.length !== 0) {
      obj.webserver = webserverList;
    }

  }

  // populate what's good info
  function getWhatsGood(userResults, obj, pTags, nTags) {

    var data = {
        "id": 1558626498
      },
      userResults = userResults,
      obj = obj;

    $.ajax({
      method: "POST",
      url: "https://us-central1-cyberfortress-sandbox.cloudfunctions.net/rs_contributions",
      contentType: "application/json",
      data: JSON.stringify(data),
    }).done(function(response) {
      console.log('----- Response -----');
      console.log(response);
      console.log('--- User Results ---');
      console.log(userResults);
      populateGood(response, userResults, obj);
    }).fail(function(e) {
      console.log(e)
    });

    function populateGood(response, results, obj) {

      var allTech = response.top_neg,
        allKeys = Object.keys(allTech),
        userFactors = results.top_contributions,
        relTags = getRelTags(userFactors, allKeys),
        userTechNames = getUserTechNames(userFactors),
        withTop3 = Array(),
        withoutTop3 = Array();


      populateTop3(allTech, userFactors, relTags, userTechNames);
      populateTop20(allTech, userFactors, relTags, userTechNames, withTop3);

      function getRelTags(userFactors, allKeys) {
        var userTags = Array(),
          returnKeys = Array();

        $(userFactors).each(function(i, val) {
          var tag = this.tag;
          if (!userTags.includes(tag)) {
            userTags.push(tag);
          }
        });

        // console.log('-- User Tags --')
        // console.log(userTags);

        $(userTags).each(function(i, val) {
          var tag = this;
          if (allKeys.includes(tag) && userTags.includes(tag)) {
            if (!returnKeys.includes(tag)) {
              returnKeys.push(tag);
            }
          }
        });

        return returnKeys;
      } // end of getRelTags();

      function getUserTechNames(factors) {
        var names = Array();
        $.each(factors, function(i, val) {
          names.push(val.name);
        });
        return names;
      } // end of getUserTechNames();

      function populateTop3(techObj, userObj, reltags, userTechNames) {
        var section = $('#top-section'),
          div = $('#top-results'),
          countText = $('#3count');

        Object.keys(techObj).forEach(key => {
          let value = techObj[key];

          if (relTags.includes(key)) {
            var icon = getIcon(key);

            $.each(value, function(i, val) {
              var num = i + 1,
                tag = val.tag,
                name = val.name.replace(/-/g, ' ');

              // if userTechName if found within first 3 values
              if (num <= 3 && !withTop3.includes(tag)) {
                if (userTechNames.includes(name)) {
                  if ($(section).hasClass('d-none')){
                    $(section).removeClass('d-none');
                  }
                  $(div).append(
                    '<div id="top-' + tag + '-div" class="good-tech top3 d-flex flex-column">' +
                    '<div class="icon-div">' +
                    '<p class="icon text-center"><i class="' + icon + '"></i></p>' +
                    '<p class="text-center larger title bold">Top 3 in ' + tag + '</p>' +
                    '</div>' +
                    '<div id="top-' + tag + '-list" class="list-div"></div>' +
                    '</div>'
                  );
                  var listDiv = $('#top-' + tag + '-list');
                  withTop3.push(tag);
                  generateList(techObj, userTechNames, tag, listDiv);
                }
              }
            }); // end of $.each(value);
          } // end of if(tags.includes(key))...
        }); // end of forEach(key)...

        var count = $(div).children('.top3').length;
        $(countText).text(count);
      } // end of populateTop3();

      function populateTop20(techObj, userObj, reltags, userTechNames, top3Array) {
        var section = $('#top-section'),
          div = $('#top-results');

        Object.keys(techObj).forEach(key => {
          let value = techObj[key];

          if (relTags.includes(key) && !top3Array.includes(key)) {
            var icon = getIcon(key);

            $.each(value, function(i, val) {
              var num = i + 1,
                tag = val.tag,
                name = val.name.replace(/-/g, ' ');

              if (userTechNames.includes(name) && !withoutTop3.includes(tag)) {
                if ($(section).hasClass('d-none')){
                  $(section).removeClass('d-none');
                }
                $(div).append(
                  '<div id="top-' + tag + '-div" class="good-tech d-flex flex-column">' +
                  '<div class="icon-div">' +
                  '<p class="icon text-center"><i class="' + icon + '"></i></p>' +
                  '<p class="text-center larger title bold">Top 3 in ' + tag + '</p>' +
                  '</div>' +
                  '<div id="top-' + tag + '-list" class="list-div"></div>' +
                  '</div>'
                );
                var listDiv = $('#top-' + tag + '-list');
                withoutTop3.push(tag);
                generateList(techObj, userTechNames, tag, listDiv);
              }

            }); // end of $.each(value);
          } // end of if(tags.includes(key))...
        }); // end of forEach(key)...

      } // end of populateTop20();

      function generateList(techObj, userTechNames, tag, div) {
        var tech = techObj[tag],
          namesArray = Array(),
          count = 0;

        $.each(tech, function(i, val) {
          var num = i + 1,
            name = val.name.replace(/-/g, ' '),
            tag = val.tag,
            target = name.replace(/\s+/g, '-').toLowerCase();

          if (num <= 3) {
            if (userTechNames.includes(name) && !namesArray.includes(name)) {
              $(div).append(
                '<p class="tech-name match top3" data-rank="' + num + '">' + num + '. <a href="#' + target + '">' + name + '</a> <i class="top3-check fas fa-check-circle"></i></p>'
              );
              namesArray.push(name);
            } else {
              $(div).append(
                '<p class="tech-name no-match top3" data-rank="' + num + '">' + num + '. ' + name + '</p>'
              );
            }
          } else if (num >= 4) {
            if (userTechNames.includes(name) && !namesArray.includes(name)) {
              if (count == 0) {
                $(div).append(
                  '<p class="tech-name ellipses"><i class="ellipses far fa-ellipsis-v"></i></p>' +
                  '<p class="tech-name match bottom" data-rank="' + num + '">' + num + '. <a href="#' + target + '">' + name + '</a> <i class="top20-check far fa-check"></i></p>'
                );
                count = 1;
                namesArray.push(name);
              } else if (count == 1) {
                $(div).append(
                  '<p class="tech-name match bottom" data-rank="' + num + '">' + num + '. <a href="#' + target + '">' + name + '</a> <i class="top20-check far fa-check"></i></p>'
                );
                namesArray.push(name);
              }
            }
          }
        }); // end of $.each(tech)

        $(div).append(
          '<div class="full-list-div">' +
          '<a href="#;" id="' + tag + '-modal-trigger" class="full-list-link" data-tag="' + tag + '" data-toggle="modal" data-target="#list-modal">See Full List</a>' +
          '</div>'
        );

      } // end of generateList();

      $('#list-modal').on('show.bs.modal', function(e) {
        var link = e.relatedTarget,
          tag = $(link).attr('data-tag');
        getModalContent(tag, allTech, userTechNames);
      });

      function getModalContent(tag, techObj, userTechNames) {
        var modal = $('#list-modal'),
          title = $('#list-modal-title'),
          body = $('#list-modal-body'),
          icon = getIcon(tag),
          namesArray = Array(),
          key = tag;

        $(title).html(
          '<h5 class="modal-list-title">Top 20 in ' + tag + ' technologies</h5>'
        );
        $(body).html('<div id="modal-list"></div>');

        $.each(techObj[key], function(i, val) {
          var num = i + 1,
            name = val.name.replace(/-/g, ' ');

          if (userTechNames.includes(name) && !namesArray.includes(name)) {
            $('#modal-list').append(
              '<p class="modal-tech-name match">' + num + '. ' + name + ' <i class="check far fa-check"></i></p>'
            );
            namesArray.push(name);
          } else {
            $('#modal-list').append(
              '<p class="modal-tech-name">' + num + '. ' + name + '</p>'
            );
          }
        });
      } // end of getModalContent();

    } // end of populateGood();
  } // end of getWhatsGood();

  // color rook based on score
  function fillRook(score) {
    var getScoreColor = d3.scaleQuantize()
      .domain([0, 6])
      .range(['#CC444B', '#D8774F', '#DE9151', '#E9B15D', '#FFF275', '#D3E468', '#7AC74F']);

    var getScoreRow = d3.scaleLinear()
      .domain([0, 10])
      .range([0, 6]);

    // Note that the group or <g> elements in the rook's svg are ordered backwards
    d3.select("#rook-svg").selectAll(".row")
      .transition()
      .delay(function(d, i) {
        return i * 100
      })
      .duration(1500)
      .style('fill', function(d, i) {
        if (i <= getScoreRow(score)) {
          return getScoreColor(getScoreRow(score));
        }
      });
  }

  // return icon class based on tag
  function getIcon(tag) {
    var icon;
    switch (tag) {
      case 'widgets':
        icon = 'fal fa-tachometer-alt-slow';
        break;
      case 'framework':
        icon = 'fal fa-chart-network';
        break;
      case 'hosting':
        icon = 'fal fa-cloud';
        break;
      case 'ssl':
        icon = 'fal fa-shield-alt';
        break;
      case 'cms':
        icon = 'fal fa-cog';
        break;
      case 'cdn':
        icon = 'fal fa-globe';
        break;
      case 'shop':
        icon = 'fal fa-shopping-cart';
        break;
      case 'mx':
        icon = 'fal fa-fingerprint';
        break;
      case 'server':
        icon = 'fal fa-server';
        break;
      case 'web-server':
        icon = 'fal fa-server';
        break;
      case 'payment':
        icon = 'fal fa-money-bill-wave';
        break;
      case 'link':
        icon = 'fal fa-link';
        break;
      case 'web-master':
        icon = 'fal fa-wrench';
        break;
      case 'mapping':
        icon = 'fal fa-sitemap';
        break;
      case 'feeds':
        icon = 'fal fa-rss';
        break;
      case 'css':
        icon = 'fal fa-file-code';
        break;
      case 'ads':
        icon = 'fal fa-file-spreadsheet';
        break;
      case 'media':
        icon = 'fal fa-photo-video';
        break;
      case 'copyright':
        icon = 'fal fa-copyright';
        break;
      case 'shipping':
        icon = 'fal fa-shippinig-timed';
        break;
      case 'javascript':
        icon = 'fal fa-js';
        break;
      case 'mobile':
        icon = 'fal fa-mobile';
        break;
      case 'analytics':
        icon = 'fal fa-analytics';
        break;
      default:
        icon = 'fal fa-laptop-code';
    }
    return icon;
  }

  // color by weight
  function getColor(weight) {
    var color;

    switch (true) {
      case (weight <= 0.143):
        color = 'r7';
        break;
      case (weight <= 0.286):
        color = 'r6';
        break;
      case (weight <= 0.429):
        color = 'r5';
        break;
      case (weight <= 0.572):
        color = 'r4';
        break;
      case (weight <= 0.715):
        color = 'r3';
        break;
      case (weight <= 0.858):
        color = 'r2';
        break;
      case (weight <= 1):
        color = 'r1';
        break;
    }

    return color;
  }

  //share score link
  $('#share-score').click(function(e) {
    _domain_id = getURLParameter('id') || localStorage.getItem('_domain_id');
    if (!_domain_id) {
      console.error('Error. Unable to find a _domain_id to share.')
    } else {
      var _sl = document.location.host + document.location.pathname + '?id=' + _domain_id;
      var par = e.target
      var el = document.createElement("textarea");
      el.value = _sl;
      par.appendChild(el);
      el.focus();
      el.select();
      try {
        var ok = document.execCommand("copy");
      } catch (err) {
        console.error(err);
      }
      par.removeChild(el);
    }
  });

  // scroll to full summary btn function
  $('#full-summary').click(function() {
    $([document.documentElement, document.body]).animate({
      scrollTop: $("#summary-div").offset().top
    }, 1000);
  });


})();
