const defaultStoresToLocate = 3,
  maxStoresToLocate = 10,
  originLat = 40.2431741,
  originLng = -95.58948780000003,
  originZoom = 3,
  distUnit = 'K',
  distFactorK = 1.609344,
  distFactorN = 0.8684,
  calcFactor1 = 60,
  calcFactor2 = 1.1515,
  radiansFactor = 180,
  markerPath = 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z M -2,-30 a 2,2 0 1,1 4,0 2,2 0 1,1 -4,0',
  completePx = '//ads.socialtheater.com/mark/4ef0061d-34c1-4205-baa3-39ab88bdaa7e/c7085cd02161cb5315384a1d4f9c8a5d/pixel.gif';

var map,
  mapBounds,
  geocoder,
  originPoint,
  zipMarker,
  stores,
  storeMarkerArr,
  receiveMessage = message =>
  {
    console.info('catches messages from the containing window into this iFrame - prevents console error if present ', message);
  },
  initialize  = () =>
  {
    // initialize map viewing entire US zoomed out
    var mapOptions = {
      center: new google.maps.LatLng(originLat, originLng),
      zoom: originZoom
    };

    geocoder = new google.maps.Geocoder();
    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
  }

/**
 * Angular Map Controller
 *
 * @param {object} $scope angular scope object
 * @param {object} $http angular http utility
 */
function MapCtrl($scope, $http)
{
  $http.jsonp('//movies.meetmecdna.com/social_theater/locator/food_group/stores.json?callback=JSON_CALLBACK')
  .success(
    (data) =>
    {
      stores = data;
    })
  .error(
    (jsonData) =>
    {
      console.warn('There was an error retrieving data');
    });

  $scope.storesToLocate = defaultStoresToLocate;
  $scope.maxStoresNum = maxStoresToLocate;

  /**
   * Checks whether button should be disabled due to invalid ZIP
   *
   * @return {boolean} whether button is disabled (true) or not (false)
   */
  $scope.checkDisabled = () =>
  {
    var isDisabled = true;

    if (angular.isUndefined($scope.userZip))
    {
      return isDisabled;
    }

    isDisabled = $scope.userZip.toString().length !== 5 || $scope.storesToLocate > $scope.maxStoresNum;

    return isDisabled;
  }

  /**
   * Geocode request
   *
   * @return {void}
   */
  $scope.zipGeocodeRequest = () =>
  {
    $scope.nearestStores = [];
    geocoder.geocode({
                      'address': $scope.userZip.toString(),
                      'region': 'US'
                     },
                    $scope.zipGecodeResults);
  }

  /**
   * Geocode response callback
   *
   * @param {array} results geocode results object
   * @param {string} status HTTP response status code
   *
   * @return {void}
   */
  $scope.zipGecodeResults = (results, status) =>
  {
    var i,
      addr,
      zipLatLng;

    if (status === google.maps.GeocoderStatus.OK)
    {
      addr = results[0].formatted_address;
      zipLatLng = results[0].geometry.location;
      mapBounds = new google.maps.LatLngBounds();
      mapBounds.extend(zipLatLng);
      map.setCenter(zipLatLng);

      if (zipMarker)
      {
        zipMarker.setMap(null);
        zipMarker = null;
      }

      if (storeMarkerArr && storeMarkerArr.length > 0)
      {
        for (i = 0; i < storeMarkerArr.length; i++)
        {
          storeMarkerArr[i].setMap(null);
          storeMarkerArr[i] = null;
        }
      }

      zipMarker = new google.maps.Marker({
                                          position: zipLatLng,
                                          map: map,
                                          title: $scope.userZip.toString()
                                        });

      $scope.calculateDistancesToStores(zipLatLng.lat(), zipLatLng.lng());
    }
    else
    {
      console.info('THERE WAS AN ERROR WITH THIS GEOCODING REQUEST OR THE LIMIT WAS REACHED');
    }
  }

  /**
   * Calculate distance to stores
   *
   * @param {number} lat latitude
   * @param {number} lng longitude
   *
   * @return {void}
   */
  $scope.calculateDistancesToStores = (lat, lng) =>
  {
    var i,
        currLat,
        currLng,
        radlat1,
        radlat2,
        radlon1,
        radlon2,
        theta,
        radtheta,
        dist,
        len = stores.length;

    for (i = 0; i < len; i++)
    {
      currLat = stores[i].lat;
      currLng = stores[i].lng;
      radlat1 = Math.PI * lat/radiansFactor;
      radlat2 = Math.PI * currLat/radiansFactor;
      radlon1 = Math.PI * lng/radiansFactor;
      radlon2 = Math.PI * currLng/radiansFactor;
      theta = lng-currLng;
      radtheta = Math.PI * theta/radiansFactor;
      dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
      dist = Math.acos(dist);
      dist = dist * radiansFactor/Math.PI;
      dist = dist * calcFactor1 * calcFactor2;

      if (distUnit === "K")
      {
        dist = dist * distFactorK;
      }

      if (distUnit === "N")
      {
        dist = dist * distFactorN;
      }

      stores[i]['dist'] = dist;
    }

    $scope.findNearestStores();
  }

  /**
   * Find stores nearest the user ZIP
   *
   * @return {void}
   */
  $scope.findNearestStores = () =>
  {
    var i,
        j,
        nearestStoresLength,
        minDistance = null,
        len = stores.length;

    for (i = 0; i < len; i++)
    {
      currDistance = Number(stores[i].dist);
      currAddr1 = stores[i].addr1;
      currAddr2 = stores[i].addr2;
      currAddr3 = stores[i].addr3;
      currLat = stores[i].lat;
      currLng = stores[i].lng;
      currPhone = stores[i].phone;

      if (minDistance === null || minDistance > currDistance)
      {
        $scope.nearestStores.unshift({
                                      addr1: currAddr1,
                                      addr2: currAddr2,
                                      addr3: currAddr3,
                                      phone: currPhone,
                                      dist: currDistance,
                                      lat: currLat,
                                      lng: currLng
                                    });
        minDistance = currDistance;
      }
      else
      {
        nearestStoresLength = $scope.nearestStores.length - 1;
        for (j = nearestStoresLength; j >= 0; j--)
        {
          if (currDistance > $scope.nearestStores[j].dist)
          {
            $scope.nearestStores.splice(j + 1, 0, {
                                                    addr1: currAddr1,
                                                    addr2: currAddr2,
                                                    addr3: currAddr3,
                                                    phone: currPhone,
                                                    dist: currDistance ,
                                                    lat: currLat,
                                                    lng: currLng
                                                  });

            break;
          }
        }
      }

      if ($scope.nearestStores.length > $scope.storesToLocate)
      {
        $scope.nearestStores.pop();
      }
    }

    $scope.$digest();
    $scope.displayStores();
  }

  /**
   * Display the stores on the map, and adjust zoom accordingly
   *
   * @return {void}
   */
  $scope.displayStores = () =>
  {
    var i,
      storePoint,
      bluePin;

    for (i = 0; i < $scope.nearestStores.length; i++)
    {
      storePoint = new google.maps.LatLng($scope.nearestStores[i].lat, $scope.nearestStores[i].lng);
      bluePin = {
                  path: markerPath,
                  fillColor: '#2b85ff',
                  fillOpacity: 1,
                  strokeColor: '#000',
                  strokeWeight: 2,
                  scale: 1
                },
      storeMarker = new google.maps.Marker({
                                            position: storePoint,
                                            map: map,
                                            title: 'store',
                                            icon: bluePin
                                          });

      mapBounds.extend(storePoint);
    }

    map.fitBounds(mapBounds);
    SocialTheaterTrackingCompletion.fireTrackingPixel(completePx, 'STCompletionPixel');
  }
}

google.maps.event.addDomListener(window, 'load', initialize);